# AC brand detection (brute force)

For when the Pi + IR blaster is pointed at an AC that **isn't** your
Carrier unit — a hotel, an Airbnb, wherever else you're travelling with
this thing. `carrier_ac.py` only knows how to talk to one specific,
already-reverse-engineered Carrier protocol; this feature is for
everything else.

## What it actually does

`app/services/ac_detector.py` cycles through 116 real captured "power
on"-ish IR waveforms — one per brand/model, covering 70+ brands (Carrier,
Daikin, Gree, Midea, Mitsubishi, Panasonic, Samsung, and many more) — a
fixed interval apart (default 1.5s, adjustable). You listen to the target
AC; the moment it beeps/responds, you tap **"I heard it! Confirm"** in the
Detect AC page (Settings → Detect AC, or `/detect`). Whatever code was
most recently sent gets recorded as the match.

**This identifies a brand/protocol and gives you a working replay of that
one captured signal — it is not full temperature/mode/fan control.** The
payload was captured from someone else's remote and encodes whatever
state *that* remote happened to be in when captured, not your desired
temperature. Getting real state control for a newly detected AC (the way
`carrier_ac.py` has for the Carrier unit) would need the same
reverse-engineering process: capture that AC's actual remote with
`ir-ctl --receive` across several button presses, and decode the bit
layout from the differences — a separate, much bigger effort per AC. Think
of this feature as "which universal remote code do I need" more than "new
smart AC support."

## Where the codes come from

`app/services/raw/ac_codes/brute_force/` — converted from the
[Flipper-IRDB](https://github.com/Lucaslhm/Flipper-IRDB) project's `ACs/`
category (CC0-1.0, public domain). See that directory's `NOTICE.md` for
exactly which signal was picked per file and what got skipped (~40 files
whose only entries were `type: parsed` NEC scancodes rather than raw
captures — notably LG's and Frigidaire's dedicated AC files, only their TV
remotes made it into the raw-capture set).

To pick up more brands or point at a different/larger dataset:

```bash
git clone --depth 1 https://github.com/Lucaslhm/Flipper-IRDB.git /tmp/firdb
python3 backend/scripts/regenerate_brute_force_codes.py /tmp/firdb/ACs
```

This **overwrites** everything in `brute_force/` except `NOTICE.md`.
Review `git diff` before committing — indices shift when brands are
added/removed/renamed, which matters if you were mid-run against the old
manifest.

## API

All under `/api/detect/`, authenticated the normal way (Supabase JWT, same
as every other endpoint except the WiFi setup ones):

- `GET /codes` — the full 116-entry list.
- `GET /status` — current run state, progress, last confirmed match.
- `POST /start` `{interval_seconds, start_index}` — begins/resumes a pass.
- `POST /stop` — stops without confirming.
- `POST /confirm` — stops and records whatever was last sent.
- `POST /reset` — clears run state (not a previously confirmed match).
- `POST /replay/{index}` — manually re-sends one specific code (refuses to
  run while an auto pass is active).

Confirmed matches persist to `DETECTED_AC_FILE_PATH` (default
`./detected_ac.json`) so they survive a restart.
