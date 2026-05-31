(function(){
  const toggle = document.getElementById('chatbotToggle');
  const windowEl = document.getElementById('chatbotWindow');
  const messages = document.getElementById('chatbotMessages');
  const input = document.getElementById('chatbotInput');
  const send = document.getElementById('chatbotSend');
  const closeBtn = document.getElementById('chatClose');

  function createBubble(content, from='bot'){
    const wrap = document.createElement('div');
    wrap.className = 'bubble ' + (from === 'user' ? 'user' : 'bot');

    if (from === 'bot'){
      const img = document.createElement('img');
      img.src = '/uploads/avatars/chat-avatar.png?v=1';
      img.alt = 'Fashion Hub Assistant';
      img.onerror = function(){ this.onerror = null; this.src = '/uploads/avatars/chat-avatar.png?v=1'; };
      const text = document.createElement('div');
      text.innerHTML = content;
      wrap.appendChild(img);
      wrap.appendChild(text);
    } else {
      wrap.textContent = content;
    }

    return wrap;
  }

  function appendMessage(text, from='bot'){
    const bubble = createBubble(text, from);
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function showInitialGreeting(){
    if (messages.children.length) return;
    // small delay to feel natural
    setTimeout(() => appendMessage('Hi there 👋\nI can help with orders, products, or account questions.', 'bot'), 350);
  }

  toggle.addEventListener('click', () => {
    const isHidden = windowEl.style.display === 'none' || !windowEl.style.display;
    windowEl.style.display = isHidden ? 'flex' : 'none';
    windowEl.setAttribute('aria-hidden', !isHidden);
    if (isHidden) showInitialGreeting();
  });

  if (closeBtn) closeBtn.addEventListener('click', () => {
    windowEl.style.display = 'none';
    windowEl.setAttribute('aria-hidden', 'true');
  });

  send.addEventListener('click', () => {
    const text = input.value && input.value.trim();
    if (!text) return;
    appendMessage(text, 'user');
    input.value = '';

    // Simple canned responses for demonstration
    if (/health|status|running/i.test(text)) {
      setTimeout(() => appendMessage('Server is running. You can browse the site at http://localhost:3000', 'bot'), 600);
    } else if (/product|products/i.test(text)) {
      setTimeout(() => appendMessage('We have electronics, fashion, and home products. Visit /products.html', 'bot'), 600);
    } else {
      setTimeout(() => appendMessage('Thanks for your message — this is a demo chatbot.', 'bot'), 700);
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') send.click();
  });
})();
