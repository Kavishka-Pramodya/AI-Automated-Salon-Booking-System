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

# ==============================================================================
# SALESFORCE AGENTFORCE-INSPIRED SYSTEM PROMPT (THE REFLEXES & GROUNDING)
# 1. Job: Autonomous Luxury Beauty Concierge & Appointment Coordinator
# 2. Knowledge: Live Chanu Salon services, pricing, schedule & guidelines
# 3. Actions: Slot booking, inquiry capture, pricing guidance, escalation hand-off
# 4. Guardrails: No fabricated slots, no arbitrary discounts, zero data leaks
# 5. Hand-off: Automatic escalation to salon manager if dissatisfied or angry
# ==============================================================================

SALON_AGENT_PROMPT = """You are 'Anya', the autonomous AI Beauty Concierge & Client Relationship Agent for Chanu Salon - Premier Luxury Hair & Beauty Sanctuary located in Kuliyapitiya, Sri Lanka.

[JOB]
Your mission is to welcome clients warmly, recommend tailored hair, skin, and bridal treatments, provide transparent pricing, assist with smart slot bookings, and resolve customer inquiries with grace.

[GROUNDED SALON KNOWLEDGE]
- Brand: Chanu Salon (Luxury Hair, Skin & Bridal Sanctuary)
- Location: Main Street, Kuliyapitiya, Sri Lanka.
- Hotline / WhatsApp: 070 446 8888
- Hours: Monday to Saturday from 9:00 AM to 6:00 PM. Sundays by prior bridal appointment.
- Sanitation: 100% sterilized instruments, private styling bays, zero waiting time with smart 30-minute booking slots.

[VERIFIED SERVICES & PRICING]
1. Couture Hair Cutting & Styling: Rs. 1,500+ (Duration: ~45 mins)
2. Botanical Gold & Diamond Facials: Rs. 3,000+ (Duration: ~60 mins)
3. Balayage, Ombre & Creative Color: Rs. 5,000+ (Duration: ~90 mins)
4. Royal Kandyan & Western Bridal Dressing: Rs. 15,000+ (Duration: ~180 mins)
5. Keratin & Hair Botox Therapy: Rs. 7,500+ (Duration: ~120 mins)
6. Luxury Manicure & Pedicure Spa: Rs. 2,500+ (Duration: ~45 mins)

[GUARDRAILS]
- Never promise appointments outside operating hours (9:00 AM - 6:00 PM).
- Never offer arbitrary discounts without manager approval.
- Never share details or contact information of other salon clients.
- If unsure about specific medical skin conditions, advise booking a physical consultation with our senior stylist.

[HUMAN HAND-OFF (ESCALATION)]
- If the client expresses frustration, reports a bad experience, requests a refund, or asks to speak with the manager, respond with genuine empathy, reassure them, and explain that you are escalating this directly to our Salon Director for immediate personal attention.

[TONE & LANGUAGE]
- Luxurious, warm, polite, and encouraging.
- Fluently reply in English, Sinhala, or Singlish matching the client's language.
"""

WHATSAPP_AGENT_PROMPT = """You are 'Anya', the autonomous WhatsApp AI Agent for Chanu Salon in Kuliyapitiya, Sri Lanka.
Hotline / WhatsApp: 070 446 8888.
Open Mon-Sat 9AM-6PM.
Services:
1. Haircut: from Rs. 1,500
2. Facial: from Rs. 3,000
3. Hair Color: from Rs. 5,000
4. Bridal Dressing: from Rs. 15,000
5. Keratin Therapy: from Rs. 7,500

Rules:
- Format replies with elegant emojis, bold text (*like this*), and concise bullet points.
- If a customer is unhappy or requests a refund, express empathy and state that the Salon Manager has been alerted to call them.
- Always offer to confirm a 30-minute slot or call reception.
"""

# ==============================================================================
# DATA QUALITY UTILITIES (THE SENSES - 5 QUALITY CHECKS)
# Complete, Accurate, Consistent, Timely, Unique
# ==============================================================================

def normalize_phone(raw_phone):
    """Sanitizes and formats phone numbers to standard 10-digit Sri Lankan format."""
    if not raw_phone:
        return ""
    digits = re.sub(r'[^0-9]', '', str(raw_phone))
    if digits.startswith('94') and len(digits) == 11:
        digits = '0' + digits[2:]
    elif digits.startswith('7') and len(digits) == 9:
        digits = '0' + digits
    return digits

def is_valid_sl_phone(phone):
    """Validates if phone is a valid Sri Lankan mobile number."""
    clean = normalize_phone(phone)
    return bool(re.match(r'^07[0-9]{8}$', clean))

def detect_escalation(text):
    """Detects negative sentiment or human escalation triggers (Agentforce Reflexes)."""
    if not text:
        return False, ""
    text_lower = text.lower()
    escalation_keywords = [
        "complaint", "upset", "angry", "terrible", "bad service", "ruined", 
        "refund", "cheated", "speak with manager", "talk to manager", "call manager", 
        "director", "disappointed", "poor experience", "damaged my hair", 
        "horrible", "waste of money", "call me immediately", "sathiyak giya", 
        "katha karanna ona", "naduwak", "palaweni wathawa nemei"
    ]
    for kw in escalation_keywords:
        if kw in text_lower:
            return True, f"Triggered keyword: '{kw}'"
    return False, ""

def query_gemini(user_msg, prompt=SALON_AGENT_PROMPT):
    if not GEMINI_API_KEY:
        return None
    models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "system_instruction": {"parts": [{"text": prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_msg}]}],
            "generationConfig": {"temperature": 0.65, "maxOutputTokens": 800}
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

# ==============================================================================
# FIRESTORE INTEGRATION (THE MEMORY: 5 ENTITIES & LIFECYCLE STAGES)
# Person, Interaction, Order/Booking, Case, Organisation
# ==============================================================================

def save_lead_to_firestore(channel, customer_name, customer_phone, service, inquiry_text, price=0, is_escalated=False, escalation_reason="", stage="Lead"):
    if not FIREBASE_PROJECT_ID or not FIREBASE_API_KEY:
        return False

    clean_phone = normalize_phone(customer_phone)
    now = datetime.now()
    url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/appointments?key={FIREBASE_API_KEY}"
    
    # Calculate Data Quality Flags (The Senses)
    data_quality_score = 100
    if not is_valid_sl_phone(clean_phone):
        data_quality_score -= 30
    if not customer_name or customer_name == "Website Visitor":
        data_quality_score -= 20
    if not inquiry_text:
        data_quality_score -= 10

    initial_status = "Escalated" if is_escalated else "Pending"

    payload = {
        "fields": {
            "channel": {"stringValue": str(channel or "website")},
            "customerName": {"stringValue": str(customer_name or "Valued Client").strip().title()},
            "customerPhone": {"stringValue": str(clean_phone)},
            "service": {"stringValue": str(service or "Consultation Inquiry")},
            "bookingDate": {"stringValue": now.strftime("%Y-%m-%d")},
            "bookingTime": {"stringValue": now.strftime("%H:%M")},
            "price": {"integerValue": str(int(price or 0))},
            "status": {"stringValue": initial_status},
            "stage": {"stringValue": str(stage)}, # 01 Lead, 02 Prospect, 03 Customer, 04 Repeat, 05 Advocate
            "duration": {"integerValue": "30"},
            "inquiry": {"stringValue": str(inquiry_text or "")},
            "isEscalated": {"booleanValue": bool(is_escalated)},
            "escalationReason": {"stringValue": str(escalation_reason or "")},
            "dataQualityScore": {"integerValue": str(data_quality_score)},
            "createdAt": {"stringValue": now.isoformat()},
            "updatedAt": {"stringValue": now.isoformat()}
        }
    }
    try:
        resp = requests.post(url, json=payload, timeout=8)
        return resp.status_code == 200
    except Exception as e:
        print(f"Error saving lead to Firestore: {e}")
        return False

# ==============================================================================
# API ROUTE HANDLERS
# ==============================================================================

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
        return jsonify({"reply": "Hello gorgeous! ✨ How can I assist you with your salon booking or beauty inquiries today?"})

    # 1. Check for phone number pattern in message if not provided
    if not user_phone:
        phone_match = re.search(r'(07\d{8}|\+94\d{9}|011\d{7})', message)
        if phone_match:
            user_phone = phone_match.group(1)
            is_lead = True

    # 2. Check for Reflex Human Escalation Trigger (Slide 23 & 25)
    is_escalated, escalation_reason = detect_escalation(message)

    # 3. Detect Stage: If booking request -> Prospect; If complaint -> Case/Escalation; Else -> Lead
    stage = "Prospect" if ("book" in message.lower() or "slot" in message.lower()) else "Lead"

    # If contact available or escalation triggered, save directly to Firestore
    lead_saved = False
    if is_lead or user_phone or is_escalated:
        lead_saved = save_lead_to_firestore(
            channel="website",
            customer_name=user_name,
            customer_phone=user_phone,
            service="Website AI Concierge Inquiry" if not is_escalated else "URGENT: Customer Escalation Case",
            inquiry_text=message,
            is_escalated=is_escalated,
            escalation_reason=escalation_reason,
            stage=stage
        )

    # 4. Generate Grounded AI Response
    ai_reply = query_gemini(message, SALON_AGENT_PROMPT)
    if not ai_reply:
        if is_escalated:
            ai_reply = "I sincerely apologize for any inconvenience caused. 🌸 I have prioritized this as an Urgent Case in our CRM and notified our Salon Director directly. Our management will contact you promptly to ensure this is made right."
        else:
            msg_lower = message.lower()
            if "hair" in msg_lower or "cut" in msg_lower:
                ai_reply = "✨ Our Couture Hair Cutting & Styling starts from Rs. 1,500 (approx. 45 mins). You can reserve an exact slot directly on this page!"
            elif "facial" in msg_lower or "skin" in msg_lower:
                ai_reply = "🌸 Our Botanical Gold & Diamond Facials start at Rs. 3,000 for 60 mins of deep cellular glow and relaxation."
            elif "price" in msg_lower or "rate" in msg_lower:
                ai_reply = "💎 Service Rates:\n• Haircut: Rs. 1,500+\n• Facial: Rs. 3,000+\n• Hair Color: Rs. 5,000+\n• Bridal Package: Rs. 15,000+"
            elif "hour" in msg_lower or "open" in msg_lower or "time" in msg_lower:
                ai_reply = "🕒 We are open Monday to Saturday from 9:00 AM to 6:00 PM in Kuliyapitiya."
            else:
                ai_reply = "Thank you for reaching out to Chanu Salon! 💖 Would you like to schedule an appointment, or speak directly with our reception at 070 446 8888?"

    return jsonify({
        "reply": ai_reply,
        "lead_saved": lead_saved,
        "is_escalated": is_escalated,
        "escalation_reason": escalation_reason,
        "stage": stage
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

    # Parse nested Meta WhatsApp Cloud API format
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

    # Fallback to direct parameters
    if not sender:
        sender = data.get("sender") or data.get("phone") or data.get("from") or "0781468988"
    if not name:
        name = data.get("sender_name") or data.get("name") or data.get("profile_name") or "WhatsApp Client"
    if not message:
        message = data.get("message") or data.get("body") or data.get("text") or "Hello"

    clean_phone = normalize_phone(sender)
    is_escalated, escalation_reason = detect_escalation(message)
    stage = "Prospect" if ("book" in message.lower() or "slot" in message.lower()) else "Lead"

    # Automatically ingest lead into Cloud Firestore with Data Quality & Escalation checks
    lead_saved = save_lead_to_firestore(
        channel="whatsapp",
        customer_name=name,
        customer_phone=clean_phone,
        service="WhatsApp Consultation / Lead" if not is_escalated else "URGENT: WhatsApp Escalation Case",
        inquiry_text=message,
        is_escalated=is_escalated,
        escalation_reason=escalation_reason,
        stage=stage
    )

    ai_response = query_gemini(message, WHATSAPP_AGENT_PROMPT)
    if not ai_response:
        if is_escalated:
            ai_response = f"Dear {name}, we sincerely apologize for the inconvenience. *Our Salon Manager has been directly notified* and will reach out to you on this number as a priority matter."
        else:
            ai_response = f"Hello {name}! 🌸 Thank you for messaging *Chanu Salon*. We are open Mon-Sat 9AM-6PM in Kuliyapitiya. How may we pamper you today?"

    result = {
        "status": "success",
        "success": True,
        "reply": ai_response,
        "ai_reply": ai_response,
        "channel": "whatsapp",
        "sender": clean_phone,
        "sender_name": name,
        "is_escalated": is_escalated,
        "lead_saved_to_crm": lead_saved
    }
    return jsonify(result)

# Dedicated lead submission endpoint with validation
def handle_lead_submission():
    req_data = request.get_json(silent=True) or {}
    channel = req_data.get("channel", "website")
    name = req_data.get("name") or req_data.get("customerName", "VIP Lead")
    phone = req_data.get("phone") or req_data.get("customerPhone", "")
    service = req_data.get("service", "General Inquiry")
    message = req_data.get("message") or req_data.get("inquiry", "")
    price = req_data.get("price", 0)

    is_escalated, reason = detect_escalation(message)
    saved = save_lead_to_firestore(channel, name, phone, service, message, price, is_escalated, reason)
    return jsonify({
        "success": saved, 
        "message": "Lead recorded successfully in Cloud CRM",
        "is_escalated": is_escalated
    })

# Add Case / Touchpoint Endpoint (Slide 9 & 11)
def handle_add_case():
    req_data = request.get_json(silent=True) or {}
    phone = normalize_phone(req_data.get("phone", ""))
    case_title = req_data.get("title", "Special Case / Note")
    case_description = req_data.get("description", "")
    case_type = req_data.get("type", "Preference") # Preference, Complaint, Inquiry, Allergy

    if not phone or not FIREBASE_PROJECT_ID or not FIREBASE_API_KEY:
        return jsonify({"success": False, "error": "Missing phone or credentials"}), 400

    url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/customer_cases?key={FIREBASE_API_KEY}"
    now = datetime.now()
    payload = {
        "fields": {
            "customerPhone": {"stringValue": phone},
            "caseTitle": {"stringValue": case_title},
            "caseDescription": {"stringValue": case_description},
            "caseType": {"stringValue": case_type},
            "status": {"stringValue": "Active"},
            "createdAt": {"stringValue": now.isoformat()}
        }
    }
    try:
        resp = requests.post(url, json=payload, timeout=8)
        return jsonify({"success": resp.status_code == 200, "message": "Case recorded successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Catch-all and smart route dispatcher
@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'OPTIONS'])
@app.route('/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def dispatch(path):
    action = request.args.get('action', '').lower().strip()
    req_full = request.path.lower().strip()
    target = f"{action} {req_full} {path.lower().strip()}"

    if 'config' in target:
        return handle_config()
    elif 'case' in target:
        return handle_add_case()
    elif 'lead' in target:
        return handle_lead_submission()
    elif 'chat' in target:
        return handle_chat()
    elif 'whatsapp' in target:
        return handle_whatsapp()
    else:
        return jsonify({
            "status": "ok", 
            "service": "Chanu Salon AI Business Brain API",
            "version": "2.0-Agentforce-Ready",
            "pillars": ["The Memory (Customer 360)", "The Senses (Data Quality & Churn)", "The Reflexes (Autonomous AI Agent)"],
            "active": True
        })

handler = app

if __name__ == '__main__':
    app.run(port=5000, debug=True)
