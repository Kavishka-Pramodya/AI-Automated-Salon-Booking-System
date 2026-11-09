// Conversation History State for multi-turn conversational context

window._chanuChatHistory = window._chanuChatHistory || [];

try {

    const saved = sessionStorage.getItem('chanu_chat_history');

    if (saved) window._chanuChatHistory = JSON.parse(saved);

} catch (e) {

    window._chanuChatHistory = [];

}



// public/js/chatbot.js

// Universal Autonomous Floating AI Concierge for Chanu Salon

// Auto-mounts on ANY webpage (Home, Login, Register, Admin CRM)



(function() {

    function ensureStylesheets() {

        if (!document.querySelector('link[href*="chatbot.css"]')) {

            const link = document.createElement('link');

            link.rel = 'stylesheet';

            link.href = 'css/chatbot.css';

            document.head.appendChild(link);

        }

        if (!document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="fontawesome"]')) {

            const fa = document.createElement('link');

            fa.rel = 'stylesheet';

            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';

            document.head.appendChild(fa);

        }

    }



    function injectChatbotHTML() {

        ensureStylesheets();



        const oldWidget = document.getElementById('aiStylistWidget');

        if (oldWidget) oldWidget.remove();

        const oldModal = document.getElementById('aiChatModal');

        if (oldModal && !oldModal.closest('#aiChatbotMount')) oldModal.remove();



        if (document.getElementById('aiChatbotMount')) return;



        const container = document.createElement('div');

        container.id = 'aiChatbotMount';

        container.innerHTML = `

            <!-- Floating Launcher Widget -->

            <div class="ai-widget-launcher" id="aiLauncherBtn" onclick="toggleAIChat()" title="Open Chanu AI Stylist Concierge">

                <div class="ai-widget-icon">

                    <i class="fas fa-magic"></i>

                </div>

                <div class="ai-widget-text">

                    <span class="ai-badge-title">Anya | AI Stylist</span>

                    <span class="ai-badge-sub">Ask rates, advice, slots</span>

                </div>

            </div>



            <!-- Spacious Luxury Chat Modal -->

            <div class="ai-chat-modal" id="aiChatModal" role="dialog" aria-modal="true">

                <div class="ai-modal-header">

                    <div class="ai-header-left">

                        <div class="ai-avatar"><i class="fas fa-crown"></i></div>

                        <div class="ai-header-info">

                            <h4>Anya • AI Beauty Concierge</h4>

                            <span class="ai-online-status">Online • Instant VIP Answers</span>

                        </div>

                    </div>

                    <button class="ai-close-btn" onclick="toggleAIChat()" title="Close">&times;</button>

                </div>

                <div class="ai-modal-body" id="aiChatBody">

                    <div class="ai-msg bot">

                        Hello gorgeous! 🌸 I am <strong>Anya</strong>, your Chanu Salon AI beauty concierge. Feel free to ask in English, සිංහලෙන්, or Singlish about our haircuts, facials, bridal packages, or scheduling!

                    </div>

                    <div class="ai-quick-prompts" id="aiQuickPrompts">

                        <button onclick="askPrompt('කොණ්ඩේ කපන්න සහ Facials වලට ගණන් කීයද?')"><i class="fas fa-cut" style="color: #e11d48;"></i> කොණ්ඩේ & Facial ගණන්?</button>

                        <button onclick="askPrompt('What are your couture haircut rates?')"><i class="fas fa-sparkles" style="color: #e11d48;"></i> Haircut rates?</button>

                        <button onclick="askPrompt('What are the benefits of your Gold & Diamond facials?')"><i class="fas fa-sparkles" style="color: #e11d48;"></i> Facial treatments?</button>

                        <button onclick="askPrompt('How can I book an appointment slot?')"><i class="far fa-calendar-check" style="color: #e11d48;"></i> How to book a slot?</button>

                        <button onclick="requestCallbackLead()"><i class="fas fa-phone-alt" style="color: #e11d48;"></i> Request VIP Callback / Book</button>

                        <button onclick="askPrompt('I would like to speak directly with the Salon Director regarding my service.')" style="border-color: #fca5a5; color: #dc2626;"><i class="fas fa-user-shield"></i> Manager Assistance</button>

                    </div>

                </div>

                <div class="ai-modal-footer">

                    <input type="text" id="aiInput" placeholder="Ask in English or සිංහල" onkeypress="handleAIKeyPress(event)" autocomplete="off">

                    <button onclick="sendAIMessage()" title="Send"><i class="fas fa-paper-plane"></i></button>

                </div>

            </div>

        `;

        document.body.appendChild(container);

    }



    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', injectChatbotHTML);

    } else {

        injectChatbotHTML();

    }



    document.addEventListener('keydown', (e) => {

        if (e.key === 'Escape') {

            const modal = document.getElementById('aiChatModal');

            if (modal && modal.classList.contains('active')) {

                modal.classList.remove('active');

            }

        }

    });

})();



window.toggleAIChat = function() {

    const modal = document.getElementById('aiChatModal');

    if (!modal) return;

    modal.classList.toggle('active');

    if (modal.classList.contains('active')) {

        const user = JSON.parse(localStorage.getItem('chanu_user') || 'null');
        if (user && (user.fullName || user.username) && (!window._chanuChatHistory || window._chanuChatHistory.length === 0)) {
            const initialBotBubble = document.querySelector('#aiChatBody .ai-msg.bot');
            if (initialBotBubble) {
                const displayName = escapeHtml(user.fullName || user.username);
                initialBotBubble.innerHTML = `Hello <strong>${displayName}</strong>! 🌸 Welcome back to your Chanu Salon Sanctuary. As our valued registered member, how may I assist you with your styling, treatments, or scheduling today?`;
            }
        }

        const input = document.getElementById('aiInput');

        if (input) setTimeout(() => input.focus(), 250);

    }

};



window.askPrompt = function(question) {

    const input = document.getElementById('aiInput');

    if (input) {

        input.value = question;

        window.sendAIMessage();

    }

};



window.requestCallbackLead = function() {

    const user = JSON.parse(localStorage.getItem('chanu_user') || 'null');

    const chatBody = document.getElementById('aiChatBody');

    if (!chatBody) return;



    if (user && user.phone) {

        const text = `Please have the reception team call me (${user.fullName || user.username} - ${user.phone}) to book my treatment appointment.`;

        const userDiv = document.createElement('div');

        userDiv.className = 'ai-msg user';

        userDiv.textContent = text;

        chatBody.appendChild(userDiv);



        const botDiv = document.createElement('div');

        botDiv.className = 'ai-msg bot';

        botDiv.innerHTML = `🌸 Wonderful, <strong>${escapeHtml(user.fullName || user.username)}</strong>! I have immediately logged your booking inquiry into our <strong>Live Cloud CRM</strong>. Our master stylists will contact you at <code>${escapeHtml(user.phone)}</code> shortly!`;

        chatBody.appendChild(botDiv);

        chatBody.scrollTop = chatBody.scrollHeight;



        // Fire background lead to API

        fetch('/api/chat', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

                message: text,

                name: user.fullName || user.username,

                phone: user.phone,

                is_lead: true,
                is_authenticated: true

            })

        }).catch(() => {});

    } else {

        const botDiv = document.createElement('div');

        botDiv.className = 'ai-msg bot';

        botDiv.innerHTML = `I would love to arrange your slot! 🌸 Please enter your <strong>Full Name and Mobile Phone Number</strong> (e.g. <em>Anuki Perera 071XXXXXXX</em>) in the box below so our reception team can confirm your booking.`;

        chatBody.appendChild(botDiv);

        chatBody.scrollTop = chatBody.scrollHeight;



        const input = document.getElementById('aiInput');

        if (input) {

            input.placeholder = "Enter your Full Name & Phone (e.g. Anuki 071XXXXXXX)...";

            input.focus();

        }

    }

};



window.handleAIKeyPress = function(e) {

    if (e.key === 'Enter') {

        window.sendAIMessage();

    }

};



window.sendAIMessage = async function() {

    const input = document.getElementById('aiInput');

    const chatBody = document.getElementById('aiChatBody');

    if (!input || !chatBody) return;



    const text = input.value.trim();

    if (!text) return;



    // Render User Bubble

    const userDiv = document.createElement('div');

    userDiv.className = 'ai-msg user';

    userDiv.textContent = text;

    chatBody.appendChild(userDiv);

    input.value = '';

    chatBody.scrollTop = chatBody.scrollHeight;



    // Render Typing Bubble

    const typingDiv = document.createElement('div');

    typingDiv.className = 'ai-msg bot typing';

    typingDiv.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

    chatBody.appendChild(typingDiv);

    chatBody.scrollTop = chatBody.scrollHeight;



    // Append user message to multi-turn conversation history

    window._chanuChatHistory.push({ role: 'user', content: text });



    // Store customer phone in localStorage if provided in message

    const phoneMatch = text.match(/(07\d{8}|\+94\d{9}|011\d{7})/);

    if (phoneMatch) {

        try {

            localStorage.setItem('chanu_client_phone', phoneMatch[1]);

        } catch(e) {}

    }



    // Smart customer name extraction with strict stop-word validation
    const stopWords = new Set([
        "ow", "na", "ne", "ehema", "krl", "krla", "karala", "denna", "dennam", "danna", 
        "mona", "magulakda", "magulkda", "appa", "puluwanda", "bari", "kiyakda", "kiyada", 
        "kiyanna", "bada", "hari", "kamak", "welawe", "welawa", "kohomada", "meka", "thawa", 
        "mata", "ona", "ane", "manda", "mokakda", "kawadada", "help", "thanks", "appointment", 
        "booking", "slot", "slots", "karanna", "karana", "ganna", "balanna", "balayage", 
        "color", "colour", "facial", "haircut", "treatment", "price", "rates", "ude", "hawasa", 
        "today", "ada", "adha", "yes", "sure", "okay", "ok", "fine", "good", "morning", 
        "afternoon", "hi", "hello", "hey", "please", "call", "me", "is", "and", "the", "for",
        "name", "nama", "mage", "oyata", "oya", "salon", "chanu"
    ]);

    // Only extract if accompanied by phone or explicit name trigger
    let detectedName = "";
    const explicitNameMatch = text.match(/(?:my\s+name\s+is|mage\s+nama\s+is?|name\s*:?|nama\s*:?)\s*([A-Za-z\s]{3,30})/i);
    if (explicitNameMatch) {
        const words = explicitNameMatch[1].trim().split(/\s+/);
        if (words.length >= 1 && !words.some(w => stopWords.has(w.toLowerCase()))) {
            detectedName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
    } else if (phoneMatch) {
        const withoutPhone = text.replace(/(07\d{8}|\+94\d{9}|011\d{7})/g, '').replace(/[^a-zA-Z\s]/g, ' ').trim();
        const words = withoutPhone.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w.toLowerCase()));
        if (words.length >= 2 && words.length <= 4) {
            detectedName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
    }

    if (detectedName) {
        try {
            localStorage.setItem('chanu_client_name', detectedName);
        } catch(e) {}
    }

    const user = JSON.parse(localStorage.getItem('chanu_user') || 'null');

    // Only attach user info if logged in, OR if user actually provided phone in current conversation
    let activePhone = "";
    let activeName = "Website Visitor";
    let isActivelyProvidedLead = false;

    if (user && user.phone) {
        activePhone = user.phone;
        activeName = user.fullName || user.username || "Client";
    } else if (phoneMatch) {
        activePhone = phoneMatch[1];
        activeName = detectedName || "Website Visitor";
        isActivelyProvidedLead = true;
    }

    const payload = {
        message: text,
        history: window._chanuChatHistory.slice(-10),
        name: activeName,
        phone: activePhone,
        is_lead: isActivelyProvidedLead,
        is_authenticated: !!(user && user.phone)
    };



    try {

        const response = await fetch('/api/chat', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify(payload)

        });



        let replyText = "";

        let leadSaved = false;

        let isEscalated = false;



        if (response.ok) {

            const data = await response.json();

            replyText = data.reply || "Thank you for asking! How else may I assist you with your salon experience?";

            leadSaved = data.lead_saved;

            isEscalated = data.is_escalated;

        } else {

            replyText = "Hello from Chanu Salon! 🌸 Our services include Couture Haircuts (Rs. 1,500), Facials (Rs. 3,000), and Color (Rs. 5,000). You can reserve an exact slot directly on this page or call 070 446 8888!";

        }



        // Append assistant reply to conversation history

        window._chanuChatHistory.push({ role: 'assistant', content: replyText });

        try {

            sessionStorage.setItem('chanu_chat_history', JSON.stringify(window._chanuChatHistory.slice(-12)));

        } catch (e) {}



        typingDiv.classList.remove('typing');

        let formatted = formatChatText(replyText);

        if (isEscalated) {
            formatted += `<div style="margin-top: 10px; padding: 8px 12px; background: rgba(254, 242, 242, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(254, 202, 202, 0.8); border-radius: 10px; font-size: 11.5px; color: #991b1b; font-weight: 700;"><i class="fas fa-shield-alt"></i> Priority Hand-Off: Your inquiry has been escalated directly to our Salon Director's CRM console.</div>`;
        } else if (leadSaved && (phoneMatch || (user && user.phone))) {
            formatted += `<div style="margin-top: 8px; font-size: 11.5px; color: #059669; font-weight: 700; background: rgba(236, 253, 245, 0.85); backdrop-filter: blur(8px); padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(167, 243, 208, 0.8); display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-check-circle"></i> Your contact has been registered into our Live CRM Lead Stream!</div>`;
        }

        typingDiv.innerHTML = formatted;

    } catch (err) {

        typingDiv.classList.remove('typing');

        const isSinhala = /[\u0D80-\u0DFF]/.test(text) || /(sinhala|sinhalen|puluwan|kiyada|ganan|karanna|danna)/i.test(text);

        typingDiv.innerHTML = isSinhala 

            ? "මම ඔබට උදව් කිරීමට සූදානම්! 🌸 අපගේ සැලෝන් පිළිගැනීමේ අංශය (070 446 8888) අමතන්න හෝ මෙම පිටුවෙන්ම ඔබගේ Slot එක වෙන් කරගන්න."

            : "I am ready to help! 🌸 Please call our salon desk at <strong>070 446 8888</strong> or book your slot right here.";

    }



    chatBody.scrollTop = chatBody.scrollHeight;

};



function formatChatText(str) {

    if (!str) return '';

    let formatted = str.replace(/\*(.*?)\*/g, '<strong>$1</strong>');

    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;

}





// ------------------------------------------------------------------------------

// CUSTOMER CONFIRMATION ALERT & WEBAUDIO CHIME (Slide 9 & Customer Reflexes)

// ------------------------------------------------------------------------------

function playCustomerChime() {

    try {

        const AudioCtx = window.AudioContext || window.webkitAudioContext;

        if (!AudioCtx) return;

        const ctx = new AudioCtx();

        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        

        // Chime Note 1: E5 (659.25 Hz)

        const osc1 = ctx.createOscillator();

        const gain1 = ctx.createGain();

        osc1.type = 'sine';

        osc1.frequency.setValueAtTime(659.25, now);

        gain1.gain.setValueAtTime(0.25, now);

        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain1);

        gain1.connect(ctx.destination);

        osc1.start(now);

        osc1.stop(now + 0.35);



        // Chime Note 2: B5 (987.77 Hz)

        const osc2 = ctx.createOscillator();

        const gain2 = ctx.createGain();

        osc2.type = 'sine';

        osc2.frequency.setValueAtTime(987.77, now + 0.12);

        gain2.gain.setValueAtTime(0.3, now + 0.12);

        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc2.connect(gain2);

        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);

        osc2.stop(now + 0.7);

    } catch (e) {

        console.warn('Audio chime notice:', e);

    }

}



function showCustomerConfirmationAlert(title, message) {

    playCustomerChime();



    let toast = document.getElementById('chanuCustomerConfirmAlert');

    if (toast) toast.remove();



    toast = document.createElement('div');

    toast.id = 'chanuCustomerConfirmAlert';

    toast.className = 'chanu-customer-confirm-toast';

    toast.innerHTML = `

        <div class="toast-crown-icon"><i class="fas fa-crown"></i></div>

        <div class="toast-content-wrapper">

            <h4 class="toast-title">${title || 'Appointment Confirmed! 🎉'}</h4>

            <p class="toast-description">${message || 'Your appointment at Chanu Salon has been confirmed by our Salon Director. We are excited to welcome you!'}</p>

        </div>

        <button type="button" class="toast-dismiss-btn" onclick="this.closest('#chanuCustomerConfirmAlert').remove()">&times;</button>

    `;



    document.body.appendChild(toast);



    // Also append greeting to Anya Chatbot window if open

    const chatBody = document.getElementById('aiChatBody');

    if (chatBody) {

        const botNotice = document.createElement('div');

        botNotice.className = 'ai-msg bot';

        botNotice.style.background = '#ecfdf5';

        botNotice.style.border = '1px solid #a7f3d0';

        botNotice.style.color = '#065f46';

        botNotice.innerHTML = `<strong><i class="fas fa-check-circle" style="color: #059669;"></i> Live Update:</strong> Your booking has just been <strong>CONFIRMED</strong> by Chanu Salon Management! 💖 Our master stylists look forward to pampering you.`;

        chatBody.appendChild(botNotice);

        chatBody.scrollTop = chatBody.scrollHeight;

    }



    setTimeout(() => {

        if (toast && toast.parentElement) {

            toast.style.opacity = '0';

            toast.style.transition = 'opacity 0.4s';

            setTimeout(() => toast.remove(), 420);

        }

    }, 9000);

}




// Warning Chime (E4 + C4 low soft chime)
function playCustomerWarningChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(392.00, now);
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(329.63, now + 0.15);
        gain2.gain.setValueAtTime(0.28, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.65);
    } catch (e) {
        console.warn('Audio notice:', e);
    }
}

function showCustomerCancellationAlert(title, message) {
    playCustomerWarningChime();

    let toast = document.getElementById('chanuCustomerCancelAlert');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'chanuCustomerCancelAlert';
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: #ffffff;
        color: #0f172a;
        padding: 16px 20px;
        border-radius: 16px;
        border-left: 5px solid #ef4444;
        box-shadow: 0 15px 35px rgba(239, 68, 68, 0.25), 0 5px 15px rgba(0,0,0,0.08);
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 14px;
        max-width: 420px;
        animation: slideInUp 0.4s ease;
    `;

    toast.innerHTML = `
        <div style="width: 40px; height: 40px; border-radius: 12px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div style="flex: 1;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #dc2626;">${title || 'Appointment Notice: Cancelled'}</h4>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; line-height: 1.4;">${message || 'Your appointment has been cancelled by salon management. Please contact reception at 070 446 8888 or message Anya to reschedule.'}</p>
        </div>
        <button type="button" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;" onclick="this.closest('#chanuCustomerCancelAlert').remove();">&times;</button>
    `;

    document.body.appendChild(toast);

    // Append to Anya chatbot window if open
    const chatBody = document.getElementById('aiChatBody');
    if (chatBody) {
        const botNotice = document.createElement('div');
        botNotice.className = 'ai-msg bot';
        botNotice.style.background = '#fef2f2';
        botNotice.style.border = '1px solid #fecaca';
        botNotice.style.color = '#991b1b';
        botNotice.innerHTML = `<strong><i class="fas fa-times-circle" style="color: #dc2626;"></i> Appointment Notice:</strong> Your booking has been cancelled by Chanu Salon Management. If you'd like to pick another time slot or speak with us, please message me here or call reception at 070 446 8888! 🌸`;
        chatBody.appendChild(botNotice);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s';
            setTimeout(() => toast.remove(), 400);
        }
    }, 12000);
}

function initCustomerConfirmationMonitor() {
    window.addEventListener('storage', (e) => {
        if (e.key === 'chanu_last_confirmed_id' && e.newValue) {
            const alertedKey = 'chanu_notified_confirm_' + e.newValue;
            if (!sessionStorage.getItem(alertedKey)) {
                sessionStorage.setItem(alertedKey, 'true');
                showCustomerConfirmationAlert(
                    'Appointment Confirmed! 🎉',
                    'Your appointment at Chanu Salon has been officially confirmed by our Salon Director.'
                );
            }
        } else if (e.key === 'chanu_last_cancelled_id' && e.newValue) {
            const alertedKey = 'chanu_notified_cancel_' + e.newValue;
            if (!sessionStorage.getItem(alertedKey)) {
                sessionStorage.setItem(alertedKey, 'true');
                showCustomerCancellationAlert(
                    'Appointment Notice: Cancelled',
                    'Your appointment at Chanu Salon has been cancelled by salon management. Please contact reception at 070 446 8888 or message Anya to reschedule.'
                );
            }
        }
    });

    setInterval(() => {
        const lastConfirmedId = localStorage.getItem('chanu_last_confirmed_id');
        const lastConfirmedTime = parseInt(localStorage.getItem('chanu_last_confirmed_time') || '0', 10);
        if (lastConfirmedId && Date.now() - lastConfirmedTime < 60000) {
            const alertedKey = 'chanu_notified_confirm_' + lastConfirmedId;
            if (!sessionStorage.getItem(alertedKey)) {
                sessionStorage.setItem(alertedKey, 'true');
                showCustomerConfirmationAlert(
                    'Appointment Confirmed! 🎉',
                    'Your appointment at Chanu Salon has been officially confirmed by our Salon Director.'
                );
            }
        }

        const lastCancelledId = localStorage.getItem('chanu_last_cancelled_id');
        const lastCancelledTime = parseInt(localStorage.getItem('chanu_last_cancelled_time') || '0', 10);
        if (lastCancelledId && Date.now() - lastCancelledTime < 60000) {
            const alertedKey = 'chanu_notified_cancel_' + lastCancelledId;
            if (!sessionStorage.getItem(alertedKey)) {
                sessionStorage.setItem(alertedKey, 'true');
                showCustomerCancellationAlert(
                    'Appointment Notice: Cancelled',
                    'Your appointment at Chanu Salon has been cancelled by salon management. Please contact reception at 070 446 8888 or message Anya to reschedule.'
                );
            }
        }
    }, 3000);
}

if (typeof window !== 'undefined') {
    initCustomerConfirmationMonitor();
}
