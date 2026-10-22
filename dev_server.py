"""
Local Development Server for Salon AI CRM
Simulates Vercel routing locally on port 5000:
- Serves static assets from public/
- Routes /api/* to Python handlers in api/
- Loads environment variables from .env
"""

import os
import sys
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

# Add current directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))
    print("[OK] Loaded .env environment variables.")
except Exception:
    pass

# Import handlers
import api.config as config_mod
import api.chat as chat_mod
import api.whatsapp_webhook as wa_mod

PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

class LocalVercelHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/config':
            return config_mod.handler.do_GET(self)
        elif path == '/api/chat':
            return chat_mod.handler.do_GET(self) if hasattr(chat_mod.handler, 'do_GET') else super().do_GET()
        elif path == '/api/whatsapp_webhook':
            return wa_mod.handler.do_GET(self)
        elif path == '/' or path == '/index':
            self.path = '/index.html'
        elif path == '/admin':
            self.path = '/admin.html'

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/chat':
            return chat_mod.handler.do_POST(self)
        elif path == '/api/whatsapp_webhook':
            return wa_mod.handler.do_POST(self)

        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run(port=5000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, LocalVercelHandler)
    print(f"\n========================================================")
    print(f"[OK] Salon AI CRM Local Server running at http://localhost:{port}")
    print(f"[*] Client Booking Page: http://localhost:{port}/")
    print(f"[*] Cloud CRM Dashboard: http://localhost:{port}/admin (Passcode: chanu2025)")
    print(f"========================================================\n")
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    run(port)
