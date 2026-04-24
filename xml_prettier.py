#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
xml_prettier.py

Pretty-format every XMLTV file under ./sites/<site>/*.xml without
mangling programme content (title / desc / sub-title / category /
icon / rating / credits / dates).

Why a rewrite:
    The previous version used minidom.toprettyxml(), which inserts
    newlines and whitespace inside text-only elements like
    <title lang="en">Some Show</title>, corrupting the rendered
    title and description. ElementTree's ET.indent() (Py 3.9+) only
    indents elements that have children, so text-only leaves are
    left untouched and stay correct.

Features:
✅ Sanitises invalid control chars and bare ampersands
✅ Collapses duplicate XML declarations
✅ Indents using ET.indent (text-only nodes preserved verbatim)
✅ Parallel across files (one process per CPU)
✅ Continues on per-file errors

Usage:
    python xml_prettier.py                # defaults to ./sites
    python xml_prettier.py ./sites
"""

from __future__ import annotations

import os
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
import xml.etree.ElementTree as ET

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"


def log(msg: str, color: str = RESET) -> None:
    now = time.strftime("%H:%M:%S")
    print(f"{color}[{now}] {msg}{RESET}", flush=True)


_INVALID_CHARS = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")
_BARE_AMP = re.compile(r"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)")
_XML_DECL = re.compile(r"^\s*(?:<\?xml[^?]*\?>\s*)+", re.IGNORECASE)


def sanitize(content: str) -> str:
    content = _INVALID_CHARS.sub("", content)
    content = _BARE_AMP.sub("&amp;", content)
    # Drop every leading XML declaration; we re-add a single canonical
    # one when writing.
    content = _XML_DECL.sub("", content, count=1)
    return content.lstrip("\ufeff")


def process_xml(file_path: str) -> tuple[str, str, float]:
    start = time.time()
    p = Path(file_path)

    with open(p, "r", encoding="utf-8", errors="replace") as f:
        raw = f.read()

    cleaned = sanitize(raw)

    try:
        root = ET.fromstring(cleaned)
    except ET.ParseError as e:
        return ("FAIL", f"{file_path} | parse error: {e}", time.time() - start)

    tree = ET.ElementTree(root)
    if hasattr(ET, "indent"):
        # ET.indent only adds whitespace to elements that have child
        # elements — text-only leaves like <title>, <desc>, <category>
        # keep their inner text untouched.
        ET.indent(tree, space="  ")

    tree.write(p, encoding="utf-8", xml_declaration=True)
    return ("OK", str(file_path), time.time() - start)


def main() -> None:
    base = Path(sys.argv[1]) if len(sys.argv) >= 2 else Path("./sites")
    if not base.exists():
        log(f"❌ {base} folder not found", RED)
        sys.exit(1)

    files = sorted(str(p) for p in base.glob("*/*.xml"))
    if not files:
        log("⚠️  No XML files found", YELLOW)
        return

    workers = max(1, (os.cpu_count() or 4))
    log(f"🔍 {len(files)} files | workers {workers}", CYAN)

    start_all = time.time()
    ok = fail = 0

    with ProcessPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(process_xml, f): f for f in files}
        for fut in as_completed(futures):
            try:
                status, msg, elapsed = fut.result()
            except Exception as e:
                fail += 1
                log(f"❌ {futures[fut]} | {e}", RED)
                continue
            if status == "OK":
                ok += 1
                log(f"✅ {msg} ({round(elapsed, 2)}s)", GREEN)
            else:
                fail += 1
                log(msg, RED)

    total_time = round(time.time() - start_all, 2)
    log(f"✨ pretty: ok={ok}  fail={fail}  time={total_time}s", CYAN)


if __name__ == "__main__":
    main()
