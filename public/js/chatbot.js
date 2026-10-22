// public/js/chatbot.js
// Universal Autonomous Floating AI Concierge for Chanu Salon
// Auto-mounts on ANY webpage (Home, Login, Register, Admin CRM)

(function() {
    // 1. Auto-inject CSS stylesheet if missing
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

    // 2. Mount UI
    function injectChatbotHTML() {
        ensureStylesheets();

        // If old hardcoded widget exists, remove it so the new spacious widget mounts cleanly
        const oldWidget = document.getElementById('aiStylistWidget');
        if (oldWidget) oldWidget.remove();
        const oldModal = document.getElementById('aiChatModal');
        if (oldModal && !oldModal.closest('#aiChatbotMount')) oldModal.remove();

        if (document.getElementById('aiChatbotMount')) return;

        // Create Container
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
                        Hello gorgeous! 🌸 I am <strong>Anya</strong>, your Chanu Salon AI beauty advisor. How may I pamper you today? Feel free to ask about our bespoke haircuts, facials, bridal packages, or scheduling!
                    </div>
                    <div class="ai-quick-prompts" id="aiQuickPrompts">
                        <button onclick="askPrompt('What are your couture haircut rates?')"><i class="fas fa-cut" style="color: #e11d48;"></i> Haircut rates?</button>
                        <button onclick="askPrompt('What are the benefits of your Gold & Diamond facials?')"><i class="fas fa-sparkles" style="color: #e11d48;"></i> Facial treatments?</button>
                        <button onclick="askPrompt('How can I book an appointment slot?')"><i class="far fa-calendar-check" style="color: #e11d48;"></i> How to book a slot?</button>
                    </div>
                </div>
                <div class="ai-modal-footer">
                    <input type="text" id="aiInput" placeholder="Ask about styling, pricing, slots..." onkeypress="handleAIKeyPress(event)" autocomplete="off">
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

    // Close on Escape key
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

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        let replyText = "";
        if (response.ok) {
            const data = await response.json();
            replyText = data.reply || "Thank you for asking! How else may I assist you with your salon experience?";
        } else {
            replyText = "Hello from Chanu Salon! 🌸 Our services include Couture Haircuts (Rs. 1,500), Facials (Rs. 3,000), and Color (Rs. 5,000). You can reserve an exact slot directly on this page or call 070 446 8888!";
        }

        typingDiv.classList.remove('typing');
        typingDiv.innerHTML = formatChatText(replyText);
    } catch (err) {
        typingDiv.classList.remove('typing');
        typingDiv.innerHTML = "I am ready to help! 🌸 Please call our salon desk at <strong>070 446 8888</strong> or book your slot right here.";
    }

    chatBody.scrollTop = chatBody.scrollHeight;
};

function formatChatText(str) {
    if (!str) return '';
    // Convert *bold* to <strong>bold</strong>
    let formatted = str.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}
