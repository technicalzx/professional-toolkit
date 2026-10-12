"""Local development server. Bind to loopback; not a production server."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
from app.tools import calculate, audit

ROOT = Path(__file__).parent


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, body, content_type="application/json"):
        raw = body.encode() if isinstance(body, str) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/":
            self.respond(200, (ROOT / "app/index.html").read_text(), "text/html; charset=utf-8")
        elif self.path == "/health":
            self.respond(200, {"status": "ok", "mode": "local-development"})
        else:
            self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.respond(415, {"error": "Use application/json"})
        origin = self.headers.get("Origin")
        if origin and origin not in ("http://127.0.0.1:8000", "http://localhost:8000"):
            return self.respond(403, {"error": "Origin not allowed"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 65536:
                return self.respond(413, {"error": "Request must be 1–65536 bytes"})
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError("Expected a JSON object")
            if self.path == "/api/audit":
                result = audit(data)
            elif self.path.startswith("/api/calculate/"):
                result = calculate(self.path.rsplit("/", 1)[1], data)
            else:
                return self.respond(404, {"error": "Not found"})
            self.respond(200, result)
        except (ValueError, TypeError, AttributeError, KeyError):
            self.respond(400, {"error": "Invalid input. Check the numbers and required fields."})


if __name__ == "__main__":
    print("Professional Toolkit: http://127.0.0.1:8000")
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
