#!/usr/bin/env python3

"""
content.py
Scans a sites/ directory for guides.xml files and writes content.json.

Usage:
    python3 content.py [sites_dir] [output_file]

Defaults:
    sites_dir   = ./sites
    output_file = ./sites/content.json
"""

import sys
import json
import os
from datetime import datetime, timezone


def count_programmes(path: str) -> int:
    count = 0
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if "<programme" in line:
                count += 1
    return count


def build_content(base_dir: str, out_file: str) -> None:
    base_dir = os.path.abspath(base_dir)
    out_file = os.path.abspath(out_file)

    if not os.path.isdir(base_dir):
        print(f"[ERR] Directory not found: {base_dir}", file=sys.stderr)
        sys.exit(1)

    # Walk sites/<site_url>/guides.xml
    entries = []
    for site_name in sorted(os.listdir(base_dir)):
        site_dir   = os.path.join(base_dir, site_name)
        guide_file = os.path.join(site_dir, "guides.xml")

        if not os.path.isdir(site_dir) or not os.path.isfile(guide_file):
            continue

        rel_path  = os.path.relpath(guide_file, base_dir)
        size      = os.path.getsize(guide_file)
        progs     = count_programmes(guide_file)

        entries.append({
            "site":        site_name,
            "path":        rel_path,
            "full_path":   guide_file,
            "url":         f"/{rel_path}",
            "size_bytes":  size,
            "programmes":  progs,
            "updated_at":  datetime.now(timezone.utc).isoformat(),
        })

        print(f"  ✔  {site_name:<40}  {size:>9} bytes  {progs:>5} programmes")

    if not entries:
        print("[WARN] No guides.xml files found — content.json will be empty.")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_sites":  len(entries),
        "guides":       entries,
    }

    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"\n  Wrote {len(entries)} entr{'y' if len(entries) == 1 else 'ies'} → {out_file}")


if __name__ == "__main__":
    sites_dir   = sys.argv[1] if len(sys.argv) > 1 else "./sites"
    output_file = sys.argv[2] if len(sys.argv) > 2 else os.path.join(sites_dir, "content.json")
    build_content(sites_dir, output_file)