# Source of these codes

The `.txt` files in this directory (116 of them, one per `<Brand>__<Model>.txt`,
listed in `manifest.json`) are converted from raw IR captures in the
[Flipper-IRDB](https://github.com/Lucaslhm/Flipper-IRDB) project's `ACs/`
category — a community-maintained database of real IR remote captures,
licensed [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/)
(public domain, no attribution required; credited here anyway).

Each file is the single raw signal `ac_code_picker.py` judged most likely to
be a "turn on / cool" button for that model (see the `signal` field in
`manifest.json`), converted from Flipper's unsigned `data: 6060 7357 ...`
format into this project's `+mark -space` ir-ctl text format — same format
as `../base.txt` and `../power_off.txt`. No other change is made to the
timing data.

Flipper-IRDB organizes remotes as `Device Type > Brand > Model`. Files whose
only entries were `type: parsed` (a decoded protocol/scancode rather than a
raw waveform — common for simple window-unit ACs that just toggle a fixed
NEC code) were skipped, since this project's `ir-ctl --send=<file>` path
only replays raw captures. That's roughly 40 of the ~158 source files;
notably it excludes LG's and Frigidaire's dedicated AC files (only their
TV-remote captures made it into the raw set). Re-run
`backend/scripts/regenerate_brute_force_codes.py` against an updated
Flipper-IRDB checkout to pick up more brands or a newer dataset.

## What this is (and isn't) for

Sending one of these codes to an unknown AC is a **brand/model identification
probe**, not a full remote replacement — the payload was captured from one
real unit's remote and does not encode *your* AC's exact desired temperature.
If a code makes your AC beep/respond, that tells you which brand/protocol
family it belongs to and gives you a working "on" replay for it, but full
temperature/mode/fan control for a newly detected (non-Carrier) unit would
need the same reverse-engineering `carrier_ac.py` went through — capturing
that AC's real remote and decoding its bit layout. See `docs/AC_DETECT.md`.
