"""
Ad-hoc remote control for whatever AC brand/model was last confirmed via
the brute-force detector (app/services/ac_detector.py).

Detection only ever sends ONE probe signal per model (see
raw/ac_codes/brute_force/). But the source Flipper-IRDB file behind that
probe usually captured many more buttons from the original remote --
every temperature step, mode, fan speed, whatever exists. Those full sets
are bundled separately in raw/ac_codes/full_signals/<Brand>__<Model>/
(see backend/scripts/regenerate_full_ac_signals.py), keyed by the exact
same brand/model the detector already matched against.

This is NOT a state machine the way carrier_ac.py's AcState is -- there's
no "current temperature" tracked, no encode()/decode() of a shared byte
layout. Each button is an independent captured waveform, replayed as-is,
exactly like pressing that specific button on the real remote. Signal
names and quality vary a lot across community-contributed captures (typos,
inconsistent naming), so `categorize()` is a best-effort heuristic for
grouping in the UI -- everything is still sent/shown even when it can't be
confidently categorized, just bucketed under "other".
"""

from __future__ import annotations

import json
import os
import re

from app.config import get_settings
from app.models.detect import DetectedAc
from app.services import ir_transmitter

FULL_SIGNALS_DIR = os.path.join(os.path.dirname(__file__), "raw", "ac_codes", "full_signals")

_OFF_RE = re.compile(r"^(off|power[\s_-]?off|pwr[\s_-]?off)$", re.IGNORECASE)
_ON_RE = re.compile(r"^(0?n|on|power|power[\s_-]?on|pwr[\s_-]?on)$", re.IGNORECASE)
_TEMP_RE = re.compile(r"(cool|heat|dry|auto|fan|cold|hot)?[\s_-]*(\d{2})\b", re.IGNORECASE)
_MODE_WORDS = {"cool", "heat", "dry", "auto", "fan"}


def categorize(name: str) -> tuple[str, str]:
    """Returns (category, display_label) for a raw signal name."""
    stripped = name.strip()

    if _OFF_RE.match(stripped):
        return "power", "Off"
    if _ON_RE.match(stripped):
        return "power", "On"

    m = _TEMP_RE.search(stripped)
    if m and m.group(2):
        mode_word = (m.group(1) or "").capitalize()
        label = f"{mode_word} {m.group(2)}°".strip()
        return "temperature", label

    lower = stripped.lower()
    if lower in _MODE_WORDS:
        return "mode", stripped.capitalize()
    if "fan" in lower or "speed" in lower:
        return "fan", stripped
    if "swing" in lower or "louver" in lower or "louvre" in lower:
        return "swing", stripped
    if "light" in lower or "led" in lower or "display" in lower:
        return "light", stripped
    if "sleep" in lower:
        return "sleep", stripped
    if "eco" in lower or "turbo" in lower or "boost" in lower:
        return "boost", stripped

    return "other", stripped


def _model_dir_name(brand: str, model: str) -> str:
    def sanitize(s: str) -> str:
        s = re.sub(r"[^A-Za-z0-9_.-]+", "_", s.strip())
        return re.sub(r"_+", "_", s).strip("_")

    return f"{sanitize(brand)}__{sanitize(model)}"


def _load_detected() -> DetectedAc | None:
    settings = get_settings()
    path = settings.detected_ac_file_path
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            return DetectedAc(**json.load(f))
    except (json.JSONDecodeError, ValueError, OSError):
        return None


def get_signals_for_detected() -> tuple[DetectedAc, list[dict]]:
    """Returns (detected, signals) where each signal dict has
    name/label/category/file. Raises LookupError if nothing has been
    confirmed yet, or FileNotFoundError if the confirmed model's full
    signal set isn't bundled for some reason (shouldn't happen for any
    model reachable via the detector -- full_signals/ is built from the
    same 116-model list as brute_force/manifest.json)."""
    detected = _load_detected()
    if detected is None:
        raise LookupError("No AC has been confirmed yet -- run detection and confirm a match first")

    model_dir = os.path.join(FULL_SIGNALS_DIR, _model_dir_name(detected.brand, detected.model))
    signals_path = os.path.join(model_dir, "signals.json")
    if not os.path.isfile(signals_path):
        raise FileNotFoundError(
            f"No bundled button set for {detected.brand} {detected.model} -- only the single "
            "probe signal used during detection is available for this model"
        )

    with open(signals_path, "r") as f:
        raw = json.load(f)

    signals = []
    for sig in raw["signals"]:
        category, label = categorize(sig["name"])
        signals.append({"name": sig["name"], "label": label, "category": category, "file": sig["file"]})

    return detected, signals


def send_signal(signal_name: str) -> ir_transmitter.TransmitResult:
    detected, signals = get_signals_for_detected()
    match = next((s for s in signals if s["name"] == signal_name), None)
    if match is None:
        raise ValueError(f"No button named {signal_name!r} for {detected.brand} {detected.model}")

    model_dir = os.path.join(FULL_SIGNALS_DIR, _model_dir_name(detected.brand, detected.model))
    path = os.path.join(model_dir, match["file"])
    return ir_transmitter.transmit_raw_file(path)
