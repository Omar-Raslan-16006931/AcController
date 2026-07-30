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

**Confirming a match unlocks real control, not just the one probe signal.**
Once you confirm, the Detect AC page shows every button captured for that
model — not just the "on" probe used during detection — grouped into
Power / Temperature / Mode / Fan / Swing / Light / Sleep / Eco-turbo /
Other. `app/services/ac_remote_control.py` reads
`raw/ac_codes/full_signals/<Brand>__<Model>/signals.json` (built by
`backend/scripts/regenerate_full_ac_signals.py`, same source as the probe
codes) and exposes each one over `POST /api/detect/remote/send`.

This is **not** the same kind of control the Carrier integration has,
though: there's no shared `AcState` byte layout here, no "set temperature
to 23" that regenerates one packet — each button is an independent
captured waveform, replayed exactly as the original remote sent it, same
as if you pressed that specific button. If a model's file only captured
`Cool_16` through `Cool_24`, that's the exact range you get; there's no
way to synthesize `Cool_25`. Category/label guessing
(`ac_remote_control.categorize()`) is heuristic and names vary in quality
across community captures (typos like `0n` for `On` do happen) — buttons
are still shown even when mis-categorized, just bucketed under "Other."

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
- `GET /remote/signals` — every captured button for whatever AC was last
  confirmed (404 until something's been confirmed).
- `POST /remote/send` `{name}` — sends one specific button by its raw
  signal name (as returned by `/remote/signals`).

Confirmed matches persist to `DETECTED_AC_FILE_PATH` (default
`./detected_ac.json`) so they survive a restart.
