#!/usr/bin/env python3
"""
Regenerates app/services/raw/ac_codes/full_signals/ -- the FULL button set
(every raw signal, not just one probe code) for each model already listed
in raw/ac_codes/brute_force/manifest.json. Used by
app/services/ac_remote_control.py once a brand/model has been confirmed
via the detector, to offer real control (temperature steps, mode, fan)
instead of just replaying the single "on" probe used during detection.

Usage:
    git clone --depth 1 https://github.com/Lucaslhm/Flipper-IRDB.git /tmp/firdb
    python3 backend/scripts/regenerate_full_ac_signals.py /tmp/firdb/ACs

Run backend/scripts/regenerate_brute_force_codes.py FIRST if you're also
refreshing the probe-code manifest -- this script reads that manifest to
know which brand/model files to expand, so it should be run after (or
against a manifest that already reflects) whatever's currently bundled.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "services", "raw", "ac_codes")
MANIFEST_PATH = os.path.join(BASE_DIR, "brute_force", "manifest.json")
OUT_ROOT = os.path.join(BASE_DIR, "full_signals")


def sanitize(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9_.-]+", "_", s.strip())
    return re.sub(r"_+", "_", s).strip("_")


def parse_ir_file(path: str) -> list[dict]:
    entries: list[dict] = []
    cur: dict = {}
    with open(path, "r", errors="ignore") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("name:"):
                if cur.get("name"):
                    entries.append(cur)
                cur = {"name": line.split(":", 1)[1].strip()}
            elif line.startswith("type:"):
                cur["type"] = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                cur["data"] = [int(n) for n in line.split(":", 1)[1].split()]
    if cur.get("name"):
        entries.append(cur)
    return entries


def to_ir_ctl_text(data: list[int]) -> str:
    return " ".join(f"{'+' if i % 2 == 0 else '-'}{n}" for i, n in enumerate(data)) + "\n"


def model_dir_name(brand: str, model: str) -> str:
    return f"{sanitize(brand)}__{sanitize(model)}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", help="Path to Flipper-IRDB's ACs/ directory")
    args = parser.parse_args()

    if not os.path.isdir(args.source):
        sys.exit(f"Not a directory: {args.source}")
    if not os.path.isfile(MANIFEST_PATH):
        sys.exit(f"Missing {MANIFEST_PATH} -- run regenerate_brute_force_codes.py first")

    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    os.makedirs(OUT_ROOT, exist_ok=True)

    done = 0
    total_signals = 0
    skipped: list[tuple[str, str, str]] = []

    for entry in manifest:
        brand, model = entry["brand"], entry["model"]
        src_path = os.path.join(args.source, brand, f"{model}.ir")
        if not os.path.isfile(src_path):
            skipped.append((brand, model, "source file not found"))
            continue

        try:
            parsed = parse_ir_file(src_path)
        except Exception as exc:  # noqa: BLE001
            skipped.append((brand, model, f"parse error: {exc}"))
            continue

        raw_entries = [e for e in parsed if e.get("type") == "raw" and e.get("data")]
        if not raw_entries:
            skipped.append((brand, model, "no raw entries"))
            continue

        model_dir = os.path.join(OUT_ROOT, model_dir_name(brand, model))
        os.makedirs(model_dir, exist_ok=True)

        signals = []
        seen_names: set[str] = set()
        for e in raw_entries:
            file_base = sanitize(e["name"]) or "signal"
            file_name = f"{file_base}.txt"
            n = 2
            while file_name in seen_names:
                file_name = f"{file_base}_{n}.txt"
                n += 1
            seen_names.add(file_name)

            with open(os.path.join(model_dir, file_name), "w") as f:
                f.write(to_ir_ctl_text(e["data"]))

            signals.append({"name": e["name"], "file": file_name})

        with open(os.path.join(model_dir, "signals.json"), "w") as f:
            json.dump({"brand": brand, "model": model, "signals": signals}, f, indent=2)

        done += 1
        total_signals += len(signals)

    print(f"Wrote full signal sets for {done} models ({total_signals} total buttons) to {OUT_ROOT}")
    print(f"Skipped {len(skipped)} models")
    for b, m, reason in skipped:
        print(f"  SKIP {b}/{m}: {reason}")


if __name__ == "__main__":
    main()
