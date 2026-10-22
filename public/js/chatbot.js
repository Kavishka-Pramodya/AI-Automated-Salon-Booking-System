// public/js/chatbot.js
// Modern Floating AI Concierge Widget connecting to /api/chat

window.toggleAIChat = function() {
    const modal = document.getElementById('aiChatModal');
    if (modal) modal.classList.toggle('active');
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
            body: jsonPayload(text)
        });

        let replyText = "";
        if (response.ok) {
            const data = await response.json();
            replyText = data.reply || "Thank you for asking! How else may I assist you with your salon experience?";
        } else {
            replyText = "Chanu Salon welcomes you! 🌸 Our services include Couture Haircuts (Rs. 1,500), Facials (Rs. 3,000), and Color (Rs. 5,000). You can reserve an exact slot right above!";
        }

        typingDiv.classList.remove('typing');
        // Format markdown asterisks or linebreaks into HTML
        typingDiv.innerHTML = formatChatText(replyText);
    } catch (err) {
        typingDiv.classList.remove('typing');
        typingDiv.innerHTML = "I am ready to help! 🌸 Please select a service and slot on this page, or call our team at <strong>070 446 8888</strong>.";
    }

    chatBody.scrollTop = chatBody.scrollHeight;
};

function jsonPayload(msg) {
    return JSON.stringify({ message: msg });
}

function formatChatText(str) {
    // Convert *bold* to <strong>bold</strong>
    let formatted = str.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}
