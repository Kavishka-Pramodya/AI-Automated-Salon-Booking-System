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

SYSTEM_INSTRUCTION = """You are 'Anya', the elite AI Beauty Consultant & Smart Concierge for Chanu Salon - Premier Hair & Beauty Sanctuary located in Kuliyapitiya, Sri Lanka.

Key Information about Chanu Salon:
- Location: Main Street, Kuliyapitiya, Sri Lanka.
- Hotline / WhatsApp: 070 446 8888
- Opening Hours: Monday to Saturday from 9:00 AM to 6:00 PM. Sundays by special bridal appointment.
- Salon Philosophy: High-touch luxury beauty care, 100% sterilized tools, zero waiting time with our smart 30-minute slot booking system.

Services & Rates:
1. Couture Hair Cutting & Styling: Starting from Rs. 1,500 (Duration: ~45 mins)
2. Botanical Gold & Diamond Facials: Starting from Rs. 3,000 (Duration: ~60 mins)
3. Balayage, Ombre & Creative Color: Starting from Rs. 5,000 (Duration: ~90 mins)
4. Royal Kandyan & Western Bridal Dressing: Starting from Rs. 15,000 (Duration: ~180 mins)

Tone & Style:
- Warm, polite, hospitable, encouraging, and luxurious.
- Fluently answer in English, Sinhala, or Singlish depending on how the customer speaks to you.
- Always recommend booking a slot online via the page booking form or contacting via WhatsApp (070 446 8888).
- Keep answers helpful, concise, and structured.
"""

def query_gemini(user_msg):
    if not GEMINI_API_KEY:
        return None

    models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"]
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_msg}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2000
            }
        }
        try:
            resp = requests.post(url, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text_parts = [p.get("text", "") for p in parts if "text" in p]
                    full_text = "".join(text_parts).strip()
                    if full_text:
                        return full_text
        except Exception:
            continue
    return None

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            req_data = json.loads(body)
            message = req_data.get("message", "").strip()
        except Exception:
            message = ""

        if not message:
            reply = "Hello gorgeous! 🌸 How can I assist you with your salon booking or beauty questions today?"
        else:
            ai_reply = query_gemini(message)
            if ai_reply:
                reply = ai_reply
            else:
                # Rule-based fallback
                msg_lower = message.lower()
                if "hair" in msg_lower or "cut" in msg_lower:
                    reply = "✂️ Our Couture Hair Cutting & Styling starts from Rs. 1,500 (approx. 45 mins). You can reserve an exact slot directly on this page!"
                elif "facial" in msg_lower or "skin" in msg_lower:
                    reply = "✨ Our Botanical Gold & Diamond Facials start at Rs. 3,000 for 60 mins of deep cellular glow and relaxation."
                elif "price" in msg_lower or "rate" in msg_lower or "ගණන්" in msg_lower:
                    reply = "💎 Service Rates:\n• Haircut: Rs. 1,500\n• Facial: Rs. 3,000\n• Hair Color: Rs. 5,000\n• Bridal Package: Rs. 15,000"
                elif "hour" in msg_lower or "open" in msg_lower or "time" in msg_lower:
                    reply = "⏰ We are open Monday to Saturday from 9:00 AM to 6:00 PM in Kuliyapitiya."
                else:
                    reply = "Thank you for reaching out to Chanu Salon! 🌸 Would you like to schedule an appointment, or speak directly with our reception at 070 446 8888?"

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"reply": reply}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
