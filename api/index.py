from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import re
import requests
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "salon-automation-48fa6")
FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "")

SALON_CHAT_PROMPT = """You are 'Anya', the elite AI Beauty Consultant & Smart Concierge for Chanu Salon - Premier Hair & Beauty Sanctuary located in Kuliyapitiya, Sri Lanka.

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

WHATSAPP_PROMPT = """You are 'Anya', the WhatsApp AI Assistant for Chanu Salon in Kuliyapitiya, Sri Lanka.
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

def query_gemini(user_msg, prompt=SALON_CHAT_PROMPT):
    if not GEMINI_API_KEY:
        return None
    models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"]
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "system_instruction": {"parts": [{"text": prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_msg}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1000}
        }
        try:
            resp = requests.post(url, json=payload, timeout=10)
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

def save_lead_to_firestore(channel, customer_name, customer_phone, service, inquiry_text, price=0):
    if not FIREBASE_PROJECT_ID or not FIREBASE_API_KEY:
        return False
    url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/appointments?key={FIREBASE_API_KEY}"
    now = datetime.now()
    payload = {
        "fields": {
            "channel": {"stringValue": str(channel or "website")},
            "customerName": {"stringValue": str(customer_name or "Valued Client")},
            "customerPhone": {"stringValue": str(customer_phone or "")},
            "service": {"stringValue": str(service or "Consultation Inquiry")},
            "bookingDate": {"stringValue": now.strftime("%Y-%m-%d")},
            "bookingTime": {"stringValue": now.strftime("%H:%M")},
            "price": {"integerValue": str(int(price or 0))},
            "status": {"stringValue": "Pending"},
            "duration": {"integerValue": "30"},
            "inquiry": {"stringValue": str(inquiry_text or "")},
            "createdAt": {"stringValue": now.isoformat()}
        }
    }
    try:
        resp = requests.post(url, json=payload, timeout=8)
        return resp.status_code == 200
    except Exception as e:
        print(f"Error saving lead to Firestore: {e}")
        return False

def handle_config():
    config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY", ""),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.environ.get("FIREBASE_APP_ID", ""),
        "measurementId": os.environ.get("FIREBASE_MEASUREMENT_ID", "")
    }
    return jsonify(config)

def handle_chat():
    req_data = request.get_json(silent=True) or {}
    message = req_data.get("message", "").strip()
    user_name = req_data.get("name", "").strip() or req_data.get("customerName", "Website Visitor")
    user_phone = req_data.get("phone", "").strip() or req_data.get("customerPhone", "")
    is_lead = req_data.get("is_lead", False)

    if not message:
        return jsonify({"reply": "Hello gorgeous! 🌸 How can I assist you with your salon booking or beauty questions today?"})

    # Check for phone number pattern in message if not provided
    if not user_phone:
        phone_match = re.search(r'(07\d{8}|\+94\d{9})', message)
        if phone_match:
            user_phone = phone_match.group(1)
            is_lead = True

    # If identified as lead or booking inquiry with contact, record to Firestore
    if is_lead or user_phone:
        save_lead_to_firestore(
            channel="website",
            customer_name=user_name,
            customer_phone=user_phone,
            service="Website AI Chatbot Inquiry",
            inquiry_text=message
        )

    ai_reply = query_gemini(message, SALON_CHAT_PROMPT)
    if not ai_reply:
        msg_lower = message.lower()
        if "hair" in msg_lower or "cut" in msg_lower:
            ai_reply = "✂️ Our Couture Hair Cutting & Styling starts from Rs. 1,500 (approx. 45 mins). You can reserve an exact slot directly on this page!"
        elif "facial" in msg_lower or "skin" in msg_lower:
            ai_reply = "✨ Our Botanical Gold & Diamond Facials start at Rs. 3,000 for 60 mins of deep cellular glow and relaxation."
        elif "price" in msg_lower or "rate" in msg_lower or "ගණන්" in msg_lower:
            ai_reply = "💎 Service Rates:\n• Haircut: Rs. 1,500\n• Facial: Rs. 3,000\n• Hair Color: Rs. 5,000\n• Bridal Package: Rs. 15,000"
        elif "hour" in msg_lower or "open" in msg_lower or "time" in msg_lower:
            ai_reply = "⏰ We are open Monday to Saturday from 9:00 AM to 6:00 PM in Kuliyapitiya."
        else:
            ai_reply = "Thank you for reaching out to Chanu Salon! 🌸 Would you like to schedule an appointment, or speak directly with our reception at 070 446 8888?"

    return jsonify({
        "reply": ai_reply,
        "lead_saved": bool(is_lead or user_phone)
    })

def handle_whatsapp():
    if request.method == 'GET':
        hub_mode = request.args.get('hub.mode')
        hub_challenge = request.args.get('hub.challenge')
        if hub_mode and hub_challenge:
            return hub_challenge, 200
        return "WhatsApp Webhook Active", 200

    data = request.get_json(silent=True) or {}
    sender = ""
    name = ""
    message = ""

    # 1. Check for Meta webhook nested structure
    try:
        entries = data.get("entry", [])
        if entries and isinstance(entries, list):
            changes = entries[0].get("changes", [])
            if changes:
                val = changes[0].get("value", {})
                msgs = val.get("messages", [])
                if msgs:
                    sender = msgs[0].get("from", "")
                    text_obj = msgs[0].get("text", {})
                    message = text_obj.get("body", "")
                contacts = val.get("contacts", [])
                if contacts:
                    profile = contacts[0].get("profile", {})
                    name = profile.get("name", "")
    except Exception:
        pass

    # 2. Fallback to direct keys
    if not sender:
        sender = data.get("sender") or data.get("phone") or data.get("from") or "0781468988"
    if not name:
        name = data.get("sender_name") or data.get("name") or data.get("profile_name") or "WhatsApp Client"
    if not message:
        message = data.get("message") or data.get("body") or data.get("text") or "Hello"

    # Automatically save lead to Cloud Firestore
    lead_saved = save_lead_to_firestore(
        channel="whatsapp",
        customer_name=name,
        customer_phone=sender,
        service="WhatsApp Consultation / Lead",
        inquiry_text=message
    )

    ai_response = query_gemini(message, WHATSAPP_PROMPT)
    if not ai_response:
        ai_response = f"Hello {name}! 🌸 Thank you for messaging *Chanu Salon*. We are open Mon-Sat 9AM-6PM in Kuliyapitiya. How may we pamper you today?"

    result = {
        "status": "success",
        "success": True,
        "reply": ai_response,
        "ai_reply": ai_response,
        "channel": "whatsapp",
        "sender": sender,
        "sender_phone": sender,
        "sender_name": name,
        "customer_inquiry": message,
        "lead_saved_to_crm": lead_saved
    }
    return jsonify(result)

# Dedicated lead submission endpoint
def handle_lead_submission():
    req_data = request.get_json(silent=True) or {}
    channel = req_data.get("channel", "website")
    name = req_data.get("name") or req_data.get("customerName", "VIP Lead")
    phone = req_data.get("phone") or req_data.get("customerPhone", "")
    service = req_data.get("service", "General Inquiry")
    message = req_data.get("message") or req_data.get("inquiry", "")
    price = req_data.get("price", 0)

    saved = save_lead_to_firestore(channel, name, phone, service, message, price)
    return jsonify({"success": saved, "message": "Lead recorded successfully in Cloud CRM"})

# Catch-all and smart route dispatcher
@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'OPTIONS'])
@app.route('/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def dispatch(path):
    action = request.args.get('action', '').lower().strip()
    req_full = request.path.lower().strip()
    target = f"{action} {req_full} {path.lower().strip()}"

    if 'config' in target:
        return handle_config()
    elif 'lead' in target:
        return handle_lead_submission()
    elif 'chat' in target:
        return handle_chat()
    elif 'whatsapp' in target:
        return handle_whatsapp()
    else:
        return jsonify({"status": "ok", "service": "Chanu Salon Serverless API", "active": True})

handler = app

if __name__ == '__main__':
    app.run(port=5000, debug=True)
