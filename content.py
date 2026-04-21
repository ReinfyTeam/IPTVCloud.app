#!/usr/bin/env python3

"""
content.py
Scans a sites/ directory for <site_name>.xml files and writes content.json.

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
    """Counts occurrences of <programme in the file, even if multiple are on one line."""
    count = 0
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                count += line.count("<programme")
    except Exception as e:
        print(f"[ERR] Could not read {path}: {e}", file=sys.stderr)
    return count


def build_content(base_dir: str, out_file: str) -> None:
    base_dir = os.path.abspath(base_dir)
    out_file = os.path.abspath(out_file)

    if not os.path.isdir(base_dir):
        print(f"[ERR] Directory not found: {base_dir}", file=sys.stderr)
        sys.exit(1)

    entries = []
    # Sort to keep the output consistent
    for site_name in sorted(os.listdir(base_dir)):
        # Skip hidden directories (like .git or .DS_Store)
        if site_name.startswith('.'):
            continue
            
        site_dir   = os.path.join(base_dir, site_name)
        guide_file = os.path.join(site_dir, site_name + ".xml")

        # Only process if it's a directory and contains the expected XML file
        if not os.path.isdir(site_dir) or not os.path.isfile(guide_file):
            continue

        rel_path  = os.path.relpath(guide_file, base_dir)
        size      = os.path.getsize(guide_file)
        progs     = count_programmes(guide_file)
        
        # Get the actual last modified time of the XML file
        mtime = os.path.getmtime(guide_file)
        last_mod = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()

        entries.append({
            "site":        site_name,
            "path":        rel_path,
            "full_path":   guide_file,
            "url":         f"/{rel_path}",
            "size_bytes":  size,
            "programmes":  progs,
            "updated_at":  last_mod,
        })

        print(f"  ✔  {site_name:<40}  {size:>9} bytes  {progs:>5} programmes")

    if not entries:
        print("[WARN] No matching <site_name>.xml files found — content.json will be empty.")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_sites":  len(entries),
        "guides":       entries,
    }

    # Ensure output directory exists and write JSON
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"\n  Wrote {len(entries)} entr{'y' if len(entries) == 1 else 'ies'} → {out_file}")


if __name__ == "__main__":
    # Handle CLI arguments or use defaults
    sites_dir   = sys.argv[1] if len(sys.argv) > 1 else "./sites"
    output_file = sys.argv[2] if len(sys.argv) > 2 else os.path.join(sites_dir, "content.json")
    
    build_content(sites_dir, output_file)
