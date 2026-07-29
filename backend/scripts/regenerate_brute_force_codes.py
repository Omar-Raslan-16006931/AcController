#!/usr/bin/env python3
"""
Regenerates app/services/raw/ac_codes/brute_force/ from a local checkout of
Flipper-IRDB (https://github.com/Lucaslhm/Flipper-IRDB, CC0-1.0). Run this to
pick up new brands/models after the upstream database gets more
contributions, or to point at a different/larger IR code database entirely.

Usage:
    git clone --depth 1 https://github.com/Lucaslhm/Flipper-IRDB.git /tmp/firdb
    python3 backend/scripts/regenerate_brute_force_codes.py /tmp/firdb/ACs

This OVERWRITES everything in brute_force/ except NOTICE.md and this
script's own copy. Review `git diff` afterwards before committing — a
dataset update can add, rename, or drop brands, which shifts every
manifest index and therefore any in-progress detect runs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

OUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "app", "services", "raw", "ac_codes", "brute_force"
)

# Signal names preferred, in order, when a model file has more than one raw
# entry — we only need ONE representative "does this brand respond at all"
# probe per model, not every temperature variant.
NAME_PRIORITY = ["power", "cool_2", "cool_24", "cool_23", "cool", "on", "cold"]


def sanitize(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9_.-]+", "_", s.strip())
    return re.sub(r"_+", "_", s).strip("_")


def parse_ir_file(path: str) -> list[dict]:
    """Parses a Flipper .ir file into a list of {name, type, data} entries."""
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


def pick_best(entries: list[dict]) -> dict | None:
    raw_entries = [e for e in entries if e.get("type") == "raw" and e.get("data")]
    if not raw_entries:
        return None
    for kw in NAME_PRIORITY:
        for e in raw_entries:
            if kw in e["name"].lower():
                return e
    return raw_entries[0]


def to_ir_ctl_text(data: list[int]) -> str:
    return " ".join(f"{'+' if i % 2 == 0 else '-'}{n}" for i, n in enumerate(data)) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", help="Path to Flipper-IRDB's ACs/ directory (or any Device Type > Brand > Model.ir tree)")
    args = parser.parse_args()

    if not os.path.isdir(args.source):
        sys.exit(f"Not a directory: {args.source}")

    os.makedirs(OUT_DIR, exist_ok=True)
    for existing in os.listdir(OUT_DIR):
        if existing not in ("NOTICE.md",):
            os.remove(os.path.join(OUT_DIR, existing))

    manifest = []
    skipped = []
    seen_names: set[str] = set()
    idx = 0

    for brand in sorted(os.listdir(args.source)):
        brand_dir = os.path.join(args.source, brand)
        if not os.path.isdir(brand_dir):
            continue
        for fname in sorted(os.listdir(brand_dir)):
            if not fname.lower().endswith(".ir"):
                continue
            path = os.path.join(brand_dir, fname)
            try:
                entries = parse_ir_file(path)
            except Exception as exc:  # noqa: BLE001
                skipped.append((brand, fname, f"parse error: {exc}"))
                continue

            best = pick_best(entries)
            if not best:
                skipped.append((brand, fname, "no raw entries (parsed/scancode-only)"))
                continue

            model = os.path.splitext(fname)[0]
            out_name = f"{sanitize(brand)}__{sanitize(model)}.txt"
            n = 2
            while out_name in seen_names:
                out_name = f"{sanitize(brand)}__{sanitize(model)}_{n}.txt"
                n += 1
            seen_names.add(out_name)

            with open(os.path.join(OUT_DIR, out_name), "w") as f:
                f.write(to_ir_ctl_text(best["data"]))

            manifest.append(
                {"index": idx, "brand": brand, "model": model, "signal": best["name"], "file": out_name}
            )
            idx += 1

    with open(os.path.join(OUT_DIR, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Wrote {len(manifest)} codes to {OUT_DIR}")
    print(f"Skipped {len(skipped)} files with no usable raw entry")
    for b, fn, reason in skipped:
        print(f"  SKIP {b}/{fn}: {reason}")


if __name__ == "__main__":
    main()
