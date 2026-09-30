"""
Tuya / Smart Life WiFi IR blaster as the IR front-end.

When Settings.ir_backend == "tuya", every IR send (ir_transmitter._transmit)
and every learn session (ac_learn) goes through a Tuya universal IR remote
on the LAN instead of the Pi's own GPIO LED / receiver. The Pi keeps doing
everything else (API, schedules, state, Supabase); the puck is just a much
stronger emitter (~8 m) with its own receiver.

The rest of this project stores IR as ir-ctl text: alternating
"+mark -space" microsecond durations. Tuya blasters speak the same raw
timings, packed as little-endian uint16 and base64-encoded, so conversion is
lossless apart from clamping any single duration to 65535 us (only ever hit
by very long trailing gaps, which don't matter to the receiver).

Local control only, via tinytuya: needs the device id + local key once (see
docs/TUYA_IR.md). No Tuya cloud call is made at send time.
"""

from __future__ import annotations

import logging
import re
import threading

from app.config import get_settings

log = logging.getLogger("ac-controller.tuya-ir")

_MAX_US = 65535
_NUM_RE = re.compile(r"[+-]?\d+")

_lock = threading.Lock()
_device = None
_device_sig: tuple | None = None


class TuyaIRError(RuntimeError):
    pass


def parse_ir_text(text: str) -> list[int]:
    """ir-ctl "+mark -space" text -> positive microsecond pulse list.

    Ignores non-numeric tokens (e.g. a "carrier 38000" directive) and zero
    durations, and clamps each value into uint16 range.
    """
    pulses: list[int] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.split()[0].lower() in {"carrier", "timeout", "duty_cycle"}:
            continue
        for tok in _NUM_RE.findall(stripped):
            value = abs(int(tok))
            if value == 0:
                continue
            pulses.append(min(value, _MAX_US))
    return pulses


def pulses_to_text(pulses: list[int]) -> str:
    """Positive pulse list -> ir-ctl text, 8 pairs per line."""
    parts = [f"{'+' if i % 2 == 0 else '-'}{int(p)}" for i, p in enumerate(pulses)]
    lines = [" ".join(parts[i : i + 16]) for i in range(0, len(parts), 16)]
    return "\n".join(lines) + "\n"


def _load_class():
    try:
        from tinytuya.Contrib import IRRemoteControlDevice as mod  # type: ignore
    except ImportError as exc:  # pragma: no cover - depends on install
        raise TuyaIRError("tinytuya is not installed. Run: .venv/bin/pip install tinytuya") from exc
    # Contrib exposes the class directly on newer releases, or the module on
    # older ones -- accept either.
    return getattr(mod, "IRRemoteControlDevice", mod)


def _get_device():
    global _device, _device_sig
    s = get_settings()
    if not s.tuya_device_id or not s.tuya_local_key:
        raise TuyaIRError("TUYA_DEVICE_ID and TUYA_LOCAL_KEY must be set in .env (see docs/TUYA_IR.md)")

    sig = (s.tuya_device_id, s.tuya_ip, s.tuya_local_key, s.tuya_version, s.tuya_control_type)
    if _device is not None and _device_sig == sig:
        return _device

    cls = _load_class()
    kwargs = dict(
        dev_id=s.tuya_device_id,
        address=s.tuya_ip or "Auto",
        local_key=s.tuya_local_key,
        version=float(s.tuya_version),
    )
    if s.tuya_control_type:
        kwargs["control_type"] = int(s.tuya_control_type)
    try:
        dev = cls(**kwargs)
    except Exception as exc:  # noqa: BLE001 - surface a readable error
        raise TuyaIRError(f"Couldn't connect to the Tuya IR blaster: {exc}") from exc

    if hasattr(dev, "set_socketTimeout"):
        dev.set_socketTimeout(6)
    _device, _device_sig = dev, sig
    return dev


def _reset():
    global _device, _device_sig
    _device, _device_sig = None, None


def _error_from(result) -> str | None:
    # tinytuya reports failures as {"Error": ..., "Err": ...} instead of raising.
    if isinstance(result, dict) and ("Error" in result or "Err" in result):
        return str(result.get("Error") or result.get("Err"))
    return None


def send_text(ir_text: str) -> None:
    """Send one ir-ctl text waveform through the blaster. Raises TuyaIRError."""
    pulses = parse_ir_text(ir_text)
    if len(pulses) < 4:
        raise TuyaIRError("IR file has no usable pulse data")

    with _lock:
        cls = _load_class()
        code = cls.pulses_to_base64(pulses)
        for attempt in (1, 2):
            try:
                dev = _get_device()
                result = dev.send_button(code)
                err = _error_from(result)
                if err is None:
                    return
                log.warning("Tuya send failed (attempt %s): %s", attempt, err)
            except TuyaIRError:
                raise
            except Exception as exc:  # noqa: BLE001
                err = str(exc)
                log.warning("Tuya send raised (attempt %s): %s", attempt, exc)
            _reset()  # stale socket / IP change: reconnect once and retry
        raise TuyaIRError(f"Tuya IR blaster rejected the send: {err}")


def learn(timeout_seconds: float) -> list[int] | None:
    """Put the blaster in study mode and wait for one button press.

    Returns the captured pulse list, or None if nothing arrived in time.
    """
    with _lock:
        dev = _get_device()
        try:
            code = dev.receive_button(timeout=max(1, int(round(timeout_seconds))))
        except Exception as exc:  # noqa: BLE001
            _reset()
            raise TuyaIRError(f"Tuya learn failed: {exc}") from exc
        finally:
            try:
                dev.study_end()
            except Exception:  # noqa: BLE001 - best effort
                pass

    if not code:
        return None
    cls = _load_class()
    pulses = [min(int(p), _MAX_US) for p in cls.base64_to_pulses(code) if int(p) > 0]
    return pulses or None
