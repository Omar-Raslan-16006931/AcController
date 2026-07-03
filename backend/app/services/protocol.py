"""
protocol.py
===========
Turns decoded bitstreams into byte arrays (tried both bit orders),
compares byte arrays across captures to find which byte(s) change for
which remote function, and searches for a checksum relationship among
the bytes.

Nothing here assumes a specific vendor protocol layout — every function
takes decoded bits/bytes as plain data and reports what it finds.
"""

from __future__ import annotations
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Bit packing
# ---------------------------------------------------------------------------

def bits_to_bytes_lsb(bits: list[int]) -> bytes:
    """Pack bits into bytes, LSB of each byte transmitted first (Midea/NEC-style)."""
    out = bytearray()
    for i in range(0, len(bits) - 7, 8):
        byte = 0
        for b in range(8):
            byte |= (bits[i + b] << b)
        out.append(byte)
    return bytes(out)


def bits_to_bytes_msb(bits: list[int]) -> bytes:
    """Pack bits into bytes, MSB of each byte transmitted first."""
    out = bytearray()
    for i in range(0, len(bits) - 7, 8):
        byte = 0
        for b in range(8):
            byte = (byte << 1) | bits[i + b]
        out.append(byte)
    return bytes(out)


def bytes_to_bits_lsb(data: bytes) -> list[int]:
    bits = []
    for byte in data:
        for b in range(8):
            bits.append((byte >> b) & 1)
    return bits


def bytes_to_bits_msb(data: bytes) -> list[int]:
    bits = []
    for byte in data:
        for b in range(7, -1, -1):
            bits.append((byte >> b) & 1)
    return bits


# ---------------------------------------------------------------------------
# Cross-capture diffing
# ---------------------------------------------------------------------------

@dataclass
class ByteDiff:
    index: int
    base_value: int
    other_value: int


def diff_bytes(base: bytes, other: bytes) -> list[ByteDiff]:
    diffs = []
    for i in range(min(len(base), len(other))):
        if base[i] != other[i]:
            diffs.append(ByteDiff(i, base[i], other[i]))
    return diffs


def bit_diff_positions(base: bytes, other: bytes) -> list[int]:
    """Return the absolute bit positions (0 = MSB of byte0) that differ."""
    positions = []
    for i in range(min(len(base), len(other))):
        x = base[i] ^ other[i]
        for b in range(8):
            if x & (1 << (7 - b)):
                positions.append(i * 8 + b)
    return positions


# ---------------------------------------------------------------------------
# Checksum discovery
# ---------------------------------------------------------------------------

def candidate_checksums(payload: bytes) -> dict:
    """
    Compute every common checksum candidate over `payload` and return them
    as a dict {name: value}. Used to test "does byte[k] equal any of these?"
    across many captures at once.
    """
    n = len(payload)
    results = {}

    if n == 0:
        return results

    # byte sum (mod 256)
    results["sum8"] = sum(payload) & 0xFF

    # XOR of all bytes
    x = 0
    for b in payload:
        x ^= b
    results["xor8"] = x

    # one's complement of sum
    results["sum8_not"] = (~sum(payload)) & 0xFF

    # two's complement (negative of sum)
    results["sum8_neg"] = (-sum(payload)) & 0xFF

    # nibble sum: sum of all nibbles, folded to a byte
    nibble_total = 0
    for b in payload:
        nibble_total += (b >> 4) + (b & 0x0F)
    results["nibble_sum"] = nibble_total & 0xFF

    # Midea-style: sum of bytes[0:n], then take (0x100 - sum) & 0xFF ("complement checksum")
    results["midea_complement"] = (0x100 - (sum(payload) & 0xFF)) & 0xFF

    # simple CRC-8 (poly 0x07, init 0x00) — common in some AC protocols
    crc = 0x00
    for b in payload:
        crc ^= b
        for _ in range(8):
            if crc & 0x80:
                crc = ((crc << 1) ^ 0x07) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    results["crc8_0x07"] = crc

    # CRC-8 poly 0x31 (Dallas/Maxim variant), init 0x00
    crc2 = 0x00
    for b in payload:
        crc2 ^= b
        for _ in range(8):
            if crc2 & 0x01:
                crc2 = ((crc2 >> 1) ^ 0x8C) & 0xFF
            else:
                crc2 = (crc2 >> 1) & 0xFF
    results["crc8_maxim"] = crc2

    return results


def find_checksum_byte(all_payloads: list[bytes], candidate_index: int) -> dict:
    """
    For a specific byte index across many captured frames, test whether
    that byte always equals one of the candidate_checksums() computed over
    the *other* bytes (everything except candidate_index). Returns
    {algorithm_name: hit_count} so we can see which algorithm matches most
    (or all) frames.
    """
    hits = {}
    total = 0
    for payload in all_payloads:
        if candidate_index >= len(payload):
            continue
        total += 1
        rest = payload[:candidate_index] + payload[candidate_index + 1:]
        actual = payload[candidate_index]
        cands = candidate_checksums(rest)
        for name, val in cands.items():
            if val == actual:
                hits[name] = hits.get(name, 0) + 1
    hits["_total_frames_tested"] = total
    return hits
