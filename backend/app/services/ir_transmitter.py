"""
Generates and transmits an IR command for the Carrier AC.

For every command EXCEPT power-off, a fresh IR packet is regenerated from
the *current* desired state via `carrier_ac.py` and sent immediately with
`ir-ctl`. That generator produces a technically well-formed packet for the
power-off case too (the AC accepts it — it beeps), but it does not actually
power the unit down. Rather than keep guessing at the missing bit(s), power
OFF bypasses generation entirely: it replays a real captured waveform
(`raw/ac_codes/power_off.txt`, same "+mark -space" ir-ctl text format as
`base.txt`) byte-for-byte. Power ON, mode, fan, and temperature all continue
to go through the normal generator path, unchanged.

Light and Self Clean (see `send_raw_command` below) use the same raw-replay
approach as power-off, for a different reason: they're momentary buttons on
the real remote that aren't part of the power/temp/mode/fan state model at
all (CarrierAC's 6-byte packet has no bit for either), so there's nothing
for a generator to encode — a captured waveform is the only way to send
them.
"""

from __future__ import annotations

import os
import subprocess
import time
import uuid
from dataclasses import dataclass

from app.config import get_settings
from app.models.ac_state import AcState
from app.services.carrier_ac import CarrierAC

# Same directory carrier_ac.py reads base.txt from — captured raw IR
# waveforms live here, one file per command that needs a direct replay.
RAW_DIR = os.path.join(os.path.dirname(__file__), "raw", "ac_codes")
POWER_OFF_RAW_FILE = "power_off.txt"


@dataclass
class TransmitResult:
    success: bool
    ir_file: str
    error: str | None = None


def _build_generated_ir_file(state: AcState) -> str:
    settings = get_settings()
    os.makedirs(settings.ir_files_dir, exist_ok=True)

    # The real CarrierAC takes no constructor args — its IR timing comes
    # from decoding backend/app/services/raw/ac_codes/base.txt directly
    # (a real capture), not from configurable frequency/duty-cycle/GPIO
    # settings. Those Settings-page fields no longer affect transmission
    # with this library; they're kept only for display/reference.
    ac = CarrierAC()
    ac.power(state.power)
    ac.set_temperature(state.temperature)
    ac.set_mode(state.mode)
    ac.set_fan(state.fan)

    filename = os.path.join(
        settings.ir_files_dir, f"carrier-{int(time.time())}-{uuid.uuid4().hex[:8]}.ir"
    )
    ac.write_ir_file(filename)
    return filename


def _build_raw_replay_ir_file(raw_filename: str, tmp_prefix: str) -> str:
    """
    Copies a captured raw waveform (same "+mark -space" ir-ctl text format
    as base.txt) verbatim into a fresh timestamped .ir file, so it flows
    through the same ir-ctl/history plumbing as every generated command —
    no CarrierAC, no bit-patching, no generation at all.
    """
    raw_path = os.path.join(RAW_DIR, raw_filename)
    if not os.path.isfile(raw_path):
        raise FileNotFoundError(
            f"No captured waveform found at {raw_path}. Capture the real "
            "remote's button (e.g. `ir-ctl --receive` on the Pi while "
            f"pressing it) and save the output at that exact path — this "
            "command has no generated fallback, so the file is required."
        )

    settings = get_settings()
    os.makedirs(settings.ir_files_dir, exist_ok=True)

    with open(raw_path, "r") as f:
        raw_text = f.read()

    filename = os.path.join(
        settings.ir_files_dir, f"{tmp_prefix}-{int(time.time())}-{uuid.uuid4().hex[:8]}.ir"
    )
    with open(filename, "w") as f:
        f.write(raw_text)
    return filename


def _build_power_off_ir_file() -> str:
    return _build_raw_replay_ir_file(POWER_OFF_RAW_FILE, "carrier-poweroff")


def _build_ir_file(state: AcState) -> str:
    if not state.power:
        return _build_power_off_ir_file()
    return _build_generated_ir_file(state)


def _transmit(ir_file: str) -> TransmitResult:
    settings = get_settings()

    if settings.simulate_ir:
        return TransmitResult(success=True, ir_file=ir_file)

    try:
        proc = subprocess.run(
            ["ir-ctl", "-d", settings.ir_device, f"--send={ir_file}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except FileNotFoundError:
        return TransmitResult(
            success=False,
            ir_file=ir_file,
            error="ir-ctl not found on this system. Install v4l-utils, or set SIMULATE_IR=1 for development.",
        )
    except subprocess.TimeoutExpired:
        return TransmitResult(success=False, ir_file=ir_file, error="ir-ctl timed out")

    if proc.returncode != 0:
        return TransmitResult(
            success=False,
            ir_file=ir_file,
            error=proc.stderr.strip() or f"ir-ctl exited with code {proc.returncode}",
        )

    return TransmitResult(success=True, ir_file=ir_file)


def send_state(state: AcState) -> TransmitResult:
    """Builds the IR packet for `state` and transmits it via ir-ctl.

    state.power == False replays the captured power_off.txt waveform
    directly; every other case (power on, and any mode/fan/temperature
    change while already on) still generates a fresh packet as before.
    """
    try:
        ir_file = _build_ir_file(state)
    except Exception as exc:  # noqa: BLE001 - surface any packet-gen failure
        return TransmitResult(success=False, ir_file="", error=f"Failed to generate IR packet: {exc}")

    return _transmit(ir_file)


def send_raw_command(raw_filename: str, tmp_prefix: str) -> TransmitResult:
    """
    Transmits a captured raw waveform directly — for momentary auxiliary
    buttons (Light, Self Clean) that live entirely outside the
    power/temp/mode/fan AcState model. `raw_filename` is looked up inside
    RAW_DIR (backend/app/services/raw/ac_codes/); `tmp_prefix` just makes
    the generated .ir filenames identifiable in ir_files_dir.
    """
    try:
        ir_file = _build_raw_replay_ir_file(raw_filename, tmp_prefix)
    except Exception as exc:  # noqa: BLE001 - surface any packet-load failure
        return TransmitResult(success=False, ir_file="", error=f"Failed to load IR packet: {exc}")

    return _transmit(ir_file)
