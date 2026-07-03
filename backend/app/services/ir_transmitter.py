"""
Generates and transmits an IR command for the Carrier AC.

Every call regenerates a fresh IR packet from the *current* desired state via
`carrier_ac.py` and sends it immediately with `ir-ctl`. Prerecorded IR files
are never replayed — this module always writes a new file right before
sending it.
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


@dataclass
class TransmitResult:
    success: bool
    ir_file: str
    error: str | None = None


def _build_ir_file(state: AcState) -> str:
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


def send_state(state: AcState) -> TransmitResult:
    """Builds a fresh IR packet for `state` and transmits it via ir-ctl."""
    settings = get_settings()

    try:
        ir_file = _build_ir_file(state)
    except Exception as exc:  # noqa: BLE001 - surface any packet-gen failure
        return TransmitResult(success=False, ir_file="", error=f"Failed to generate IR packet: {exc}")

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
