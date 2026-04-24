#!/usr/bin/env python3
"""Simple static file server for IPTVCloud.app EPG content.

Serves the EPG content (content.json, sites/*.xml) over HTTP with
permissive CORS headers so IPTV players and XMLTV consumers can fetch
the data cross-origin, mirroring the GitHub Pages hosting setup.
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "5000"))
HOST = os.environ.get("HOST", "0.0.0.0")


class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))
        sys.stdout.flush()


def main():
    handler = CORSRequestHandler
    with ThreadingHTTPServer((HOST, PORT), handler) as httpd:
        print(f"Serving IPTVCloud.app EPG content on http://{HOST}:{PORT}")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Shutting down.")


if __name__ == "__main__":
    main()
