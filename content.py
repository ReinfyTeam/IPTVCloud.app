#!/usr/bin/env python3

"""
content.py

Standalone script that scans ./sites and generates content.json

Supported structure:

Normal:
./sites/site_name/site_name.xml

Split:
./sites/site_name/site_name_part_001.xml
./sites/site_name/site_name_part_002.xml

Usage:
    python content.py
    python content.py ./sites
    python content.py ./sites ./sites/content.json
"""

import sys
import json
import os
import re
from datetime import datetime, timezone

# ==========================================
# COLORS
# ==========================================
RESET = "\033[0m"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
CYAN = "\033[96m"
WHITE = "\033[97m"
BOLD = "\033[1m"


def color(c, text):
    return f"{c}{text}{RESET}"


PART_RE = re.compile(r"^(.*?)_part_(\d+)\.xml$", re.IGNORECASE)


def iso(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def count_programmes(path):
    count = 0
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                count += line.count("<programme")
    except Exception as e:
        print(color(RED, f"❌ Failed reading {path}: {e}"))
    return count


def scan_site(site_dir, site_name):
    files = sorted([
        f for f in os.listdir(site_dir)
        if f.lower().endswith(".xml")
    ])

    split_files = []
    normal_file = f"{site_name}.xml"

    for file in files:
        if PART_RE.match(file):
            split_files.append(file)

    # ----------------------------------
    # SPLIT MODE
    # ----------------------------------
    if split_files:
        urls = []
        paths = []
        full_paths = []

        total_size = 0
        total_prog = 0
        newest = 0

        split_files = sorted(split_files)

        for file in split_files:
            fp = os.path.join(site_dir, file)

            urls.append(f"/{site_name}/{file}")
            paths.append(f"{site_name}/{file}")
            full_paths.append(fp)

            total_size += os.path.getsize(fp)
            total_prog += count_programmes(fp)
            newest = max(newest, os.path.getmtime(fp))

        print(
            color(GREEN, "✔")
            + f" {site_name:<35}"
            + color(CYAN, f" split ({len(split_files)} parts)")
        )

        return {
            "site": site_name,
            "path": paths,
            "full_path": full_paths,
            "url": urls,
            "split": True,
            "parts": len(split_files),
            "size_bytes": total_size,
            "programmes": total_prog,
            "updated_at": iso(newest)
        }

    # ----------------------------------
    # NORMAL MODE
    # ----------------------------------
    if normal_file in files:
        fp = os.path.join(site_dir, normal_file)

        size = os.path.getsize(fp)
        progs = count_programmes(fp)
        mtime = os.path.getmtime(fp)

        print(
            color(GREEN, "✔")
            + f" {site_name:<35}"
            + color(YELLOW, " normal")
        )

        return {
            "site": site_name,
            "path": f"{site_name}/{normal_file}",
            "full_path": fp,
            "url": [f"/{site_name}/{normal_file}"],
            "split": False,
            "parts": 1,
            "size_bytes": size,
            "programmes": progs,
            "updated_at": iso(mtime)
        }

    print(color(YELLOW, f"⚠ Skipped {site_name} (no XML found)"))
    return None


def build_content(base_dir, out_file):
    base_dir = os.path.abspath(base_dir)
    out_file = os.path.abspath(out_file)

    if not os.path.isdir(base_dir):
        print(color(RED, f"❌ Directory not found: {base_dir}"))
        sys.exit(1)

    entries = []

    folders = sorted([
        d for d in os.listdir(base_dir)
        if os.path.isdir(os.path.join(base_dir, d))
    ])

    print(color(BOLD + CYAN, f"📂 Found {len(folders)} site folders\n"))

    for folder in folders:
        site_path = os.path.join(base_dir, folder)

        try:
            result = scan_site(site_path, folder)
            if result:
                entries.append(result)
        except Exception as e:
            print(color(RED, f"❌ Failed {folder}: {e}"))

    entries.sort(key=lambda x: x["site"].lower())

    payload = {
        "generated_at": iso(datetime.now(timezone.utc).timestamp()),
        "total_sites": len(entries),
        "guides": entries
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print()
    print(color(BOLD + GREEN, f"✅ content.json generated"))
    print(color(BLUE, f"📄 Output: {out_file}"))
    print(color(MAGENTA, f"📦 Total sites: {len(entries)}"))


def main():
    sites_dir = sys.argv[1] if len(sys.argv) > 1 else "./sites"
    output = sys.argv[2] if len(sys.argv) > 2 else os.path.join(sites_dir, "content.json")

    build_content(sites_dir, output)


if __name__ == "__main__":
    main()
