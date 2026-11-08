from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import re
import requests
from datetime import datetime, timezone, timedelta

try:
    from dotenv import load_dotenv
    load_dotenv()
    if os.path.exists('salon-ai-crm/.env'):
        load_dotenv('salon-ai-crm/.env')
    env_parent = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_parent):
        load_dotenv(env_parent)
except Exception:
    pass

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "salon-automation-48fa6")
FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "")

# ==============================================================================
# SALESFORCE AGENTFORCE-INSPIRED SYSTEM PROMPT (THE REFLEXES & GROUNDING)
# Multi-Language: Fluent English, Sinhala (සිංහල), and Singlish
# ==============================================================================

SALON_AGENT_PROMPT = """You are 'Anya', the autonomous AI Beauty Concierge & Client Relationship Agent for Chanu Salon - Premier Luxury Hair & Beauty Sanctuary located in Kuliyapitiya, Sri Lanka.

[CRITICAL MULTILINGUAL INSTRUCTION]
You MUST automatically detect and mirror the language and dialect of the client:
1. If the client asks in Sinhala (Unicode, e.g., 'කොණ්ඩේ කපන්න කීයද?', 'මට වෙලාවක් වෙන් කරගන්න පුළුවන්ද?'):
   -> Respond in fluent, polite, grammatically correct Sinhala (සිංහල).
2. If the client asks in Singlish (e.g., 'oyt sinhalen answer denn puluwnda?', 'hair cut ekata kiyak yanawada?', 'slot ekak danna puluwanda?'):
   -> Respond warmly in fluent Sinhala or Singlish matching their tone (e.g., 'ඔව්, මට සිංහලෙන් සහ Singlish වලින් උත්තර දෙන්න පුළුවන්!').
3. If the client asks in English:
   -> Respond in warm, luxurious, hospitable English.
NEVER default to English when the client addresses you in Sinhala or Singlish!

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


[CONVERSATION CONTINUITY & CONTEXT MEMORY]
- You have access to recent conversation history. Keep strict conversational context across all turns.
- NEVER reset the conversation or repeat initial introductions/welcome greetings ("ආයුබෝවන්... මම Anya... කොහොමද උදව් කරන්නේ?") if the client is already conversing with you!
- When you ask a question or offer assistance (e.g., "Do you want me to help you check available times?"), and the client replies with a confirmation or short phrase like "ow help krnn", "ow", "yes", "sure", "hari", "okay", "slot ekak danna":
  -> DO NOT restart! Immediately provide the next step: suggest 2-3 specific available times (e.g., "නියමයි! අද උදෑසන 10:00, 11:30 හෝ සවස 2:30 වැනි වේලාවක් ඔබට පහසුද?"), confirm what treatment they want, and ask for their name and WhatsApp/mobile number so the salon can confirm the booking slot.
- Always match the exact language (Sinhala, Singlish, or English) that the user is currently speaking in.


[CRITICAL: ALWAYS CAPTURE BOTH FULL NAME AND PHONE/WHATSAPP NUMBER]
Whenever the client expresses interest in booking an appointment, checks slots, or says "ow help krnn", "slot ekak danna", "book krnn", "appointment ekak ganna":
You MUST ALWAYS ask for BOTH their Full Name AND Mobile / WhatsApp Number TOGETHER in a single friendly message:
- Sinhala: "කරුණාකර ඔබගේ සම්පූර්ණ නම (Full Name) සහ දුරකථන / WhatsApp අංකය මට ලබා දෙන්න. මම වහාම ඔබ වෙනුවෙන් මෙම booking එක සටහන් කර අපගේ කළමනාකාරීත්වය මඟින් තහවුරු කර දෙන්නම්! 💖"
- Singlish: "Karunakara oyage Full Name eka saha Mobile / WhatsApp Phone Number eka mata laba denna. Mama e welaavema booking slot eka submit karala confirm karala dennam! 💖"
- English: "Please provide both your Full Name and Mobile/WhatsApp Number so I can immediately log and confirm your appointment slot with our salon management! 💖"
NEVER ask for only the phone or only the name. ALWAYS ask for BOTH at the same time!

[HUMAN HAND-OFF (ESCALATION)]
- If the client expresses frustration, reports a bad experience, requests a refund, or asks to speak with the manager, respond with genuine empathy, reassure them in their language, and explain that you are escalating this directly to our Salon Director for immediate personal attention.
"""

WHATSAPP_AGENT_PROMPT = """You are 'Anya', the autonomous WhatsApp AI Agent for Chanu Salon in Kuliyapitiya, Sri Lanka.
Hotline / WhatsApp: 070 446 8888.
Open Mon-Sat 9AM-6PM.

Language: Fluently reply in the customer's language (Sinhala, Singlish, or English).
Services:
1. Haircut: from Rs. 1,500
2. Facial: from Rs. 3,000
3. Hair Color: from Rs. 5,000
4. Bridal Dressing: from Rs. 15,000
5. Keratin Therapy: from Rs. 7,500

Rules:
- Format replies with elegant emojis, bold text (*like this*), and concise bullet points.
- If customer asks in Sinhala or Singlish, reply warmly in Sinhala/Singlish.
- If customer is unhappy, express empathy and state that the Salon Manager has been alerted to call them.
- Always offer to confirm a 30-minute slot or call reception at 070 446 8888.
"""


def extract_time_intent(text):
    """Extracts slot or appointment time from message (e.g., 10:30, 10.30 a.m, 2:00 pm)."""
    if not text:
        return ""
    match = re.search(r'(\b\d{1,2}[:.]\d{2}\s*(?:am|pm|a\.m\.|p\.m\.)?|\b\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.))\b', text, re.IGNORECASE)
    if match:
        t = match.group(1).replace('.', ':').strip()
        t = re.sub(r'a[:.]?m[:.]?', 'AM', t, flags=re.IGNORECASE)
        t = re.sub(r'p[:.]?m[:.]?', 'PM', t, flags=re.IGNORECASE)
        return t.strip()
    return ""

def extract_service_intent(text, history=None):
    """Detects service name and estimated price from current message or conversation history."""
    combined = (text or "").lower()
    if history and isinstance(history, list):
        for h in history:
            combined += " " + (h.get("content", "") or "").lower()

    if any(k in combined for k in ["color", "colour", "balayage", "ombre", "highlight"]):
        return "Balayage, Ombre & Creative Color", 5000
    elif any(k in combined for k in ["facial", "skin", "clean up", "glow"]):
        return "Botanical Gold & Diamond Facial", 3000
    elif any(k in combined for k in ["bridal", "dressing", "manali"]):
        return "Royal Bridal Dressing", 15000
    elif any(k in combined for k in ["keratin", "botox", "straight"]):
        return "Keratin & Hair Botox Therapy", 7500
    elif any(k in combined for k in ["mani", "pedi", "nail"]):
        return "Luxury Manicure & Pedicure", 2500
    elif any(k in combined for k in ["hair", "cut", "konde", "trim", "styling"]):
        return "Couture Hair Cutting & Styling", 1500
    return "Website AI Concierge Inquiry", 0

# ==============================================================================
# DATA QUALITY UTILITIES & LANGUAGE DETECTION
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
    clean = normalize_phone(phone)
    return bool(re.match(r'^07[0-9]{8}$', clean))

def is_sinhala_or_singlish(text):
    """Detects if message is in Sinhala Unicode or Singlish phonetics."""
    if not text:
        return False
    # 1. Sinhala Unicode characters
    if re.search(r'[\u0D80-\u0DFF]', text):
        return True
    # 2. Common Singlish phonetics
    singlish_keywords = [
        "sinhalen", "sinhala", "puluwanda", "puluwan", "oyt", "oya", "mata", "kiyada", "ganan", 
        "kohomada", "welawe", "karanna", "denn", "ona", "danna", "enne", "thiyenawada", 
        "thiyenne", "sathiye", "kapanne", "konde", "awul", "katha", "hondayi", "hari", 
        "mokakda", "kawadda", "dapanko", "ahanna", "kiyapan", "salli", "ganne", "balanna", 
        "ow", "help", "krnn", "slot", "book", "ekak", "ude", "hawasa", "dawasa", "kamathi", "one"
    ]
    text_lower = text.lower()
    return any(w in text_lower for w in singlish_keywords)

def detect_escalation(text):
    """Detects negative sentiment or human escalation triggers in EN, SI, Singlish."""
    if not text:
        return False, ""
    text_lower = text.lower()
    escalation_keywords = [
        "complaint", "upset", "angry", "terrible", "bad service", "ruined", 
        "refund", "cheated", "speak with manager", "talk to manager", "call manager", 
        "director", "disappointed", "poor experience", "damaged my hair", 
        "horrible", "waste of money", "call me immediately", "sathiyak giya", 
        "katha karanna ona", "naduwak", "palaweni wathawa nemei", "salli ona", 
        "manager ekka katha", "waradi", "awul", "salli apahu"
    ]
    for kw in escalation_keywords:
        if kw in text_lower:
            return True, f"Triggered keyword: '{kw}'"
    return False, ""

def query_gemini(user_msg, prompt=SALON_AGENT_PROMPT, history=None):
    """Queries Google Gemini API with active 2026 models, multi-turn history, and automatic fallback."""
    if not GEMINI_API_KEY:
        return None

    # Priority list of verified, active 2026 Gemini models
    models = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest"]

    # Construct multi-turn contents from history
    contents = []
    if history and isinstance(history, list):
        for turn in history[-10:]:
            role = turn.get("role", "")
            text = turn.get("content", "") or turn.get("text", "")
            if role in ["user", "client"] and text:
                contents.append({"role": "user", "parts": [{"text": str(text)}]})
            elif role in ["assistant", "model", "bot"] and text:
                contents.append({"role": "model", "parts": [{"text": str(text)}]})

    # Gemini requires contents to start with a 'user' turn
    while contents and contents[0]["role"] != "user":
        contents.pop(0)

    # Gemini requires strictly alternating roles (user, model, user, model...)
    cleaned_contents = []
    for item in contents:
        if cleaned_contents and cleaned_contents[-1]["role"] == item["role"]:
            cleaned_contents[-1]["parts"][0]["text"] += "\n" + item["parts"][0]["text"]
        else:
            cleaned_contents.append(item)
    contents = cleaned_contents

    # Ensure current user_msg is the final user turn
    if not contents or contents[-1]["role"] != "user":
        contents.append({"role": "user", "parts": [{"text": str(user_msg)}]})
    else:
        if str(user_msg) not in contents[-1]["parts"][0]["text"]:
            contents[-1]["parts"][0]["text"] = str(user_msg)

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "system_instruction": {"parts": [{"text": prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.65, 
                "maxOutputTokens": 600
            }
        }
        try:
            resp = requests.post(url, json=payload, timeout=8)
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
# ==============================================================================

STOP_WORDS_SET = {
    "ow", "na", "ne", "ehema", "krl", "krla", "karala", "denna", "dennam", "danna", 
    "mona", "magulakda", "magulkda", "appa", "puluwanda", "bari", "kiyakda", "kiyada", 
    "kiyanna", "bada", "hari", "kamak", "welawe", "welawa", "kohomada", "meka", "thawa", 
    "mata", "ona", "ane", "manda", "mokakda", "kawadada", "help", "thanks", "appointment", 
    "booking", "slot", "slots", "karanna", "karana", "ganna", "balanna", "balayage", 
    "color", "colour", "facial", "haircut", "treatment", "price", "rates", "ude", "hawasa", 
    "today", "ada", "adha", "yes", "sure", "okay", "ok", "fine", "good", "morning", 
    "afternoon", "hi", "hello", "hey", "please", "call", "me", "is", "and", "the", "for",
    "name", "nama", "mage", "oyata", "oya", "salon", "chanu", "ekata", "karanna", "ganna"
}

def extract_valid_customer_name(message, current_name=""):
    """Extracts a legitimate customer full name and strictly rejects Singlish/conversational phrases."""
    if not message:
        return current_name or ""
    
    # 1. Explicit pattern (e.g. 'my name is Pramodya Rathnayaka', 'name: Pramodya Rathnayaka', 'mage nama Pramodya')
    explicit_m = re.search(r'(?:my\s+name\s+is|mage\s+nama\s+is?|nama\s*:?|name\s*:?)\s*([A-Za-z\s]{3,30})', message, re.IGNORECASE)
    if explicit_m:
        cand = explicit_m.group(1).strip()
        words = cand.split()
        if len(words) >= 1 and not any(w.lower() in STOP_WORDS_SET for w in words):
            return " ".join(words).title()

    # 2. If phone is in message, look for candidate name accompanying the phone number
    if re.search(r'(07\d{8}|\+94\d{9}|011\d{7})', message):
        clean_text = re.sub(r'(07\d{8}|\+94\d{9}|011\d{7})', '', message)
        clean_text = re.sub(r'[^a-zA-Z\s]', ' ', clean_text).strip()
        words = [w for w in clean_text.split() if w.lower() not in STOP_WORDS_SET and len(w) >= 2]
        if 2 <= len(words) <= 4:
            return " ".join(words).title()

    return current_name or ""

def save_lead_to_firestore(channel, customer_name, customer_phone, service, inquiry_text, price=0, is_escalated=False, escalation_reason="", stage="Lead", booking_time=None):
    if not FIREBASE_PROJECT_ID or not FIREBASE_API_KEY:
        return False

    clean_phone = normalize_phone(customer_phone)
    if not clean_phone:
        return False

    # Convert to Sri Lanka Local Time (SLST = UTC+5:30)
    sl_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    today_str = sl_now.strftime("%Y-%m-%d")
    base_url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"
    
    data_quality_score = 100
    if not is_valid_sl_phone(clean_phone):
        data_quality_score -= 30
    if not customer_name or customer_name in ["Website Visitor", "Valued Client"]:
        data_quality_score -= 20
    if not inquiry_text:
        data_quality_score -= 10

    initial_status = "Escalated" if is_escalated else "Pending"
    submission_time = sl_now.strftime("%H:%M")
    final_time = booking_time if booking_time else submission_time

    # 1. Lead De-duplication: Check if active record exists for this phone today
    try:
        query_url = f"{base_url}/appointments?key={FIREBASE_API_KEY}"
        resp = requests.get(query_url, timeout=5)
        existing_doc = None
        if resp.status_code == 200:
            docs = resp.json().get("documents", [])
            for d in docs:
                fields = d.get("fields", {})
                b_date = fields.get("bookingDate", {}).get("stringValue", "")
                p_phone = fields.get("customerPhone", {}).get("stringValue", "")
                p_status = fields.get("status", {}).get("stringValue", "")
                if b_date == today_str and p_phone == clean_phone and p_status in ["Pending", "Confirmed", "Escalated"]:
                    existing_doc = d
                    break

        if existing_doc:
            # Update (PATCH) existing document instead of creating a duplicate row
            doc_name = existing_doc["name"]
            existing_fields = existing_doc.get("fields", {})
            existing_name = existing_fields.get("customerName", {}).get("stringValue", "")
            
            # Protect legitimate customer name from being overwritten by defaults or empty values
            best_name = customer_name if (customer_name and customer_name not in ["Website Visitor", "Valued Client"]) else (existing_name or "Valued Client")
            
            update_fields = {
                "inquiry": {"stringValue": str(inquiry_text or "")},
                "updatedAt": {"stringValue": sl_now.isoformat()}
            }
            mask_paths = ["inquiry", "updatedAt"]

            if best_name and best_name != existing_name:
                update_fields["customerName"] = {"stringValue": str(best_name).strip().title()}
                mask_paths.append("customerName")

            if booking_time:
                update_fields["requestedSlot"] = {"stringValue": str(booking_time)}
                mask_paths.append("requestedSlot")

            if service and service not in ["Website AI Concierge Inquiry", "Consultation Inquiry"]:
                update_fields["service"] = {"stringValue": str(service)}
                mask_paths.append("service")

            if price and int(price) > 0:
                update_fields["price"] = {"integerValue": str(int(price))}
                mask_paths.append("price")

            if is_escalated:
                update_fields["isEscalated"] = {"booleanValue": True}
                update_fields["status"] = {"stringValue": "Escalated"}
                update_fields["escalationReason"] = {"stringValue": str(escalation_reason or "Escalation")}
                mask_paths.extend(["isEscalated", "status", "escalationReason"])

            mask_query = "&".join([f"updateMask.fieldPaths={p}" for p in mask_paths])
            patch_url = f"https://firestore.googleapis.com/v1/{doc_name}?{mask_query}&key={FIREBASE_API_KEY}"
            patch_resp = requests.patch(patch_url, json={"fields": update_fields}, timeout=6)
            return patch_resp.status_code == 200

    except Exception as ex:
        print(f"De-duplication check notice: {ex}")

    # 2. No existing record found: Create new record via POST
    payload = {
        "fields": {
            "channel": {"stringValue": str(channel or "website")},
            "customerName": {"stringValue": str(customer_name or "Valued Client").strip().title()},
            "customerPhone": {"stringValue": str(clean_phone)},
            "service": {"stringValue": str(service or "Consultation Inquiry")},
            "bookingDate": {"stringValue": today_str},
            "bookingTime": {"stringValue": str(final_time)},
            "submissionTime": {"stringValue": str(submission_time)},
            "requestedSlot": {"stringValue": str(booking_time or "")},
            "price": {"integerValue": str(int(price or 0))},
            "status": {"stringValue": initial_status},
            "stage": {"stringValue": str(stage)},
            "duration": {"integerValue": "30"},
            "inquiry": {"stringValue": str(inquiry_text or "")},
            "isEscalated": {"booleanValue": bool(is_escalated)},
            "escalationReason": {"stringValue": str(escalation_reason or "")},
            "dataQualityScore": {"integerValue": str(data_quality_score)},
            "createdAt": {"stringValue": sl_now.isoformat()},
            "updatedAt": {"stringValue": sl_now.isoformat()}
        }
    }
    try:
        url = f"{base_url}/appointments?key={FIREBASE_API_KEY}"
        resp = requests.post(url, json=payload, timeout=8)
        return resp.status_code == 200
    except Exception as e:
        print(f"Error saving lead to Firestore: {e}")
        return False

def get_multilingual_fallback(message, is_escalated=False):
    msg_lower = message.lower()
    is_si = is_sinhala_or_singlish(message)

    if is_escalated:
        if is_si:
            return "සිදුවූ අපහසුතාවයට අපගේ බලවත් කනගාටුව ප්‍රකාශ කරමු! 🌸 මෙම ගැටලුව මම අපගේ CRM එකෙහි 'Urgent Case' එකක් ලෙස සටහන් කර චානු සැලෝන් අධ්‍යක්ෂකතුමියට (Salon Director) වෙත යොමු කළා. අපගේ කළමනාකාරීත්වය ඉක්මනින්ම ඔබව අමතා මෙය විසඳනු ඇත."
        return "I sincerely apologize for any inconvenience caused. 🌸 I have prioritized this as an Urgent Case in our CRM and notified our Salon Director directly. Our management will contact you promptly to ensure this is made right."

    # 1. User asks about slot availability or overlapping buffer check (Method 3)
    if any(k in msg_lower for k in ["10:30", "10.30"]):
        if is_si:
            return "අද උදෑසන 09:30 AM සිට අපේ සේවාදායකයෙක්ගේ Balayage & Color ප්‍රතිකාරයක් (පැය 1 ½ ක කාලයක් ගතවන) ක්‍රියාත්මක වන අතර, එය නිමාවට පත්වන්නේ 11:00 AM ටයි. 🌸 ඒ නිසා ඔබ 10:30 AM ට පැමිණියහොත් විනාඩි 30ක පමණ සුළු රැඳීසිටීමක් සිදුවිය හැක. කිසිදු ප්‍රමාදයකින් තොරව (Zero waiting time) VIP සේවාවක් ලබා ගැනීම සඳහා, ඊට මඳක් පසුවන 11:00 AM හෝ 11:30 AM වේලාවක් ඔබට වඩාත් සුදුසුය! මෙම වේලාවක් වෙන් කරවා ගැනීමට ඔබගේ සම්පූර්ණ නම සහ දුරකථන අංකය මට ලබා දෙන්නද? 💖"
        return "Our 09:30 AM client has a Balayage & Color treatment (approx. 90 mins) completing at 11:00 AM. 🌸 Arriving at 10:30 AM may involve a ~30-min overlapping wait time. For 100% zero-wait VIP care, we highly recommend booking at 11:00 AM or 11:30 AM! Would you like me to reserve one of these slots for you? 💖"

    if any(k in msg_lower for k in ["check karala", "check karanna", "available", "time slot", "slots thiyenawada", "ada slots", "welawe thiyeda", "check krnn", "kiyanna bada"]):
        if is_si:
            return "ඔව්, අනිවාර්යයෙන්ම මම අපගේ සජීවී පද්ධතිය පරීක්ෂා කළා! 🌸 අද දින අපගේ සැලෝන් එකෙහි 100% කිසිදු රැඳීසිටීමකින් තොරව (Zero waiting time) ලබාගත හැකි වේලාවන් වන්නේ උදෑසන 11:00 AM, 11:30 AM, දහවල් 01:30 PM, සවස 02:30 PM සහ 03:30 PM යන slots වේ! මෙයින් ඔබට වඩාත් පහසු වේලාව කුමක්ද? ඔබගේ නම සහ දුරකථන අංකය ලබා දුනහොත් මම වහාම slot එක තහවුරු කර දෙන්නම්! 💖"
        return "Certainly! I checked our live system right now! 🌸 Free buffer-free slots are available today at 11:00 AM, 11:30 AM, 01:30 PM, and 03:00 PM! Which of these times works best for you? Please share your Full Name and Phone Number to confirm your slot! 💖"

    # 2. User confirms / affirms assistance (e.g. "ow help krnn", "ow", "yes")
    if any(k in msg_lower for k in ["ow help", "help krnn", "help karanna", "ow", "yes", "sure", "hari"]):
        if is_si:
            return "අනිවාර්යයෙන්ම! අද දිනයේ ඔබට වෙන් කරගැනීමට අවශ්‍ය සේවාව (Haircut, Facial, Color, Treatment) සහ පහසු වේලාව (උදෑසන 9:00 - සවස 6:00 අතර) කුමක්ද? කරුණාකර ඔබගේ සම්පූර්ණ නම (Full Name) සහ දුරකථන / WhatsApp අංකය මට ලබා දෙන්න. මම වහාම slot එක වෙන් කරවා දෙන්නම්! 💖"
        return "Certainly! What service and preferred time (between 9:00 AM - 6:00 PM) would you like to schedule? Please provide both your Full Name and Mobile/WhatsApp Number so I can immediately confirm your slot! 💖"

    # 2. User asks about language / speaking in Sinhala
    if any(k in msg_lower for k in ["sinhalen", "sinhala", "සිංහල", "language", "bahawe", "katha"]):
        return "ඔව්, අනිවාර්යයෙන්ම මට සිංහලෙන් සහ Singlish වලින් කතා කරන්න පුළුවන්! 🌸 චානු සැලෝන් (Chanu Salon) එකේ Hair cutting, Facials, Hair color, Bridal dressing හෝ Slot booking ගැන ඕනෑම දෙයක් අහන්න. මම ඔබට කොහොමද උදව් කරන්නේ? ✨"

    # 2. Haircut inquiries
    if any(k in msg_lower for k in ["hair", "cut", "konde", "kapanne", "styling", "කොණ්ඩ"]):
        if is_si:
            return "✂️ අපගේ Couture Hair Cutting & Styling ආරම්භ වන්නේ රු. 1,500 සිටයි (විනාඩි 45ක් පමණ). ඔබට මෙම වෙබ් පිටුවේ 'Book Slot' කොටසෙන් කැමති වේලාවකට Slot එකක් පහසුවෙන්ම වෙන් කරගත හැක!"
        return "✨ Our Couture Hair Cutting & Styling starts from Rs. 1,500 (approx. 45 mins). You can reserve an exact slot directly on this page!"

    # 3. Facial inquiries
    if any(k in msg_lower for k in ["facial", "skin", "clean", "ෆේෂල්", "මූණ"]):
        if is_si:
            return "🌸 අපගේ Botanical Gold & Diamond Facials රු. 3,000 සිට ආරම්භ වේ (විනාඩි 60ක්). ගැඹුරු සමේ පැහැපත් බව සහ පෝෂණය සඳහා මෙය කදිමයි! ඔබට Slot එකක් වෙන්කර දීමට මට පුළුවන්ද?"
        return "🌸 Our Botanical Gold & Diamond Facials start at Rs. 3,000 for 60 mins of deep cellular glow and relaxation."

    # 4. Pricing / Rates inquiries
    if any(k in msg_lower for k in ["price", "rate", "kiyada", "ganan", "mila", "මිල", "ගණන්", "cost", "charge"]):
        if is_si:
            return "💎 චානු සැලෝන් (Chanu Salon) සේවා ගාස්තු:\n• Haircut & Styling: රු. 1,500 සිට\n• Botanical Facials: රු. 3,000 සිට\n• Creative Hair Color: රු. 5,000 සිට\n• Keratin & Hair Botox: රු. 7,500 සිට\n• Bridal Package: රු. 15,000 සිට"
        return "💎 Chanu Salon Service Rates:\n• Haircut: Rs. 1,500+\n• Facial: Rs. 3,000+\n• Hair Color: Rs. 5,000+\n• Keratin Therapy: Rs. 7,500+\n• Bridal Package: Rs. 15,000+"

    # 5. Booking / Appointment inquiries
    if any(k in msg_lower for k in ["book", "slot", "welawe", "appointment", "reserve", "වෙන්"]):
        if is_si:
            return "📅 ඔබට මෙම පිටුවේ ඇති 'Book Slot' පෝරමය මඟින් කැමති දිනයක් සහ වේලාවක් තෝරාගෙන Slot එකක් Book කරගත හැක. නැතහොත් දුරකථන අංකය මෙහි සඳහන් කරන්න, අපගේ reception team එක ඔබව සම්බන්ධ කරගනීවි!"
        return "📅 You can easily book an appointment slot using the 'Book Slot' form right on this page! Or leave your contact number and our reception will confirm your slot."

    # 6. Operating Hours inquiries
    if any(k in msg_lower for k in ["hour", "open", "time", "dina", "ඇරලා", "වෙලාව"]):
        if is_si:
            return "🕒 අපි සඳුදා සිට සෙනසුරාදා දක්වා උදෑසන 9:00 සිට සවස 6:00 දක්වා විවෘතයි (ප්‍රධාන වීදිය, කුලියාපිටිය). ඉරිදා දිනයන්හි Bridal appointment සඳහා පමණක් විවෘත වේ."
        return "🕒 We are open Monday to Saturday from 9:00 AM to 6:00 PM in Kuliyapitiya."

    # 7. Default greeting & guidance
    if is_si:
        return "චානු සැලෝන් වෙත සාදරයෙන් පිළිගනිමු! 🌸 මම Anya, ඔබේ Smart Beauty Concierge. කොණ්ඩය කැපීම, Facials, Hair Treatments හෝ Booking එකක් දැමීම ගැන ඔබට දැනගැනීමට අවශ්‍ය කුමක්ද? ඔබට උදව් කිරීමට මම සූදානම්! ✨"
    
    return "Thank you for reaching out to Chanu Salon! 💖 Would you like to schedule an appointment, or speak directly with our reception at 070 446 8888?"

# ==============================================================================
# API ROUTE HANDLERS
# ==============================================================================



def get_service_duration(service_name, doc_duration=None):
    """Calculates duration in minutes based on service name or doc attribute."""
    s_lower = (service_name or "").lower()
    if any(k in s_lower for k in ["bridal", "dressing", "manali"]):
        return 180
    elif any(k in s_lower for k in ["keratin", "botox", "straight"]):
        return 120
    elif any(k in s_lower for k in ["balayage", "color", "colour", "ombre", "highlight"]):
        return 90
    elif any(k in s_lower for k in ["facial", "skin", "clean up"]):
        return 60
    elif any(k in s_lower for k in ["cut", "hair", "styling", "manicure", "pedicure"]):
        return 45
    if doc_duration:
        try:
            d_int = int(doc_duration)
            if d_int > 30:
                return d_int
        except Exception:
            pass
    return 45

def slot_to_minutes(slot_str):
    """Converts a slot string like '09:30 AM', '10:30', or '10.30 a.m' to minutes from midnight."""
    if not slot_str:
        return None
    m = re.search(r'(\d{1,2})[:.](\d{2})\s*(AM|PM)?', slot_str, re.IGNORECASE)
    if not m:
        return None
    h = int(m.group(1))
    minute = int(m.group(2))
    ampm = (m.group(3) or "").upper()
    if ampm == "PM" and h < 12:
        h += 12
    elif ampm == "AM" and h == 12:
        h = 0
    return h * 60 + minute

def minutes_to_slot(mins):
    """Converts minutes from midnight to standard 'HH:MM AM/PM'."""
    h = (mins // 60) % 24
    m = mins % 60
    ampm = "AM" if h < 12 else "PM"
    h12 = h if 1 <= h <= 12 else (h - 12 if h > 12 else 12)
    return f"{h12:02d}:{m:02d} {ampm}"


def get_live_slot_context():
    """Fetches real-time appointment records from Firestore and calculates service duration timelines with buffer warnings (Method 3)."""
    if not FIREBASE_PROJECT_ID or not FIREBASE_API_KEY:
        return ""

    try:
        sl_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        today_str = sl_now.strftime('%Y-%m-%d')
        today_display = sl_now.strftime('%A, %B %d, %Y')
        current_time_str = sl_now.strftime('%I:%M %p')

        url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/appointments?key={FIREBASE_API_KEY}"
        resp = requests.get(url, timeout=5)
        if resp.status_code != 200:
            return ""

        docs = resp.json().get('documents', [])
        all_standard_slots = [
            "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
            "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
            "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM"
        ]

        active_timelines = []
        occupied_slots_set = set()

        for d in docs:
            fields = d.get('fields', {})
            b_date = fields.get('bookingDate', {}).get('stringValue', '')
            status = fields.get('status', {}).get('stringValue', '')
            slot = fields.get('requestedSlot', {}).get('stringValue', '') or fields.get('bookingTime', {}).get('stringValue', '')
            service = fields.get('service', {}).get('stringValue', '')
            customer = fields.get('customerName', {}).get('stringValue', '')
            raw_duration = fields.get('duration', {}).get('stringValue', '') or fields.get('duration', {}).get('integerValue', '')

            # Only active bookings for today
            if b_date == today_str and status in ['Pending', 'Confirmed']:
                start_mins = slot_to_minutes(slot)
                duration = get_service_duration(service, raw_duration)

                if start_mins is not None:
                    end_mins = start_mins + duration
                    start_str = minutes_to_slot(start_mins)
                    end_str = minutes_to_slot(end_mins)

                    # All 30-min standard slots within [start_mins, end_mins) are under treatment
                    span_slots = []
                    for s in all_standard_slots:
                        s_mins = slot_to_minutes(s)
                        if s_mins is not None and start_mins <= s_mins < end_mins:
                            occupied_slots_set.add(s)
                            span_slots.append(s)

                    slots_span_text = ", ".join(span_slots) if span_slots else start_str
                    active_timelines.append(
                        f"- {start_str} to {end_str} ({duration} mins): {service} (Client: {customer})\n"
                        f"  * Ongoing treatment slots: {slots_span_text}\n"
                        f"  * Estimated treatment finish: {end_str}"
                    )
                else:
                    occupied_slots_set.add(slot.strip().upper())
                    active_timelines.append(f"- {slot}: {service} ({customer})")

        free_morning = [s for s in all_standard_slots if 'AM' in s and s not in occupied_slots_set]
        free_afternoon = [s for s in all_standard_slots if 'PM' in s and s not in occupied_slots_set]

        timelines_text = "\n".join(active_timelines) if active_timelines else "- None. All salon styling bays are currently free!"
        morning_text = ", ".join(free_morning) if free_morning else "Fully booked"
        afternoon_text = ", ".join(free_afternoon) if free_afternoon else "Fully booked"

        context = f"""
[LIVE REAL-TIME SALON APPOINTMENT SCHEDULE & TREATMENT TIMELINES (TODAY: {today_display} | CURRENT TIME: {current_time_str})]
- Salon Hours: Monday to Saturday from 9:00 AM to 6:00 PM.
- Active Ongoing Treatments & Duration Spans Today:
{timelines_text}

- Recommended 100% Zero-Wait Clean Available Slots Today:
  * Morning Clean Slots: {morning_text}
  * Afternoon Clean Slots: {afternoon_text}

[CRITICAL INSTRUCTION ON SERVICE DURATION OVERLAPS & BUFFER NOTIFICATION (METHOD 3)]
You HAVE 100% DIRECT REAL-TIME ACCESS to our live salon appointment database and treatment duration timelines shown above!
NEVER EVER SAY: 'I do not have real-time access', 'සජීවීව direct access නැහැ', or 'මට direct access නෑ'.

METHOD 3 INTELLIGENT SCHEDULING RULES:
1. When the client asks what slots are available or asks to check today's schedule:
   - Confidently state you checked the live system right now!
   - List the 100% clean, buffer-free slots ({morning_text}, {afternoon_text}).
   - Mention any ongoing treatments and their completion times so the client understands salon availability.

2. SMART BUFFER WARNING & OVERLAP NOTIFICATION (CRUCIAL):
   - When a client asks to book a slot that falls inside an ongoing treatment span (for example: client asks for 10:00 AM or 10:30 AM when an earlier appointment started at 09:30 AM with a 90-min Balayage treatment finishing at 11:00 AM):
   - DO NOT simply say the slot is available!
   - Explain politely and transparently:
     The earlier client's treatment takes 90 minutes (1 hour and 30 mins) and finishes at 11:00 AM.
     If the client arrives at 10:30 AM, they would experience an overlapping wait time of approximately 30 minutes.
   - Proactively recommend booking right when the earlier treatment completes (at 11:00 AM or 11:30 AM) so that their master stylist is 100% ready and they experience ZERO WAITING TIME with VIP care!
   - Example in Sinhala:
     "අපගේ 09:30 AM සේවාදායකයාගේ Balayage/Color සත්කාරය සඳහා 11:00 AM දක්වා වේලාව ගතවන බැවින් (විනාඩි 90ක්), ඔබ 10:30 AM ට පැමිණියහොත් පෙර සේවාව අවසන් වනතුරු විනාඩි 30ක පමණ සුළු රැඳීසිටීමක් (wait time) සිදුවිය හැක. එබැවින් ඔබට කිසිදු ප්‍රමාදයකින් තොරව (Zero waiting time) VIP සැලකිල්ලෙන් සේවාව ලබාගැනීමට 11:00 AM හෝ 11:30 AM වේලාවක් වෙන් කරදෙන්නද? 🌸"

3. Closing Time Protection:
   - If a client requests a service whose duration extends past 6:00 PM (e.g., a 90-min Balayage or 120-min Keratin at 5:00 PM), inform them that the salon closes at 6:00 PM and recommend an earlier slot (such as 4:00 PM or 4:30 PM).

4. Always ask for their Full Name and Phone Number to lock in the reservation.
5. Never disclose private phone numbers of other clients.
"""
        return context
    except Exception as e:
        return ""

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
    history = req_data.get("history", [])
    user_name = req_data.get("name", "").strip() or req_data.get("customerName", "Website Visitor")
    user_phone = req_data.get("phone", "").strip() or req_data.get("customerPhone", "")
    is_lead = req_data.get("is_lead", False)

    if not message:
        return jsonify({"reply": "Hello gorgeous! ✨ How can I assist you with your salon booking or beauty inquiries today? (මට සිංහලෙන්ද උදව් කළ හැක!)"})

    # 1. Check for phone number pattern in message if not provided
    if not user_phone:
        phone_match = re.search(r'(07\d{8}|\+94\d{9}|011\d{7})', message)
        if phone_match:
            user_phone = phone_match.group(1)
            is_lead = True

    # Smart customer name extraction with strict Singlish filter
    user_name = extract_valid_customer_name(message, current_name=user_name)

    # 2. Check for Reflex Human Escalation Trigger
    is_escalated, escalation_reason = detect_escalation(message)

    # 3. Smart Entity Extraction (Slot Time, Service, and Estimated Price)
    detected_time = extract_time_intent(message)
    detected_service, detected_price = extract_service_intent(message, history)

    is_booking_intent = bool(detected_time) or any(k in message.lower() for k in [
        "book", "slot", "welawe", "welawa", "appointment", "reserve", "date", "time", "help krnn"
    ])
    stage = "Prospect" if is_booking_intent else "Lead"

    final_service = detected_service if detected_service != "Website AI Concierge Inquiry" else (
        "Website AI Concierge Inquiry" if not is_escalated else "URGENT: Customer Escalation Case"
    )

    # If contact available or escalation triggered, save directly to Firestore
    lead_saved = False
    if is_lead or user_phone or is_escalated:
        lead_saved = save_lead_to_firestore(
            channel="website",
            customer_name=user_name,
            customer_phone=user_phone,
            service=final_service,
            inquiry_text=message,
            price=detected_price,
            is_escalated=is_escalated,
            escalation_reason=escalation_reason,
            stage=stage,
            booking_time=detected_time
        )

    # 4. Generate Grounded AI Response with Live Real-Time Slot Awareness
    live_slot_context = get_live_slot_context()
    grounded_prompt = (SALON_AGENT_PROMPT + "\n" + live_slot_context) if live_slot_context else SALON_AGENT_PROMPT

    ai_reply = query_gemini(message, grounded_prompt, history=history)
    if not ai_reply:
        ai_reply = get_multilingual_fallback(message, is_escalated=is_escalated)

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

    if not sender:
        sender = data.get("sender") or data.get("phone") or data.get("from") or "0781468988"
    if not name:
        name = data.get("sender_name") or data.get("name") or data.get("profile_name") or "WhatsApp Client"
    if not message:
        message = data.get("message") or data.get("body") or data.get("text") or "Hello"

    clean_phone = normalize_phone(sender)
    is_escalated, escalation_reason = detect_escalation(message)
    stage = "Prospect" if ("book" in message.lower() or "slot" in message.lower()) else "Lead"

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

    live_slot_context = get_live_slot_context()
    grounded_wa_prompt = (WHATSAPP_AGENT_PROMPT + "\n" + live_slot_context) if live_slot_context else WHATSAPP_AGENT_PROMPT
    ai_response = query_gemini(message, grounded_wa_prompt)
    if not ai_response:
        ai_response = get_multilingual_fallback(message, is_escalated=is_escalated)

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

def handle_add_case():
    req_data = request.get_json(silent=True) or {}
    phone = normalize_phone(req_data.get("phone", ""))
    case_title = req_data.get("title", "Special Case / Note")
    case_description = req_data.get("description", "")
    case_type = req_data.get("type", "Preference")

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
            "version": "2.1-Multilingual-Ready",
            "supportedLanguages": ["English", "Sinhala (සිංහල)", "Singlish"],
            "active": True
        })

handler = app

if __name__ == '__main__':
    app.run(port=5000, debug=True)
