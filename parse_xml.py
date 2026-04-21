#!/usr/bin/env python3
"""
parse_xml.py
Parses a channels.xml file and extracts unique site URLs.

Usage:
    python3 parse_xml.py [channels.xml]          # prints sites, one per line
    python3 parse_xml.py [channels.xml] --json   # prints full JSON map

Defaults:
    channels.xml = ./channels.xml
"""

import sys
import json
import xml.etree.ElementTree as ET


def parse_channels(xml_path: str) -> dict[str, list[dict]]:
    """
    Parse channels XML and return a dict keyed by site URL.

    Returns:
        {
            "epg.112114.xyz": [
                {"site_id": "CCTV1", "lang": "zh", "name": "CCTV1"},
                ...
            ],
            ...
        }
    """
    try:
        tree = ET.parse(xml_path)
    except FileNotFoundError:
        print(f"[ERR] File not found: {xml_path}", file=sys.stderr)
        sys.exit(1)
    except ET.ParseError as e:
        print(f"[ERR] XML parse error in {xml_path}: {e}", file=sys.stderr)
        sys.exit(1)

    root = tree.getroot()
    sites: dict[str, list[dict]] = {}

    for ch in root.findall("channel"):
        site    = (ch.get("site")    or "").strip()
        site_id = (ch.get("site_id") or "").strip()
        lang    = (ch.get("lang")    or "zh").strip()
        name    = (ch.text           or site_id).strip()

        if not site or not site_id:
            continue

        sites.setdefault(site, []).append({
            "site_id": site_id,
            "lang":    lang,
            "name":    name,
        })

    return sites


def main() -> None:
    args      = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags     = [a for a in sys.argv[1:] if a.startswith("--")]
    xml_path  = args[0] if args else "channels.xml"
    as_json   = "--json" in flags

    sites = parse_channels(xml_path)

    if not sites:
        print("[WARN] No channels found in XML.", file=sys.stderr)
        sys.exit(0)

    if as_json:
        print(json.dumps(sites, ensure_ascii=False, indent=2))
    else:
        # One site URL per line — easy for shell scripts to consume
        for site in sorted(sites):
            print(site)


if __name__ == "__main__":
    main()