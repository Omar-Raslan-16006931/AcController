"""
carrier_ac.py  (v3 — bit-mask based)
=====================================
Built directly from the bit-level evidence in output/bitmask_report.md.
No preset "known state" blobs anymore (that was v2's fallback for
fields we hadn't isolated yet) — every field below is set by editing
individual bits of byte2/byte4, and byte1/3/5 (the complements) are
generated automatically from whatever byte0/2/4 end up being. This is
what "editing bits and auto-generating complements" means concretely:
change one bit, the whole 6-byte frame — including its own checksum
mechanism — updates itself.

FRAME LAYOUT
    byte0 = 0x4D           constant header
    byte1 = ~byte0
    byte2 = state byte:
        bit 5        (mask 0x20)  POWER        1=on, 0=off      [CONFIRMED]
        bits [2:0]   (mask 0x07)  FAN          0=auto 1=low 2=medium 4=high [CONFIRMED]
        bits 7,6,4,3 (mask 0xD8)  reserved, always observed as 1  [constant]
    byte3 = ~byte2
    byte4 = temp/mode byte:
        bits [5:4]   (mask 0x30)  MODE         00=cool 10=dry 11=heat  [CONFIRMED]
        bits [3:0]   (mask 0x0F)  TEMPERATURE  lookup table, see TEMP_TABLE [CONFIRMED]
        bits 7,6                 reserved, always observed as 0  [constant]
    byte5 = ~byte4

CONFIDENCE — see output/bitmask_report.md for the full per-bit evidence
table. Short version: power, fan, mode, and temperature are each
confirmed by captures that changed ONLY that field's bits and nothing
else — genuine single-variable isolation, not inference. Eco is
explicitly NOT implemented as a bit, because the data doesn't support
one: eco.txt decoded to a payload byte-identical to power_on.txt and
mode_cool.txt. Calling set_eco() raises rather than pretending.
"""

from __future__ import annotations
import os
from dataclasses import dataclass, field

from decoder import decode_file, TimingProfile
from generator import payload_to_ir_ctl_text, generate_from_base, FrameGaps

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw", "ac_codes")

# --- byte0 (header) ------------------------------------------------------
HEADER = 0x4D

# --- byte2 bit masks (confirmed) -----------------------------------------
POWER_BIT = 0x20
FAN_MASK = 0x07
BYTE2_RESERVED = 0xD8   # bits 7,6,4,3 — always 1 in every capture, held constant

FAN_CODES = {
    "auto": 0b000,
    "low": 0b001,
    "medium": 0b010,
    "high": 0b100,
}

# --- byte4 bit masks (confirmed) ------------------------------------------
MODE_MASK = 0x30
TEMP_MASK = 0x0F

MODE_CODES = {
    "cool": 0b00,
    "dry": 0b10,
    "heat": 0b11,
    # 0b01 was never captured — no confirmed 4th mode
}

# Measured directly from captures, bits[3:0] of byte4 only (mode bits
# masked out first) — not interpolated.
TEMP_TABLE = {
    20: 0x4, 21: 0x6, 22: 0xE, 23: 0xA, 24: 0x2,
    25: 0x3, 26: 0xB, 27: 0x9, 28: 0x1,
}


def _load_timing():
    frames, profile, _ = decode_file(os.path.join(RAW_DIR, "base.txt"))
    gaps = FrameGaps(
        inter_frame_gap=frames[0].trailing_gap,
        final_gap=frames[-1].trailing_gap,
    )
    return profile, gaps


@dataclass
class ACState:
    power: bool = True
    mode: str = "cool"
    temperature: int = 24
    fan: str = "low"


class CarrierAC:
    """
    Every setter edits specific bits of byte2 or byte4. encode() then:
      1. builds byte2 from POWER_BIT | FAN_CODES[fan] | BYTE2_RESERVED
      2. builds byte4 from (MODE_CODES[mode] << 4) | TEMP_TABLE[temperature]
      3. AUTO-GENERATES byte1/3/5 as the bitwise complement of byte0/2/4

    Usage:
        ac = CarrierAC()
        ac.power(True).set_mode("cool").set_temperature(23).set_fan("high")
        ac.write_ir_file("cool_23_high.txt")
    """

    def __init__(self):
        self.state = ACState()
        self._profile, self._gaps = _load_timing()

    # --- public control API: each of these edits ONE field's bits -----

    def power(self, on: bool) -> "CarrierAC":
        self.state.power = on
        return self

    def set_mode(self, mode: str) -> "CarrierAC":
        if mode not in MODE_CODES:
            raise ValueError(f"mode must be one of {list(MODE_CODES)} (0b01 has no confirmed meaning)")
        self.state.mode = mode
        return self

    def set_temperature(self, temp: int) -> "CarrierAC":
        if temp not in TEMP_TABLE:
            valid = sorted(TEMP_TABLE)
            raise ValueError(f"temperature {temp} not in confirmed range {valid[0]}-{valid[-1]}")
        self.state.temperature = temp
        return self

    def set_fan(self, speed: str) -> "CarrierAC":
        if speed not in FAN_CODES:
            raise ValueError(f"fan speed must be one of {list(FAN_CODES)}")
        self.state.fan = speed
        return self

    def set_eco(self, enabled: bool) -> "CarrierAC":
        raise NotImplementedError(
            "No eco bit was isolated in byte2 or byte4 — eco.txt decoded to a payload "
            "byte-identical to power_on.txt and mode_cool.txt (see output/bitmask_report.md, "
            "'ECO — NOT FOUND'). Implementing this would mean guessing a bit with zero "
            "supporting evidence. Recapture eco with a controlled baseline (reset to a known "
            "state, press ONLY eco, capture) and rerun bitmask_analysis.py to add it properly."
        )

    # --- bit-level construction + automatic complement generation -----

    def _build_byte2(self) -> int:
        value = BYTE2_RESERVED
        if self.state.power:
            value |= POWER_BIT
        value |= FAN_CODES[self.state.fan] & FAN_MASK
        return value & 0xFF

    def _build_byte4(self) -> int:
        mode_bits = (MODE_CODES[self.state.mode] << 4) & MODE_MASK
        temp_bits = TEMP_TABLE[self.state.temperature] & TEMP_MASK
        return (mode_bits | temp_bits) & 0xFF

    def encode(self) -> bytes:
        """
        Build all 6 bytes from the current bit-level state. byte1/3/5
        are NOT stored anywhere — they're computed fresh every call as
        the bitwise complement of byte0/2/4, exactly matching the
        protocol's own validation mechanism.
        """
        byte0 = HEADER
        byte2 = self._build_byte2()
        byte4 = self._build_byte4()

        byte1 = (~byte0) & 0xFF   # auto-generated complement
        byte3 = (~byte2) & 0xFF   # auto-generated complement
        byte5 = (~byte4) & 0xFF   # auto-generated complement

        return bytes([byte0, byte1, byte2, byte3, byte4, byte5])

    def to_ir_timings(self, preserve_waveform: bool = True) -> str:
        """
        By default, patches base.txt's own captured waveform — every
        pulse is reused exactly except where the target bit genuinely
        differs from base.txt, matching the original remote's real
        timing jitter instead of a synthesized ideal. Pass
        preserve_waveform=False to fall back to the fully-synthesized
        (normalized-timing) generator instead.
        """
        payload = self.encode()
        if preserve_waveform:
            base_path = os.path.join(RAW_DIR, "base.txt")
            return generate_from_base(payload, base_path)
        return payload_to_ir_ctl_text(payload, self._profile, self._gaps)

    def write_ir_file(self, path: str) -> None:
        with open(path, "w") as f:
            f.write(self.to_ir_timings())


if __name__ == "__main__":
    ac = CarrierAC()
    ac.power(True).set_mode("cool").set_temperature(23).set_fan("high")
    payload = ac.encode()
    print("byte0 (header):    0x%02x" % payload[0])
    print("byte1 (~byte0):    0x%02x" % payload[1])
    print("byte2 (state):     0x%02x  = %s" % (payload[2], format(payload[2], "08b")))
    print("byte3 (~byte2):    0x%02x" % payload[3])
    print("byte4 (mode+temp): 0x%02x  = %s" % (payload[4], format(payload[4], "08b")))
    print("byte5 (~byte4):    0x%02x" % payload[5])
    print()
    print("Full payload:", payload.hex())
