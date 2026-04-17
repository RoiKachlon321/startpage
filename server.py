#!/usr/bin/env python3
import json
import os
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("PORT", 7777))
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", "startpage", "browser")
ICON_DIR = os.path.join(DIR, "icons")
os.makedirs(ICON_DIR, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        path = urlparse(self.path).path
        if path.endswith(".html") or path == "/":
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/favicon":
            self.handle_favicon(parsed)
            return
        super().do_GET()

    def handle_favicon(self, parsed):
        params = parse_qs(parsed.query)
        domain = params.get("domain", [""])[0]
        if not domain:
            self.send_response(400)
            self.end_headers()
            return

        cached = os.path.join(ICON_DIR, domain + ".png")
        if os.path.exists(cached):
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Cache-Control", "public, max-age=604800")
            self.end_headers()
            with open(cached, "rb") as f:
                self.wfile.write(f.read())
            return

        try:
            url = f"https://www.google.com/s2/favicons?domain={domain}&sz=32"
            req = urllib.request.urlopen(url, timeout=3)
            data = req.read()
            with open(cached, "wb") as f:
                f.write(data)
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Cache-Control", "public, max-age=604800")
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            self.send_response(502)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/bookmarks":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                with open(os.path.join(DIR, "bookmarks.json"), "w") as f:
                    json.dump(data, f, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    print(f"Startpage serving on http://localhost:{PORT}")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
