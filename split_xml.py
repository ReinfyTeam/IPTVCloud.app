#!/usr/bin/env python3
"""
Split IPTV-Org XMLTV files in a directory. For only larger xml files.

Usage:
python split_epg.py ./sites/

Features:
- Scans ./sites/*.xml
- If file > 1mb => split automatically
- Detects estimated number of output files
- Auto-calculates chunk size
- Keeps XMLTV format
- Low memory streaming parser
"""

import sys
import os
import math
import xml.etree.ElementTree as ET
from collections import OrderedDict

LIMIT_MB = 1
LIMIT_BYTES = LIMIT_MB * 1024 * 1024


def mb(size):
    return round(size / 1024 / 1024, 2)


def count_programmes(xml_file):
    count = 0
    context = ET.iterparse(xml_file, events=("end",))

    for _, elem in context:
        if elem.tag == "programme":
            count += 1
        elem.clear()

    return count


def write_part(index, channels, programmes, out_dir, base):
    filename = os.path.join(
        out_dir,
        f"{base}_part_{index:03d}.xml"
    )

    root = ET.Element("tv")

    for ch in channels.values():
        root.append(ch)

    for prog in programmes:
        root.append(prog)

    ET.ElementTree(root).write(
        filename,
        encoding="utf-8",
        xml_declaration=True
    )

    print(f"   ✅ Created {os.path.basename(filename)}")


def split_file(xml_file):
    size = os.path.getsize(xml_file)
    base = os.path.splitext(os.path.basename(xml_file))[0]

    if size <= LIMIT_BYTES:
        print(f"⏭️  Skip {base}.xml ({mb(size)} MB <= 20 MB)")
        return

    print(f"🔍 Analyzing {base}.xml ({mb(size)} MB)...")

    total_programmes = count_programmes(xml_file)

    if total_programmes == 0:
        print("❌ No programmes found.\n")
        return

    # Estimate split count based on size
    parts = math.ceil(size / LIMIT_BYTES)

    # Programmes per file
    chunk_size = math.ceil(total_programmes / parts)

    print(f"📦 Estimated output files : {parts}")
    print(f"📺 Total programmes      : {total_programmes}")
    print(f"✂️  Chunk size/file      : {chunk_size}")

    out_dir = os.path.join(
        os.path.dirname(xml_file),
        f"{base}_parts"
    )
    os.makedirs(out_dir, exist_ok=True)

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

            if len(programmes) >= chunk_size:
                used = OrderedDict()

                for prog in programmes:
                    cid = prog.attrib.get("channel")
                    if cid in channels:
                        used[cid] = channels[cid]

                write_part(part, used, programmes, out_dir, base)
                programmes.clear()
                part += 1

        elem.clear()

    if programmes:
        used = OrderedDict()

        for prog in programmes:
            cid = prog.attrib.get("channel")
            if cid in channels:
                used[cid] = channels[cid]

        write_part(part, used, programmes, out_dir, base)

    print(f"✅ Finished {base}.xml\n")


def main():
    if len(sys.argv) != 2:
        print("Usage:")
        print("python split_epg.py ./sites/")
        sys.exit(1)

    folder = sys.argv[1]

    if not os.path.isdir(folder):
        print("Invalid directory.")
        sys.exit(1)

    files = sorted([
        os.path.join(folder, f)
        for f in os.listdir(folder)
        if f.lower().endswith(".xml")
    ])

    if not files:
        print("No XML files found.")
        return

    print(f"📂 Found {len(files)} XML files\n")

    for file in files:
        try:
            split_file(file)
        except Exception as e:
            print(f"❌ Failed {os.path.basename(file)}: {e}\n")


if __name__ == "__main__":
    main()
