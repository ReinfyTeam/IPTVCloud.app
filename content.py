#!/usr/bin/env python3

"""
content.py
Scans ./sites and builds content.json

Supports:

1. Normal file
   ./sites/site.xml

2. Split files in same folder
   ./sites/site_part_001.xml
   ./sites/site_part_002.xml

Output:
- Normal guides => url is array with 1 item
- Split guides  => url is array of parts
"""

import sys
import json
import os
import re
from datetime import datetime, timezone


PART_RE = re.compile(r"^(.*?)_part_(\d+)\.xml$", re.IGNORECASE)


def count_programmes(path):
    count = 0
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                count += line.count("<programme")
    except Exception as e:
        print(f"[ERR] {path}: {e}", file=sys.stderr)
    return count


def iso(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def build_content(base_dir, out_file):
    base_dir = os.path.abspath(base_dir)
    out_file = os.path.abspath(out_file)

    if not os.path.isdir(base_dir):
        print("Invalid directory")
        sys.exit(1)

    files = sorted([
        f for f in os.listdir(base_dir)
        if f.lower().endswith(".xml")
    ])

    entries = []
    split_groups = {}
    used_normal = set()

    # ------------------------------------------
    # Detect split files
    # ------------------------------------------
    for file in files:
        m = PART_RE.match(file)
        if m:
            site = m.group(1)
            part = int(m.group(2))

            split_groups.setdefault(site, [])
            split_groups[site].append((part, file))

    # ------------------------------------------
    # Build split entries
    # ------------------------------------------
    for site in sorted(split_groups.keys()):
        parts = sorted(split_groups[site], key=lambda x: x[0])

        urls = []
        paths = []
        full_paths = []

        total_size = 0
        total_prog = 0
        newest = 0

        for _, file in parts:
            fp = os.path.join(base_dir, file)

            urls.append(f"/{file}")
            paths.append(file)
            full_paths.append(fp)

            total_size += os.path.getsize(fp)
            total_prog += count_programmes(fp)
            newest = max(newest, os.path.getmtime(fp))

        entries.append({
            "site": site,
            "path": paths,
            "full_path": full_paths,
            "url": urls,
            "split": True,
            "parts": len(parts),
            "size_bytes": total_size,
            "programmes": total_prog,
            "updated_at": iso(newest)
        })

        used_normal.add(site + ".xml")

        print(f"✔ {site:<35} split ({len(parts)} parts)")

    # ------------------------------------------
    # Build normal entries
    # ------------------------------------------
    for file in files:
        if file in used_normal:
            continue

        if PART_RE.match(file):
            continue

        site = file[:-4]
        fp = os.path.join(base_dir, file)

        size = os.path.getsize(fp)
        progs = count_programmes(fp)
        mtime = os.path.getmtime(fp)

        entries.append({
            "site": site,
            "path": file,
            "full_path": fp,
            "url": [f"/{file}"],
            "split": False,
            "parts": 1,
            "size_bytes": size,
            "programmes": progs,
            "updated_at": iso(mtime)
        })

        print(f"✔ {site:<35} normal")

    entries.sort(key=lambda x: x["site"].lower())

    payload = {
        "generated_at": iso(datetime.now(timezone.utc).timestamp()),
        "total_sites": len(entries),
        "guides": entries
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(entries)} entries -> {out_file}")


if __name__ == "__main__":
    sites_dir = sys.argv[1] if len(sys.argv) > 1 else "./sites"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "./sites/content.json"

    build_content(sites_dir, output_file)
