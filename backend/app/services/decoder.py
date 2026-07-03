"""
decoder.py  (v2 — full-transmission decoder, no truncation)
=============================================================
Previous version assumed "exactly 2 frames per file" and quietly
dropped the last pulse of each frame as a "stop bit" via a length%8
heuristic applied AFTER packing. That produced correct answers for 17
of the 18 files, but it was implicit and — critically — it never
verified there wasn't a 3rd frame, or that some file had a genuinely
longer frame. This version fixes both problems:

  1. Boundary detection is now evidence-based and applies to the WHOLE
     file: every long mark+long-space pair is treated as a candidate
     leader, with NO assumption about how many there are. (eco.txt
     turns out to have THREE, not two — see report.)

  2. Nothing is truncated. Every (mark, space) pair between one leader
     and the next is decoded as a bit. The only pulse excluded from the
     bitstream is the single trailing "stop mark" that has no paired
     bit-space of its own (it exists purely to terminate the final
     inter-frame/end-of-message gap — every OOK IR protocol needs one,
     it's a hardware necessity, not a protocol guess) — and that space
     (the gap itself) is kept as metadata (`frame.trailing_gap`), never
     silently merged into the bitstream.

  3. Frame length is *verified*, not assumed: analyze.py now collects
     the decoded bit-count from every single frame in every single
     file and confirms they're all identical before trusting that
     number as "the" frame length. If they weren't, this would print a
     loud warning instead of quietly picking one.
"""

from __future__ import annotations
import re
import statistics
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Step 1: parse raw text into a flat signed duration list (unchanged from v1)
# ---------------------------------------------------------------------------

TOKEN_RE = re.compile(r'([+-])(\d+)')


def parse_raw_file(path: str) -> list[int]:
    with open(path, "r") as f:
        text = f.read()
    durations = []
    for sign, value in TOKEN_RE.findall(text):
        n = int(value)
        durations.append(n if sign == "+" else -n)
    return durations


# ---------------------------------------------------------------------------
# Step 2: find EVERY leader in the file (not just the first one, not
# assuming exactly two). A leader is a (long mark, long space) pair —
# requiring BOTH to be long avoids a false trigger from a single stray
# long bit-mark, which is what "search for packet boundaries instead of
# assuming one" means in practice.
# ---------------------------------------------------------------------------

def typical_short_mark(durations: list[int]) -> float:
    marks = sorted(d for d in durations if d > 0)
    # exclude the top 10% (candidate leaders) before taking the median,
    # so leaders don't pollute the "typical short mark" estimate
    cutoff = marks[: max(1, int(len(marks) * 0.9))]
    return statistics.median(cutoff) if cutoff else statistics.median(marks)


def find_all_leaders(durations: list[int], ratio: float = 3.0) -> list[int]:
    """
    Return the index of every token that starts a leader burst:
    durations[i] is a long mark AND durations[i+1] is a long space,
    both > ratio * typical_short_mark. No cap on how many are found.
    """
    typical = typical_short_mark(durations)
    leaders = []
    for i in range(len(durations) - 1):
        mark, space = durations[i], durations[i + 1]
        if mark > 0 and space < 0 and mark > typical * ratio and abs(space) > typical * ratio:
            leaders.append(i)
    return leaders


# ---------------------------------------------------------------------------
# Step 3: decode ONE segment (leader -> next leader or EOF) completely.
# No bit-count cap. The only thing stripped is the single trailing stop
# mark, detected structurally (it's the last mark with no follow-on bit
# meant for it — see docstring), never by assuming a fixed total.
# ---------------------------------------------------------------------------

@dataclass
class Frame:
    index: int
    leader_mark: int
    leader_space: int
    bit_pulses: list[tuple[int, int]]
    stop_mark: int
    trailing_gap: int


def decode_segment(durations: list[int], start: int, end: int, index: int) -> Frame:
    chunk = durations[start:end]
    leader_mark = chunk[0]
    leader_space = -chunk[1]
    rest = chunk[2:]

    pairs = []
    i = 0
    while i + 1 < len(rest):
        pairs.append((rest[i], -rest[i + 1]))
        i += 2

    stop_mark = 0
    trailing_gap = 0
    leftover_mark_at_tail = (i < len(rest))

    if leftover_mark_at_tail:
        stop_mark = rest[i]
        trailing_gap = 0
    elif pairs:
        other_spaces = [abs(s) for _, s in pairs[:-1]]
        last_mark, last_space = pairs[-1]
        if other_spaces:
            med = statistics.median(other_spaces)
            if abs(last_space) > med * 3:
                stop_mark = last_mark
                trailing_gap = abs(last_space)
                pairs = pairs[:-1]

    return Frame(
        index=index,
        leader_mark=leader_mark,
        leader_space=leader_space,
        bit_pulses=pairs,
        stop_mark=stop_mark,
        trailing_gap=trailing_gap,
    )


def split_into_frames(durations: list[int]) -> list[Frame]:
    leader_starts = find_all_leaders(durations)
    if not leader_starts:
        raise ValueError("No leader burst detected — file may be corrupt/empty")

    frames = []
    for n, start in enumerate(leader_starts):
        end = leader_starts[n + 1] if n + 1 < len(leader_starts) else len(durations)
        frames.append(decode_segment(durations, start, end, n))
    return frames


# ---------------------------------------------------------------------------
# Step 4: bit-value clustering, applied across the COMPLETE set of
# bit_pulses from every frame (no truncated subset).
# ---------------------------------------------------------------------------

def cluster_two(values: list[float]) -> tuple[float, float, float]:
    vs = sorted(values)
    best_gap = 0
    split_at = len(vs) // 2
    for i in range(1, len(vs)):
        gap = vs[i] - vs[i - 1]
        if gap > best_gap:
            best_gap = gap
            split_at = i
    low = vs[:split_at]
    high = vs[split_at:]
    low_center = statistics.mean(low) if low else 0
    high_center = statistics.mean(high) if high else 0
    threshold = (low_center + high_center) / 2 if low and high else statistics.median(vs)
    return low_center, high_center, threshold


@dataclass
class TimingProfile:
    leader_mark: float
    leader_space: float
    bit_mark: float
    zero_space: float
    one_space: float
    threshold: float


def derive_timing_profile(frames: list[Frame]) -> TimingProfile:
    all_marks, all_spaces = [], []
    for fr in frames:
        for m, s in fr.bit_pulses:
            all_marks.append(m)
            all_spaces.append(abs(s))

    bit_mark = statistics.median(all_marks)
    zero_space, one_space, threshold = cluster_two(all_spaces)
    leader_marks = [fr.leader_mark for fr in frames]
    leader_spaces = [fr.leader_space for fr in frames]

    return TimingProfile(
        leader_mark=statistics.median(leader_marks),
        leader_space=statistics.median(leader_spaces),
        bit_mark=bit_mark,
        zero_space=zero_space,
        one_space=one_space,
        threshold=threshold,
    )


def decode_frame_bits(frame: Frame, profile: TimingProfile) -> list[int]:
    """Decode EVERY bit_pulse in the frame — complete, no cap, no cutoff."""
    return [1 if abs(s) > profile.threshold else 0 for _, s in frame.bit_pulses]


def decode_file(path: str) -> tuple[list[Frame], TimingProfile, list[list[int]]]:
    durations = parse_raw_file(path)
    frames = split_into_frames(durations)
    profile = derive_timing_profile(frames)
    bitlists = [decode_frame_bits(fr, profile) for fr in frames]
    return frames, profile, bitlists
