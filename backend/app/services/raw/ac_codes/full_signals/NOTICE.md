# Source of these codes

Same source as `../brute_force/` — [Flipper-IRDB](https://github.com/Lucaslhm/Flipper-IRDB)
(CC0-1.0, public domain). Where `brute_force/` has exactly one representative
"probe" signal per model, this directory has **every** raw signal captured
for that same model — temperature steps, mode, fan speed, whatever the
original remote had (typically 5-25 buttons per model; 1271 total across
these 116 models).

Layout: `<Brand>__<Model>/signals.json` lists every button's original name
and its `.txt` file (same `+mark -space` ir-ctl format used everywhere
else in this project); the `.txt` files sit alongside it in the same
directory.

Used by `app/services/ac_remote_control.py` once a model has been
confirmed via the brute-force detector (`app/services/ac_detector.py`), to
offer real control instead of just replaying the one probe signal. Signal
naming quality varies (community-contributed, occasional typos like `0n`
for `On`) — `ac_remote_control.categorize()` makes a best-effort guess for
UI grouping and falls back to showing the raw name unmodified when it
can't confidently categorize something.

Regenerate with `backend/scripts/regenerate_full_ac_signals.py` (see that
file's docstring) after `regenerate_brute_force_codes.py`, against a fresh
Flipper-IRDB checkout.
