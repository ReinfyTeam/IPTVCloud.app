#!/usr/bin/env python3
"""
split_epg.py

Structure:
./sites/site_url/site.xml

If >1MB:
./sites/site_url/site_part_001.xml
./sites/site_url/site_part_002.xml
...

Deletes original site.xml after successful split.

Usage:
    python split_epg.py ./sites
"""

import sys
import os
import math
import xml.etree.ElementTree as ET
from collections import OrderedDict

LIMIT_MB = 1
LIMIT_BYTES = LIMIT_MB * 1024 * 1024

# ANSI Colors
RESET   = "\033[0m"
RED     = "\033[91m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
BLUE    = "\033[94m"
MAGENTA = "\033[95m"
CYAN    = "\033[96m"
WHITE   = "\033[97m"
BOLD    = "\033[1m"


def c(color, text):
    return f"{color}{text}{RESET}"


def mb(x):
    return round(x / 1024 / 1024, 2)


def count_programmes(xml_file):
    count = 0
    context = ET.iterparse(xml_file, events=("end",))

    for _, elem in context:
        if elem.tag == "programme":
            count += 1
        elem.clear()

    return count


def write_part(index, channels, programmes, folder, site):
    file = os.path.join(folder, f"{site}_part_{index:03d}.xml")

    root = ET.Element("tv")

    for ch in channels.values():
        root.append(ch)

    for prog in programmes:
        root.append(prog)

    ET.ElementTree(root).write(
        file,
        encoding="utf-8",
        xml_declaration=True
    )

    print("   " + c(GREEN, f"✅ Created {os.path.basename(file)}"))


def split_file(xml_file):
    folder = os.path.dirname(xml_file)
    site = os.path.splitext(os.path.basename(xml_file))[0]

    size = os.path.getsize(xml_file)

    if size <= LIMIT_BYTES:
        print(c(YELLOW, f"⏭ Skip {site}.xml ({mb(size)} MB <= 20 MB)"))
        return

    print(c(CYAN, f"🔍 Analyzing {xml_file} ({mb(size)} MB)"))

    total_programmes = count_programmes(xml_file)

    if total_programmes == 0:
        print(c(RED, "❌ No programme entries"))
        return

    parts = math.ceil(size / LIMIT_BYTES)
    chunk = math.ceil(total_programmes / parts)

    print(c(MAGENTA, f"📦 Estimated parts : {parts}"))
    print(c(BLUE,    f"📺 Programmes      : {total_programmes}"))
    print(c(WHITE,   f"✂️  Chunk/file     : {chunk}"))

    channels = OrderedDict()
    programmes = []
    part = 1

    context = ET.iterparse(xml_file, events=("end",))

    for _, elem in context:
        if elem.tag == "channel":
            cid = elem.attrib.get("id")
            if cid and cid not in channels:
                channels[cid] = ET.fromstring(
                    ET.tostring(elem)
                )

        elif elem.tag == "programme":
            programmes.append(
                ET.fromstring(ET.tostring(elem))
            )

            if len(programmes) >= chunk:
                used = OrderedDict()

                for prog in programmes:
                    cid = prog.attrib.get("channel")
                    if cid in channels:
                        used[cid] = channels[cid]

                write_part(part, used, programmes, folder, site)
                programmes.clear()
                part += 1

        elem.clear()

    if programmes:
        used = OrderedDict()

        for prog in programmes:
            cid = prog.attrib.get("channel")
            if cid in channels:
                used[cid] = channels[cid]

        write_part(part, used, programmes, folder, site)

    os.remove(xml_file)

    print(c(YELLOW, f"🗑 Deleted original {site}.xml"))
    print(c(GREEN, f"✅ Finished {site}\n"))


def main():
    if len(sys.argv) != 2:
        print(c(RED, "Usage: python split_epg.py ./sites"))
        sys.exit(1)

    root = sys.argv[1]

    if not os.path.isdir(root):
        print(c(RED, "Invalid directory"))
        sys.exit(1)

    xml_files = []

    for site_dir in sorted(os.listdir(root)):
        full_dir = os.path.join(root, site_dir)

        if not os.path.isdir(full_dir):
            continue

        xml_file = os.path.join(full_dir, f"{site_dir}.xml")

        if os.path.isfile(xml_file):
            xml_files.append(xml_file)

    if not xml_files:
        print(c(RED, "No XML files found"))
        return

    print(c(BOLD + CYAN, f"📂 Found {len(xml_files)} XML files\n"))

    for file in xml_files:
        try:
            split_file(file)
        except Exception as e:
            print(c(RED, f"❌ Failed {file}: {e}\n"))


if __name__ == "__main__":
    main()
