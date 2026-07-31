# Manual IR learning

For an AC whose remote isn't in the bundled brute-force library
(`docs/AC_DETECT.md`) at all — capture buttons straight from the real
physical remote instead. Settings → Detect AC → **Learn manually** tab.

## What it does

Point the real remote at a second piece of hardware wired to the Pi — an
IR **receiver**, not the transmitter LED you already have — name a button,
tap Listen, press that button on the real remote. `app/services/ac_learn.py`
runs `ir-ctl --receive` in the background for up to 10 seconds and checks
whether anything actually arrived:

- **Signal received** — saved immediately, available to send from the
  Learned buttons list right away.
- **No signal received** — told plainly, not silently assumed to have
  worked. Move closer, aim more directly at the receiver, and try again.
- **Error** (e.g. `ir-ctl` can't open the device) — almost always means the
  receiver hardware/overlay below isn't set up yet.

This is intentionally simple: no state model, no temperature/mode
generation — each learned button is one raw captured waveform, replayed
exactly as received, same as `ac_remote_control.py`'s bundled buttons.

## Hardware you need

This app already transmits over GPIO17 (`dtoverlay=gpio-ir-tx,gpio_pin=17`,
see `docs/DEPLOYMENT.md`) — that overlay is **send-only** and can't receive
anything. Learning needs a second, physically different component:

- An IR receiver module — a TSOP38238 (38kHz) is the common, cheap choice
  (~$1-2), 3 pins: VCC, GND, OUT (or VOUT/data).
- A free GPIO pin, e.g. **GPIO18** (physical pin 12) — anything not already
  used by the transmitter or something else.

### Wiring (TSOP38238 example)

| TSOP38238 pin | Pi pin |
|---|---|
| VCC (pin 1, left, flat side facing you) | 3.3V — physical pin 1 or 17 |
| GND (pin 2, middle) | GND — physical pin 6, 9, 14, etc. |
| OUT (pin 3, right) | GPIO18 — physical pin 12 |

Double-check your specific module's pinout before wiring — some clones
have VCC/GND swapped from the classic TSOP part. Powering it backwards
usually just fails to work rather than damaging anything, but it's worth
the 30 seconds to check the datasheet.

### Enable the receive overlay

On the Pi:

```bash
sudo nano /boot/firmware/config.txt
```

Add a line (near the existing `dtoverlay=gpio-ir-tx,gpio_pin=17` line):

```
dtoverlay=gpio-ir,gpio_pin=18
```

Note: **no** `-tx` suffix — that's what makes this one a receiver instead
of a transmitter. Save, then reboot:

```bash
sudo reboot
```

### Verify it worked

After reboot:

```bash
ls /dev/lirc*
```

You should now see **two** devices — `/dev/lirc0` (existing transmitter)
and `/dev/lirc1` (new receiver). If only `/dev/lirc0` shows up, the overlay
line didn't take — check for typos in config.txt and confirm you rebooted.

Quick manual test, independent of the app entirely:

```bash
ir-ctl -d /dev/lirc1 --receive=/tmp/test.txt
```

This blocks — point any remote at the receiver and press a button, then
`Ctrl+C` and `cat /tmp/test.txt`. Real capture data (`+9024 -4512 +564 ...`)
means the receiver is wired correctly and the app's Learn tab will work.
Nothing in the file means check the wiring before troubleshooting the app.

## Configuration

`backend/.env` (see `.env.example`):

```
IR_RX_DEVICE=/dev/lirc1
LEARNED_SIGNALS_DIR=./learned_signals
```

`IR_RX_DEVICE` must match whatever `/dev/lircN` the overlay above actually
created — check with `ls /dev/lirc*` if it's not `/dev/lirc1` on your
setup (e.g. if you already had other lirc-using overlays configured).

With `SIMULATE_IR=1` (the dev-machine default), the whole Listen → Received
→ saved flow works without any of the above — it fakes a successful
capture after a couple seconds, purely so the UI/API can be exercised
without real hardware. Set `SIMULATE_IR=0` once the receiver is wired and
verified with the manual `ir-ctl` test above.

## API

All under `/api/learn/`, authenticated the same as everything else:

- `GET /buttons` — every learned button (name + when it was learned).
- `GET /status` — current listen session state
  (`idle | listening | received | timed_out | error`).
- `POST /start` `{name, timeout_seconds}` — begins listening for one
  button (`timeout_seconds` 3-30, default 10).
- `POST /cancel` — stops listening without saving anything.
- `POST /send` `{name}` — replays a previously learned button.
- `DELETE /buttons/{name}` — removes a learned button.

Learned buttons persist in `LEARNED_SIGNALS_DIR` (default
`./learned_signals/`) as raw `+mark -space` `.txt` files plus a
`manifest.json`, so they survive a restart. Re-learning a button with the
same name overwrites the old capture rather than duplicating it.
