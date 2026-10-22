import os
import sys
from flask import send_from_directory
from api.index import app

PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

@app.route('/')
def index():
    return send_from_directory(PUBLIC_DIR, 'index.html')

@app.route('/admin')
def admin():
    return send_from_directory(PUBLIC_DIR, 'admin.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(PUBLIC_DIR, filename)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    print(f"\n========================================================")
    print(f"[OK] Salon AI CRM Local Server running at http://localhost:{port}")
    print(f"[*] Client Booking Page: http://localhost:{port}/")
    print(f"[*] Cloud CRM Dashboard: http://localhost:{port}/admin (Passcode: chanu2025)")
    print(f"========================================================\n")
    app.run(port=port, debug=False)
