#!/usr/bin/env python3
"""
split_xml.py

Splits oversized XMLTV files into ~1 MB parts while preserving every
programme's title, description, timing attributes, icons, ratings,
categories, etc.

Structure:
    ./sites/<site>/<site>.xml

If larger than LIMIT_MB, becomes:
    ./sites/<site>/<site>_part_001.xml
    ./sites/<site>/<site>_part_002.xml
    ...

The original <site>.xml is removed only after every part is written
successfully. Each part keeps its own <?xml ... ?> declaration and a
<tv> root with the channel definitions referenced by the programmes
in that part.

Usage:
    python split_xml.py ./sites
    python split_xml.py ./sites 2          # custom MB limit
"""

from __future__ import annotations

import math
import os
import sys
import time
import copy
from collections import OrderedDict
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
import xml.etree.ElementTree as ET

DEFAULT_LIMIT_MB = 1

RESET = "\033[0m"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
CYAN = "\033[96m"
WHITE = "\033[97m"
BOLD = "\033[1m"


def c(color: str, text: str) -> str:
    return f"{color}{text}{RESET}"


def mb(x: int) -> float:
    return round(x / 1024 / 1024, 3)


def write_part(
    index: int,
    channels: "OrderedDict[str, ET.Element]",
    programmes: list,
    folder: str,
    site: str,
    tv_attrib: dict,
) -> str:
    file = os.path.join(folder, f"{site}_part_{index:03d}.xml")

    root = ET.Element("tv", attrib=tv_attrib)
    for ch in channels.values():
        root.append(copy.deepcopy(ch))
    for prog in programmes:
        root.append(prog)

    tree = ET.ElementTree(root)
    if hasattr(ET, "indent"):
        ET.indent(tree, space="  ")
    tree.write(file, encoding="utf-8", xml_declaration=True)
    return file


def split_file(xml_file: str, limit_bytes: int) -> tuple[str, str]:
    """Returns (status, message) for the given file."""
    folder = os.path.dirname(xml_file)
    site = os.path.splitext(os.path.basename(xml_file))[0]

    size = os.path.getsize(xml_file)
    if size <= limit_bytes:
        return ("SKIP", f"{site}.xml ({mb(size)} MB)")

    # Full DOM parse — XMLTV files we split are at most a handful of MB,
    # and full parse keeps every child element's text intact (iterparse
    # + clear() was wiping <title>, <desc>, etc. before the parent
    # <programme> end event fired).
    tree = ET.parse(xml_file)
    root = tree.getroot()
    tv_attrib = dict(root.attrib)

    channels: "OrderedDict[str, ET.Element]" = OrderedDict()
    for ch in root.findall("channel"):
        cid = ch.get("id")
        if cid and cid not in channels:
            channels[cid] = ch

    programmes = root.findall("programme")
    total_programmes = len(programmes)
    if total_programmes == 0:
        return ("EMPTY", f"{site}.xml has no <programme> entries")

    parts = max(1, math.ceil(size / limit_bytes))
    chunk = max(1, math.ceil(total_programmes / parts))

    written: list[str] = []
    part = 1
    buf: list[ET.Element] = []
    used: "OrderedDict[str, ET.Element]" = OrderedDict()

    def flush() -> None:
        nonlocal part, buf, used
        if not buf:
            return
        # Always include channels referenced by the buffered programmes.
        for prog in buf:
            cid = prog.attrib.get("channel")
            if cid and cid in channels and cid not in used:
                used[cid] = channels[cid]
        # Fall back: if a part somehow has no referenced channels (e.g.
        # programme references missing from the channel list), still
        # ship every channel so the part stays a valid XMLTV doc.
        out_channels = used if used else channels
        f = write_part(part, out_channels, buf, folder, site, tv_attrib)
        written.append(f)
        part += 1
        buf = []
        used = OrderedDict()

    for prog in programmes:
        buf.append(prog)
        if len(buf) >= chunk:
            flush()
    flush()

    # Only delete the original after every part landed on disk.
    if written and all(os.path.isfile(p) for p in written):
        os.remove(xml_file)
        return (
            "OK",
            f"{site}: {len(written)} parts, {total_programmes} programmes, {mb(size)} MB",
        )
    return ("FAIL", f"{site}: split produced no parts")


def collect_xml_files(root: str) -> list[str]:
    files: list[str] = []
    for site_dir in sorted(os.listdir(root)):
        full_dir = os.path.join(root, site_dir)
        if not os.path.isdir(full_dir):
            continue
        candidate = os.path.join(full_dir, f"{site_dir}.xml")
        if os.path.isfile(candidate):
            files.append(candidate)
    return files


def main() -> None:
    if len(sys.argv) < 2:
        print(c(RED, "Usage: python split_xml.py ./sites [limit_mb]"))
        sys.exit(1)

    root = sys.argv[1]
    limit_mb = float(sys.argv[2]) if len(sys.argv) >= 3 else DEFAULT_LIMIT_MB
    limit_bytes = int(limit_mb * 1024 * 1024)

    if not os.path.isdir(root):
        print(c(RED, f"Invalid directory: {root}"))
        sys.exit(1)

    files = collect_xml_files(root)
    if not files:
        print(c(YELLOW, "No <site>/<site>.xml files found."))
        return

    print(c(BOLD + CYAN, f"📂 {len(files)} files | limit {limit_mb} MB | "
                         f"workers {os.cpu_count()}"))

    start = time.time()
    ok = skip = empty = fail = 0

    workers = max(1, (os.cpu_count() or 4))
    with ProcessPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(split_file, f, limit_bytes): f for f in files}
        for fut in as_completed(futures):
            file = futures[fut]
            try:
                status, msg = fut.result()
            except Exception as e:
                fail += 1
                print(c(RED, f"❌ {file}: {e}"))
                continue
            if status == "OK":
                ok += 1
                print(c(GREEN, f"✅ {msg}"))
            elif status == "SKIP":
                skip += 1
                print(c(YELLOW, f"⏭  Skip {msg}"))
            elif status == "EMPTY":
                empty += 1
                print(c(YELLOW, f"⚠️  {msg}"))
            else:
                fail += 1
                print(c(RED, f"❌ {msg}"))

    elapsed = round(time.time() - start, 2)
    print()
    print(c(CYAN, f"split:  ok={ok}  skip={skip}  empty={empty}  fail={fail}  "
                  f"time={elapsed}s"))


if __name__ == "__main__":
    main()
