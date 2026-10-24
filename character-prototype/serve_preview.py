"""Loopback-only preview server with a single local recording output."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse

BASE = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE / 'preview'), **kwargs)

    def do_POST(self):
        if self.path != '/capture' or self.headers.get('Origin') != f'http://127.0.0.1:{self.server.server_port}':
            self.send_error(403)
            return
        length = int(self.headers.get('Content-Length', '0'))
        if not 1000 <= length <= 64 * 1024 * 1024 or not self.headers.get('Content-Type', '').startswith('video/webm'):
            self.send_error(400)
            return
        data = self.rfile.read(length)
        if data[:4] != b'\x1a\x45\xdf\xa3':
            self.send_error(400)
            return
        output = BASE / 'artifacts' / 'motion-preview-v1.webm'
        output.parent.mkdir(exist_ok=True)
        output.write_bytes(data)
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(str(output).encode('utf-8'))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8643)
    arguments = parser.parse_args()
    ThreadingHTTPServer(('127.0.0.1', arguments.port), Handler).serve_forever()
