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
                    <input type="text" id="aiInput" placeholder="Ask in English or සිංහලෙන් (e.g. කොණ්ඩේ කපන්න කීයද?)..." onkeypress="handleAIKeyPress(event)" autocomplete="off">
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
                is_lead: true
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

    const user = JSON.parse(localStorage.getItem('chanu_user') || 'null');
    const payload = {
        message: text,
        history: window._chanuChatHistory.slice(-10),
        name: user ? (user.fullName || user.username) : "Website Visitor",
        phone: user ? (user.phone || "") : ""
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
            formatted += `<div style="margin-top: 10px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 11.5px; color: #991b1b; font-weight: 700;"><i class="fas fa-shield-alt"></i> Priority Hand-Off: Your inquiry has been escalated directly to our Salon Director's CRM console.</div>`;
        } else if (leadSaved) {
            formatted += `<div style="margin-top: 8px; font-size: 11.5px; color: #059669; font-weight: 700;"><i class="fas fa-check-circle"></i> Your contact has been registered into our Live CRM Lead Stream!</div>`;
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

function initCustomerConfirmationMonitor() {
    window.addEventListener('storage', (e) => {
        if (e.key === 'chanu_last_confirmed_id' && e.newValue) {
            const alertedKey = 'chanu_notified_' + e.newValue;
            if (!sessionStorage.getItem(alertedKey)) {
                sessionStorage.setItem(alertedKey, 'true');
                showCustomerConfirmationAlert(
                    'Appointment Confirmed! 🎉',
                    'Your appointment at Chanu Salon has been officially confirmed by our Salon Director.'
                );
            }
        }
    });

    setInterval(() => {
        const lastConfirmedId = localStorage.getItem('chanu_last_confirmed_id');
        const lastConfirmedTime = parseInt(localStorage.getItem('chanu_last_confirmed_time') || '0', 10);
        
        if (lastConfirmedId && Date.now() - lastConfirmedTime < 60000) {
            const alertedKey = 'chanu_notified_' + lastConfirmedId;
            if (!sessionStorage.getItem(alertedKey)) {
                sessionStorage.setItem(alertedKey, 'true');
                showCustomerConfirmationAlert(
                    'Appointment Confirmed! 🎉',
                    'Your appointment at Chanu Salon has been officially confirmed by our Salon Director.'
                );
            }
        }
    }, 4000);
}

if (typeof window !== 'undefined') {
    initCustomerConfirmationMonitor();
}
