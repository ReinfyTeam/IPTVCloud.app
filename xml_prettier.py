#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
xml_prettier.py

Fix + Pretty format all XML files inside:

    ./sites/<site_url>/*.xml

Examples:
    ./sites/google.com/site.xml
    ./sites/google.com/part001.xml
    ./sites/test.tv/feed.xml

Features:
✅ Auto scans all sites/*/*.xml
✅ XML fixer before formatting
✅ Pretty indentation
✅ Removes blank lines
✅ Colored logs
✅ Runtime stats
✅ Continues on errors
"""

import re
import time
from pathlib import Path
from xml.dom import minidom
import xml.etree.ElementTree as ET

# ──────────────────────────────────────
# COLORS
# ──────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"

# ──────────────────────────────────────
# LOG
# ──────────────────────────────────────
def log(msg, color=RESET):
    now = time.strftime("%H:%M:%S")
    print(f"{color}[{now}] {msg}{RESET}")

# ──────────────────────────────────────
# FIX XML
# ──────────────────────────────────────
def fix_xml(content: str) -> str:
    # remove invalid chars
    content = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", content)

    # fix bad &
    content = re.sub(
        r"&(?!(amp|lt|gt|quot|apos|#\d+);)",
        "&amp;",
        content
    )

    # remove duplicate xml declaration
    content = re.sub(
        r"(<\?xml.*?\?>)+",
        '<?xml version="1.0" encoding="UTF-8"?>',
        content
    )

    # add declaration if missing
    if not content.strip().startswith("<?xml"):
        content = '<?xml version="1.0" encoding="UTF-8"?>\n' + content

    return content

# ──────────────────────────────────────
# PARSE SAFE
# ──────────────────────────────────────
def parse_safe(text):
    try:
        return ET.fromstring(text)
    except:
        wrapped = f"<root>{text}</root>"
        return ET.fromstring(wrapped)

# ──────────────────────────────────────
# FORMAT FILE
# ──────────────────────────────────────
def process_xml(file_path: Path):
    try:
        start = time.time()

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw = f.read()

        fixed = fix_xml(raw)
        root = parse_safe(fixed)

        xml_bytes = ET.tostring(root, encoding="utf-8")
        pretty = minidom.parseString(xml_bytes).toprettyxml(indent="  ")

        # remove blank lines
        pretty = "\n".join(
            line for line in pretty.splitlines()
            if line.strip()
        )

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(pretty)

        elapsed = round(time.time() - start, 2)

        log(f"✅ {file_path} ({elapsed}s)", GREEN)

    except Exception as e:
        log(f"❌ {file_path} | {e}", RED)

# ──────────────────────────────────────
# MAIN
# ──────────────────────────────────────
def main():
    base = Path("./sites")

    if not base.exists():
        log("❌ ./sites folder not found", RED)
        return

    log("🔍 Scanning ./sites/*/*.xml ...", CYAN)

    files = sorted(base.glob("*/*.xml"))

    total = len(files)
    done = 0

    start_all = time.time()

    for file in files:
        done += 1
        log(f"📄 ({done}/{total}) Processing {file}", YELLOW)
        process_xml(file)

    total_time = round(time.time() - start_all, 2)

    log(f"✨ Finished {done}/{total} XML files in {total_time}s", CYAN)

if __name__ == "__main__":
    main()
