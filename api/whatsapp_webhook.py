from http.server import BaseHTTPRequestHandler
import json
import os
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

SYSTEM_INSTRUCTION = """You are 'Anya', the WhatsApp AI Assistant for Chanu Salon in Kuliyapitiya, Sri Lanka.
Hotline / WhatsApp: 070 446 8888.
Open Mon-Sat 9AM-6PM.
Services:
1. Haircut: from Rs. 1,500
2. Facial: from Rs. 3,000
3. Hair Color: from Rs. 5,000
4. Bridal Dressing: from Rs. 15,000

Format your replies with WhatsApp-friendly emojis, bold text (*like this*), and polite salon hospitality.
Keep answers brief and actionable.
"""

def query_gemini_wa(user_msg):
    if not GEMINI_API_KEY:
        return "Hello! Thank you for messaging *Chanu Salon*. How can we assist you with your booking today?"
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": [{"role": "user", "parts": [{"text": user_msg}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1000}
    }
    try:
        r = requests.post(url, json=payload, timeout=12)
        if r.status_code == 200:
            return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        pass
    return "Hello! Thank you for contacting *Chanu Salon*. We are open Mon-Sat 9AM-6PM. How may we pamper you today?"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Verification for Meta WhatsApp webhook challenge
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"WhatsApp Webhook Active")

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        # Can receive from Make.com, Twilio, or Meta Cloud API
        sender = data.get("phone") or data.get("from") or data.get("sender") or "WhatsApp User"
        name = data.get("name") or data.get("profile_name") or "Valued Client"
        message = data.get("message") or data.get("body") or data.get("text") or "Hello"

        ai_response = query_gemini_wa(message)

        result = {
            "status": "success",
            "channel": "whatsapp",
            "sender_phone": sender,
            "sender_name": name,
            "customer_inquiry": message,
            "ai_reply": ai_response,
            "lead_ready": True
        }

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
