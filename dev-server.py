#!/usr/bin/env python3
"""Local dev server with save endpoint for spin wheel admin."""
import http.server
import json
import os

PORT = 8000
DIR = os.path.dirname(os.path.abspath(__file__))


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save-wheel-config':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                # Validate JSON
                json.loads(body)
                config_path = os.path.join(DIR, 'spin-wheel-config.json')
                with open(config_path, 'wb') as f:
                    f.write(body)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    os.chdir(DIR)
    server = http.server.HTTPServer(('', PORT), DevHandler)
    print(f'Dev server running at http://localhost:{PORT}')
    print(f'Admin panel: http://localhost:{PORT}/admin-wheel')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
