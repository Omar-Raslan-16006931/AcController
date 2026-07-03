"""
generator.py
============
The inverse of decoder.py: takes a byte payload (already in LSB-first
transmission order) and produces raw "+mark -space" timing text that
ir-ctl --send can transmit, reproducing the exact structure measured
from the real captures:

    leader mark, leader space,
    48 data bits (mark + short/long space per bit),
    1 stop-bit mark,
    inter-frame gap,
    <entire frame repeated again>,
    stop-bit mark,
    final trailing gap

All timing numbers are parameters (TimingProfile + measured gaps), not
hardcoded — pull them from decoder.derive_timing_profile() on a real
capture (base.txt) so the transmitted signal matches your specific
remote/receiver's measured timing, not a textbook NEC/Midea spec value.
"""

from __future__ import annotations
from dataclasses import dataclass

from . import protocol as P
from .decoder import TimingProfile


@dataclass
class FrameGaps:
    inter_frame_gap: int   # gap between the 1st and 2nd transmission of the frame
    final_gap: int         # gap after the 2nd (last) transmission


def bytes_to_bits(payload: bytes) -> list[int]:
    """LSB-first bit order, matching how decoder/protocol packed them."""
    return P.bytes_to_bits_lsb(payload)


def encode_single_frame(bits: list[int], profile: TimingProfile) -> list[int]:
    """
    Encode one leader + N data bits + 1 stop bit into a flat signed
    duration list (positive = mark, negative = space), ir-ctl style.
    """
    out = []
    out.append(round(profile.leader_mark))
    out.append(-round(profile.leader_space))

    for bit in bits:
        out.append(round(profile.bit_mark))
        space = profile.one_space if bit else profile.zero_space
        out.append(-round(space))

    # trailing stop-bit mark (present in every real capture; carries no data)
    out.append(round(profile.bit_mark))

    return out


def encode_full_transmission(payload: bytes, profile: TimingProfile, gaps: FrameGaps) -> list[int]:
    """
    Build the complete two-frame transmission exactly like the real remote:
    frame, inter-frame gap, frame again, final gap.
    """
    bits = bytes_to_bits(payload)

    frame1 = encode_single_frame(bits, profile)
    frame2 = encode_single_frame(bits, profile)

    out = []
    out.extend(frame1)
    out.append(-round(gaps.inter_frame_gap))
    out.extend(frame2)
    out.append(-round(gaps.final_gap))
    return out


def durations_to_ir_ctl_text(durations: list[int]) -> str:
    """Format a signed duration list back into ir-ctl's '+123 -456 ...' text."""
    parts = []
    for d in durations:
        sign = "+" if d >= 0 else "-"
        parts.append(f"{sign}{abs(d)}")
    return " ".join(parts) + "\n"


def payload_to_ir_ctl_text(payload: bytes, profile: TimingProfile, gaps: FrameGaps) -> str:
    """One-call convenience: bytes -> ready-to-write ir-ctl raw text."""
    durations = encode_full_transmission(payload, profile, gaps)
    return durations_to_ir_ctl_text(durations)


# ---------------------------------------------------------------------------
# Waveform-preserving encoder (per user requirement: do NOT normalize
# timings to a single synthetic average applied everywhere). Instead:
#   - every pulse from base.txt is reused EXACTLY, unchanged, by default
#   - a pulse is only substituted where the target bit's VALUE differs
#     from what base.txt actually transmitted at that position
#   - the substituted value is an average measured strictly from
#     base.txt's own real 0-bits / 1-bits (see decoder.measure_bit_timings),
#     never a textbook/idealized number
#   - marks are never touched at all: in this protocol the bit VALUE is
#     carried entirely by the space length, not the mark, so there is no
#     reason to ever replace a mark — doing so would be exactly the kind
#     of unnecessary normalization being fixed here
# ---------------------------------------------------------------------------

from .decoder import Frame, decode_file, decode_frame_bits  # noqa: E402
import statistics


@dataclass
class MeasuredBitTimings:
    zero_space: float
    one_space: float


def measure_bit_timings_from_frame(frame: Frame, bits: list[int]) -> MeasuredBitTimings:
    """
    Average logical-0 space and logical-1 space, computed strictly from
    this one frame's own real measured pulses — not pooled across other
    files, not a synthetic constant.
    """
    zero_spaces = [abs(s) for (m, s), b in zip(frame.bit_pulses, bits) if b == 0]
    one_spaces = [abs(s) for (m, s), b in zip(frame.bit_pulses, bits) if b == 1]
    return MeasuredBitTimings(
        zero_space=statistics.mean(zero_spaces) if zero_spaces else 0,
        one_space=statistics.mean(one_spaces) if one_spaces else 0,
    )


def patch_frame(frame: Frame, base_bits: list[int], target_bits: list[int],
                 timings: MeasuredBitTimings) -> list[int]:
    """
    Rebuild one frame's raw duration list, reusing frame's EXACT original
    pulses everywhere the bit is unchanged, and substituting only the
    space (never the mark — marks don't carry bit value in this protocol)
    at positions where target_bits differs from base_bits, using the
    measured (not synthetic) average for the new bit value.
    """
    out = [frame.leader_mark, -frame.leader_space]

    for i, (m, s) in enumerate(frame.bit_pulses):
        out.append(m)  # mark is NEVER replaced — it doesn't encode the bit
        if target_bits[i] == base_bits[i]:
            out.append(-s)  # exact original space (stored as +magnitude; re-negate for output)
        else:
            new_space = timings.one_space if target_bits[i] == 1 else timings.zero_space
            out.append(-round(new_space))

    out.append(frame.stop_mark)
    if frame.trailing_gap:
        out.append(-frame.trailing_gap)

    return out


def generate_from_base(payload: bytes, base_path: str) -> str:
    """
    The waveform-preserving generator. Decodes base.txt, and for EVERY
    frame it actually contains (2, 3, whatever — no assumption), patches
    only the bits that differ from the target payload, keeping every
    other pulse byte-for-byte identical to the real capture.

    Returns ir-ctl-compatible raw text where every token is either:
      (a) copied verbatim from base.txt, or
      (b) a space computed as the average of base.txt's own real
          0-bit or 1-bit spaces — never an idealized constant.
    """
    frames, profile, bitlists = decode_file(base_path)
    target_bits = bytes_to_bits(payload)

    all_durations = []
    for frame, base_bits in zip(frames, bitlists):
        if len(base_bits) != len(target_bits):
            raise ValueError(
                f"base.txt frame has {len(base_bits)} bits but target payload has "
                f"{len(target_bits)} bits — can't patch a mismatched frame length"
            )
        timings = measure_bit_timings_from_frame(frame, base_bits)
        all_durations.extend(patch_frame(frame, base_bits, target_bits, timings))

    return durations_to_ir_ctl_text(all_durations)
