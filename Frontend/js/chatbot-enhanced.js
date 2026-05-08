(function(){
  // Enhanced chatbot - handles multiple page variants and provides richer canned responses
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

  function findToggleButtons(){
    return $all('#chatbotToggle, #chatbot-toggle, .chat-toggle');
  }
  function findChatWindow(){
    return $('#chatbotWindow') || $('#chatbot-window') || $('#chatbotWindow') || $('#chatbot-window') || $('#chatbotWindow');
  }
  function findMessagesContainer(){
    return $('#chatbotMessages') || $('#chatbot-messages') || $('#chatbotMessages') || $('#chatbot-messages');
  }

  function createBubble(content, from='bot'){
    const wrap = document.createElement('div');
    wrap.className = 'bubble ' + (from === 'user' ? 'user' : 'bot');
    wrap.setAttribute('role','article');
    wrap.setAttribute('aria-label', from === 'user' ? 'User message' : 'Assistant message');

    if (from === 'bot'){
      const img = document.createElement('img');
      img.src = '/uploads/avatars/chat-avatar.png?v=2';
      img.alt = 'Zenrix Assistant';
      img.onerror = function(){ this.onerror = null; this.src = '/uploads/avatars/chat-avatar.png?v=2'; };
      img.width = 48; img.height = 48;
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
    const messages = findMessagesContainer();
    if (!messages) return;
    const bubble = createBubble(text, from);
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    
    // Save to conversation history
    saveChatHistory(text, from);
  }

  // Typing indicator
  function showTypingIndicator(){
    const messages = findMessagesContainer();
    if (!messages) return;
    const wrap = document.createElement('div');
    wrap.className = 'bubble bot typing-indicator';
    wrap.id = 'typing-indicator';
    wrap.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTypingIndicator(){
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  // Conversation history
  function saveChatHistory(text, from){
    try {
      const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      history.push({ text, from, timestamp: new Date().toISOString() });
      if (history.length > 50) history.shift(); // Keep last 50 messages
      localStorage.setItem('chatHistory', JSON.stringify(history));
    } catch(e) { /* ignore */ }
  }

  function getChatHistory(){
    try {
      return JSON.parse(localStorage.getItem('chatHistory') || '[]');
    } catch(e) { return []; }
  }

  function clearChatHistory(){
    localStorage.removeItem('chatHistory');
  }

  // Richer responses
  const canned = [
    {p:/\b(hello|hi|hey|namaste|what can you do|help|faq)\b/i, r: "Namaste! 👋 I'm Zenrix Assistant (नमस्ते). I can help with:<br>📦 <strong>Orders</strong> - Track & manage your orders<br>🛍️ <strong>Products</strong> - Browse & find items<br>🚚 <strong>Delivery</strong> - Shipping info & timelines<br>🔄 <strong>Returns</strong> - Easy 30-day returns<br>💳 <strong>Payment</strong> - Payment methods & issues<br>🎟️ <strong>Support</strong> - Create tickets & reach our team<br><br>Just ask me anything or say 'open ticket' for support!"},
    {p:/\b(order status|track order|where is my order|my order|order id)\b/i, r: "📦 <strong>Track Your Order:</strong><br>1. Go to <a href=\"/orders.html\">My Orders</a><br>2. Click any order to see status<br>3. View delivery timeline & tracking<br><br>Need help? Tell me your Order ID and I'll assist. Or say 'open ticket' to contact support."},
    {p:/\b(return|refund|how to return|returns|exchange|send back)\b/i, r: "🔄 <strong>Easy 30-Day Returns:</strong><br>✓ <strong>Timeframe:</strong> 30 days from delivery<br>✓ <strong>How:</strong> Orders → Select item → 'Return'<br>✓ <strong>Refund:</strong> 5-7 business days after we receive it<br>✓ <strong>Condition:</strong> Unused, original packaging<br><br><strong>Exceptions:</strong> Customized items, opened electronics (some exclusions apply)<br><br>Ready to return? Go to <a href=\"/orders.html\">Orders</a> now."},
    {p:/\b(shipping|delivery|ship|delivery time|how long|when will|when arrives)\b/i, r: "🚚 <strong>Delivery Info:</strong><br>⏱️ <strong>Speed:</strong> 3–5 business days (standard)<br>📍 <strong>Remote Areas:</strong> 5–10 business days<br>🚀 <strong>Express:</strong> 1–2 days (selected items)<br>💰 <strong>Free Shipping:</strong> Orders over रु 7,500<br>🆓 <strong>Charges:</strong> रु 99 for standard on smaller orders<br><br>Track your shipment after it ships. Questions? Say 'open ticket'."},
    {p:/\b(product|products|catalog|category|browse|shop|what do you sell)\b/i, r: "🛍️ <strong>Shop Our Catalog:</strong><br>→ <a href=\"/products.html\">Browse All Products</a><br><br>Looking for something specific? I can help:<br>• Ask for a product name (e.g., 'headphones')<br>• Ask for a product ID (24-char code)<br>• Ask about categories: electronics, fashion, home<br>• Ask about sales & discounts<br><br>Or check our featured items on the home page!"},
    {p:/\b(price|cost|how much|price of|expensive|cheap|discount|sale)\b/i, r: "💰 <strong>Pricing & Discounts:</strong><br>📌 Prices vary by product (see product pages)<br>🎉 Check for ongoing <strong>Sales & Deals</strong><br>💳 Payment plans may be available<br>🤝 <strong>Bulk Pricing:</strong> Email {supportEmail} for wholesale rates<br><br>Want to find a specific price range? Try browsing our <a href=\"/products.html\">Products</a>."},
    {p:/\b(payment|pay|payment methods|card|wallet|upi|esewa|khalti|phonepay)\b/i, r: "💳 <strong>Payment Methods:</strong><br>✓ Credit Card (Visa, Mastercard)<br>✓ Debit Card<br>✓ eSewa (Local)<br>✓ Khalti (Local)<br>✓ Bank Transfer<br><br><strong>Issues?</strong> Email {supportEmail} with:<br>• Order ID<br>• Payment reference<br>• Screenshot of receipt<br><br>We'll investigate within 24 hours."},
    {p:/\b(account|profile|login|register|password|forgot|reset)\b/i, r: "👤 <strong>Account Management:</strong><br><a href=\"/login.html\">Login</a> | <a href=\"/register.html\">Create Account</a><br><br>✓ <strong>Forgot Password?</strong> Click 'Forgot Password' on login page<br>✓ <strong>Edit Profile:</strong> <a href=\"/profile.html\">My Profile</a><br>✓ <strong>Change Password:</strong> Profile Settings<br>✓ <strong>Issues?</strong> Say 'open ticket' or email {supportEmail}"},
    {p:/\b(contact|support|help|agent|human|speak|talk|representative|customer service)\b/i, r: "📞 <strong>Get Support:</strong><br>📧 <strong>Email:</strong> <a href=\"mailto:{supportEmail}\">{supportEmail}</a><br>🎟️ <strong>Support Ticket:</strong> Say 'open ticket' right now<br>⏰ <strong>Hours:</strong> Mon-Fri 9AM–6PM Nepal Time<br>🕐 <strong>Emergency:</strong> Contact by email with 'URGENT' tag<br><br>I can create a ticket for you instantly. Want to?"},
    {p:/\b(cancel order|cancel|cancellation)\b/i, r: "❌ <strong>Cancel Your Order:</strong><br><br><strong>Quick Cancel:</strong> Go to <a href=\"/orders.html\">Orders</a> → 'Cancel' (within 24 hours)<br><br><strong>After Shipped:</strong> Can't cancel, but easy returns!<br>• 🔄 Return within 30 days<br>• Get full refund (5-7 days)<br><br><strong>Having issues?</strong> Say 'open ticket' for help."},
    {p:/\b(warranty|guarantee|defective|broken|damage|not working)\b/i, r: "🛡️ <strong>Warranty & Defects:</strong><br>📋 Electronics: Usually 1-year manufacturer warranty<br>📋 Fashion: 6-month defect coverage<br>📋 Home: Varies by product<br><br><strong>Claim Process:</strong><br>1. Say 'open ticket' with proof (photo/video)<br>2. Describe the issue<br>3. We'll arrange replacement or repair<br><br>Check your product page for specific warranty terms."},
    {p:/\b(career|jobs|work with|hiring|apply|join)\b/i, r: "💼 <strong>Careers at Zenrix:</strong><br>📄 Check our <a href=\"/careers.html\">Careers Page</a><br>📧 Email: <strong>hr@zenrix.com.np</strong><br><br>Include: CV + Position of Interest<br><br>We're always looking for talented people! 🚀"},
    {p:/\b(privacy|data|gdpr|personal information|cookies)\b/i, r: "🔐 <strong>Privacy & Security:</strong><br>📖 Read our <a href=\"/privacy.html\">Privacy Policy</a><br>📧 Data requests: <strong>privacy@zenrix.com.np</strong><br><br>Your data is safe with us. Encrypted & secure. Questions? Contact us anytime."},
    {p:/\b(thank|thanks|thank you|appreciate|cool|great|awesome)\b/i, r: "😊 You're welcome! Happy to help. Anything else I can assist with?"}
  ];

  function resolvePlaceholders(t){
    if (!t || typeof t !== 'string') return t;
    const support = (window.ZENRIX_SUPPORT_EMAIL || (localStorage.getItem('siteSettings') ? JSON.parse(localStorage.getItem('siteSettings')).supportEmail : null) || 'support@zenrix.com');
    const legal = (localStorage.getItem('siteSettings') ? JSON.parse(localStorage.getItem('siteSettings')).legalEmail : null) || 'legal@zenrix.com.np';
    return t.replace(/{supportEmail}/g, support).replace(/{legalEmail}/g, legal);
  }

  function handleUserMessage(msg){
    const text = String(msg || '').trim();
    if (!text) return appendMessage('Please type a short message so I can help.', 'bot');

    // Quick clarifying response for terse 'how' queries
    const low = text.toLowerCase();
    if (low === 'how' || low === 'how?'){
      return appendMessage('Do you mean: "how to return an item", "how delivery works", or "how to place an order"? Tell me which one and I\'ll explain the steps.', 'bot');
    }

    // Product id detection (Mongo ObjectId-like 24 hex chars)
    const idMatch = text.match(/\b[0-9a-fA-F]{24}\b/);
    if (idMatch){
      const id = idMatch[0];
      showTypingIndicator();
      fetch('/api/products/' + id)
        .then(r => r.json())
        .then(data => {
          removeTypingIndicator();
          if (data && data.success && data.data){
            const p = data.data;
            const sale = p.onSale && p.salePrice ? ` <strong>Sale: ₹${p.salePrice}</strong>` : '';
            appendMessage(`<strong>${escapeHtml(p.name)}</strong><br>Price: ₹${p.price}${sale}<br><a href="/product.html?id=${p._id}">View product</a>`, 'bot');
            addRatingButtons();
          } else {
            appendMessage('I could not find a product with that id. Please check the id and try again.', 'bot');
          }
        })
        .catch(()=> { removeTypingIndicator(); appendMessage('There was an error fetching product details. Try again later or visit the Products page.', 'bot'); });
      return;
    }

    // Basic intent matching
    for (const item of canned){
      if (item.p.test(text)){
        showTypingIndicator();
        setTimeout(()=> {
          removeTypingIndicator();
          appendMessage(resolvePlaceholders(item.r), 'bot');
          addRatingButtons();
        }, 400);
        return;
      }
    }

    // If user asks about tickets, open the ticket form directly (avoid KB noise)
    const ticketIntent = /\b(open (a )?ticket|create (a )?ticket|how to open (a )?ticket|how to create (a )?ticket|submit (a )?ticket|raise (a )?ticket|how to open ticket)\b/i;
    if (ticketIntent.test(text)){
      showTicketForm(text);
      return;
    }

    // Fallback: consult knowledge index (Hugging Face powered)
    appendMessage('Let me check our knowledge base for that...', 'bot');
    showTypingIndicator();
    fetch('/api/knowledge/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, topK: 3, useLLM: true })
    }).then(r => r.json()).then(data => {
      removeTypingIndicator();
      if (window.__CHATBOT_DEBUG) console.debug('KB response', data);
      if (!data || !data.success) {
        appendMessage('I could not find a helpful answer. Would you like me to open a support ticket so our team can follow up?', 'bot');
        showTicketOffer(text);
        return;
      }
      if (data.answer){
        const answerText = stripHtmlText(String(data.answer));
        if (looksLikeCode(answerText)){
          appendMessage('The knowledge result appears to contain implementation code. I have omitted the raw code for safety — would you like a plain-language summary or the source link?', 'bot');
        } else {
          appendMessage(sanitizeHtml(String(data.answer)), 'bot');
          addRatingButtons();
        }
      } else if (data.snippets && data.snippets.length){
        const s = data.snippets.map((sn,i)=>{
          const txt = stripHtmlText(String(sn.text || ''));
          if (looksLikeCode(txt) || looksLikeHtml(String(sn.text || ''))){
            const src = escapeHtml(String(sn.source || 'unknown'));
            return `<strong>Source ${i+1} (${src})</strong>: [Code/HTML omitted] — <a href="${src}" target="_blank">Open source</a>`;
          }
          const short = txt.slice(0,300);
          return `<strong>Source ${i+1} (${escapeHtml(String(sn.source||'unknown'))})</strong>: ${escapeHtml(short)}${txt.length>300? '...':''}`;
        }).join('<br><br>');
        appendMessage('ℹ️ <strong>Found related info:</strong><br><br>' + s + '<br><br>Helpful? 👍<br>Not quite? Say <strong>"open ticket"</strong> to connect with our team or email {supportEmail}', 'bot');
        addRatingButtons();
      } else {
        appendMessage('🤔 I couldn\'t find an exact match in our knowledge base, but I can help!<br><br>💡 <strong>Try asking:</strong><br>• More specific terms<br>• A different way<br><br>Or let me create a support ticket for personalized help:', 'bot');
        showTicketOffer(text);
      }
    }).catch(()=> {
      removeTypingIndicator();
      appendMessage('⚠️ I\'m having trouble accessing our knowledge base right now, but don\'t worry!<br><br>🎟️ Say <strong>"open ticket"</strong> to contact our support team<br>📧 Or email: <strong>{supportEmail}</strong><br>🕐 Response time: 24 hours<br><br>We\'re here to help!', 'bot');
      showTicketOffer(text);
    });
  }

  // Add rating buttons to last bot message
  function addRatingButtons(){
    const messages = findMessagesContainer();
    if (!messages || messages.children.length === 0) return;
    
    // Check if rating buttons already exist
    if (messages.querySelector('.rating-buttons')) return;
    
    const wrap = document.createElement('div');
    wrap.className = 'rating-buttons';
    wrap.innerHTML = `
      <div style="display:flex;gap:6px;margin-top:8px;font-size:12px;">
        <button class="rating-btn" data-rating="helpful" title="Was this helpful?">👍 Helpful</button>
        <button class="rating-btn" data-rating="not-helpful" title="Not helpful">👎 Not helpful</button>
      </div>
    `;
    
    const lastBot = [...messages.querySelectorAll('.bubble.bot')].pop();
    if (lastBot && !lastBot.querySelector('.rating-buttons')) {
      lastBot.appendChild(wrap);
      
      wrap.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', ()=> {
          const rating = btn.dataset.rating;
          saveRating(rating);
          wrap.innerHTML = '✅ Thanks for your feedback!';
          setTimeout(()=> wrap.remove(), 2000);
        });
      });
    }
  }

  // Save rating feedback
  function saveRating(rating){
    try {
      const ratings = JSON.parse(localStorage.getItem('chatRatings') || '[]');
      ratings.push({ rating, timestamp: new Date().toISOString() });
      if (ratings.length > 100) ratings.shift(); // Keep last 100 ratings
      localStorage.setItem('chatRatings', JSON.stringify(ratings));
    } catch(e) { /* ignore */ }
  }

  // Add quick reply suggestions
  function showQuickReplies(){
    const messages = findMessagesContainer();
    if (!messages) return;
    
    const wrap = document.createElement('div');
    wrap.className = 'quick-replies';
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;';
    wrap.innerHTML = `
      <button class="quick-reply-btn" data-msg="Track my order">📦 Track order</button>
      <button class="quick-reply-btn" data-msg="How to return an item">🔄 Return item</button>
      <button class="quick-reply-btn" data-msg="What are your payment methods">💳 Payment</button>
      <button class="quick-reply-btn" data-msg="How long does delivery take">🚚 Delivery</button>
      <button class="quick-reply-btn" data-msg="I want to open a support ticket">🎟️ Support</button>
    `;
    
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    
    wrap.querySelectorAll('.quick-reply-btn').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const msg = btn.dataset.msg;
        const inputEl = document.getElementById('chatbot-input') || document.getElementById('chatbotInput');
        const sendBtn = document.getElementById('chatbot-send') || document.getElementById('chatbotSend');
        if (inputEl && sendBtn) {
          inputEl.value = msg;
          sendBtn.click();
        }
        wrap.remove();
      });
    });
  }

  // Utility: strip HTML tags and script/style content to plain text
  function stripHtmlText(html){
    try{
      const dp = new DOMParser();
      const doc = dp.parseFromString(html, 'text/html');
      // remove script/style
      doc.querySelectorAll('script,style').forEach(n=>n.remove());
      return (doc.body && doc.body.textContent) ? doc.body.textContent.trim() : String(html).replace(/<[^>]+>/g,'').trim();
    }catch(e){ return String(html).replace(/<[^>]+>/g,'').trim(); }
  }

  // Utility: sanitize HTML but allow simple anchors and basic formatting
  function sanitizeHtml(html){
    try{
      const dp = new DOMParser();
      const doc = dp.parseFromString(html, 'text/html');
      doc.querySelectorAll('script,style,iframe').forEach(n=>n.remove());
      // strip event handlers and unsafe attributes
      doc.querySelectorAll('*').forEach(el=>{
        [...el.attributes].forEach(attr=>{
          if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        });
      });
      // make links safe
      doc.querySelectorAll('a').forEach(a=>{ a.target = '_blank'; a.rel = 'noopener noreferrer'; });
      return doc.body.innerHTML.trim() || escapeHtml(stripHtmlText(html));
    }catch(e){ return escapeHtml(stripHtmlText(html)); }
  }

  // Heuristic to detect code-like text so we can omit it from chat replies
  function looksLikeCode(text){
    if (!text) return false;
    const indicators = /\b(function|return|var|let|const|=>|console\.|alert\(|\/\*|\*\/|\/\/|\{|\}|;|\(|\))|<script\b|<\/?div\b|<\w+\s+class=|<\w+\s+id=/i;
    const semicolons = (text.match(/;/g) || []).length;
    const lines = text.split('\n').length;
    const angleBrackets = (text.match(/</g) || []).length;
    if (indicators.test(text)) return true;
    if (semicolons > 3 && lines > 3) return true;
    if (angleBrackets > 6 && lines > 2) return true;
    if (text.length > 2000) return true;
    return false;
  }

  // Heuristic to detect large HTML blocks
  function looksLikeHtml(text){
    if (!text) return false;
    const tags = /<\/(div|script|style|header|footer|main|section|article|nav|form|input|button)\b/i;
    const manyAngles = (text.match(/</g) || []).length > 8;
    return tags.test(text) || manyAngles;
  }

  // Show a quick offer to create a support ticket
  function showTicketOffer(originalQuestion){
    const messages = findMessagesContainer();
    if (!messages) return;
    const wrap = document.createElement('div');
    wrap.className = 'bubble bot';
    wrap.innerHTML = `<div>Would you like me to open a support ticket so our team can follow up?</div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button id="_open_ticket_btn" class="quick-btn" style="padding:6px 10px;">Yes, open ticket</button>
        <button id="_no_ticket_btn" class="quick-btn" style="padding:6px 10px;">No, thanks</button>
      </div>`;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;

    // Attach handlers (use small timeout to ensure element is present)
    setTimeout(()=>{
      const yes = document.getElementById('_open_ticket_btn');
      const no = document.getElementById('_no_ticket_btn');
      if (yes) yes.addEventListener('click', ()=> showTicketForm(originalQuestion));
      if (no) no.addEventListener('click', ()=> {
        appendMessage('No problem — if you need anything else, let me know.', 'bot');
      });
    }, 50);
  }

  // Render an inline ticket form inside chat
  function showTicketForm(originalQuestion){
    const messages = findMessagesContainer();
    if (!messages) return;
    const wrap = document.createElement('div');
    wrap.className = 'bubble bot';
    wrap.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <input id="_ticket_name" placeholder="Your name" style="padding:8px;border:1px solid #e6eef0;border-radius:6px;">
        <input id="_ticket_email" placeholder="Your email" style="padding:8px;border:1px solid #e6eef0;border-radius:6px;">
        <input id="_ticket_subject" placeholder="Subject" style="padding:8px;border:1px solid #e6eef0;border-radius:6px;" value="Support request: ${escapeHtml(originalQuestion.slice(0,60))}">
        <textarea id="_ticket_desc" placeholder="Describe the issue" rows="4" style="padding:8px;border:1px solid #e6eef0;border-radius:6px;">${escapeHtml(originalQuestion)}</textarea>
        <div style="display:flex;gap:8px;">
          <button id="_ticket_submit" class="quick-btn">Submit Ticket</button>
          <button id="_ticket_cancel" class="quick-btn">Cancel</button>
        </div>
      </div>`;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;

    setTimeout(()=>{
      // Autofill from localStorage if user is logged in
      try{
        const stored = localStorage.getItem('userData');
        if (stored){
          const cu = JSON.parse(stored);
          if (cu && cu.name){ const el = document.getElementById('_ticket_name'); if (el) el.value = cu.name; }
          if (cu && cu.email){ const el2 = document.getElementById('_ticket_email'); if (el2) el2.value = cu.email; }
        }
      }catch(e){ /* ignore parse errors */ }

      const submit = document.getElementById('_ticket_submit');
      const cancel = document.getElementById('_ticket_cancel');
      if (cancel) cancel.addEventListener('click', ()=> appendMessage('Ticket creation cancelled. Let me know if you need anything else.', 'bot'));
      if (submit) submit.addEventListener('click', async ()=>{
        const name = document.getElementById('_ticket_name').value.trim();
        const email = document.getElementById('_ticket_email').value.trim();
        const subject = document.getElementById('_ticket_subject').value.trim();
        const desc = document.getElementById('_ticket_desc').value.trim();
        if (!name || !email || !subject || !desc) return appendMessage('Please fill all fields before submitting the ticket.', 'bot');
        appendMessage('Submitting your ticket — please wait...', 'bot');
        try{
          const res = await fetch('/api/tickets/guest', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, description: desc, category: 'support', source: 'chatbot', ref: originalQuestion })
          });
          const data = await res.json();
          if (res.ok && data && data.success && data.data){
            const ticketId = data.data._id;
          const viewUrl = `/support.html?ticket_id=${encodeURIComponent(ticketId)}&guest_email=${encodeURIComponent(email)}`;
          appendMessage(`Thank you! Your ticket has been created (ID: ${ticketId}). <a href="${viewUrl}" target="_blank" rel="noopener">View ticket</a> — our support team will reach out to ${escapeHtml(email)}.` , 'bot');
          } else {
            appendMessage('⚠️ There was an issue creating your ticket. Please try again or email us at {supportEmail} with your details.', 'bot');
          }
        }catch(e){
          appendMessage('⚠️ Failed to submit ticket. No worries — email us directly at {supportEmail} and we\\'ll help!', 'bot');
        }
      });
    }, 50);
  }

  // small helper to avoid HTML injection
  function escapeHtml(str){
    return String(str).replace(/[&<>\"']/g, function (s) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]; });
  }

  function init(){
    const toggles = findToggleButtons();
    const chatWindow = findChatWindow();
    const messages = findMessagesContainer();
    const sendBtn = document.getElementById('chatbot-send') || document.getElementById('chatbotSend');
    const inputEl = document.getElementById('chatbot-input') || document.getElementById('chatbotInput');
    const closeBtn = document.getElementById('chatbot-close') || document.getElementById('chatClose');
    
    console.log('🤖 Chatbot init:', { toggles: toggles.length, chatWindow: !!chatWindow, messages: !!messages, sendBtn: !!sendBtn, inputEl: !!inputEl, closeBtn: !!closeBtn });

    function isChatOpen(){
      if (!chatWindow) return false;
      if (chatWindow.classList.contains('hidden')) return false;
      if (chatWindow.style.display) return chatWindow.style.display !== 'none';
      return window.getComputedStyle(chatWindow).display !== 'none';
    }

    function setChatVisibility(open){
      if (!chatWindow) return;
      const usesHidden = chatWindow.classList.contains('hidden');
      if (usesHidden){
        chatWindow.classList.toggle('hidden', !open);
        chatWindow.style.display = '';
      } else {
        chatWindow.style.display = open ? 'flex' : 'none';
      }
      chatWindow.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    // Load chat history on init
    const history = getChatHistory();

    // Attach toggles
    toggles.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        console.log('🤖 Chatbot toggle clicked', idx);
        if (!chatWindow) return;
        const nextOpen = !isChatOpen();
        console.log('🤖 Setting visibility to:', nextOpen);
        setChatVisibility(nextOpen);
        if (nextOpen && messages && messages.children.length === 0){
          setTimeout(() => {
            if (history.length === 0) {
              appendMessage('नमस्ते! 👋 Welcome to Zenrix Support!<br><br>I\\'m your AI Assistant. I can help with:<br>📦 <strong>Orders</strong> • 🛍️ <strong>Products</strong> • 🚚 <strong>Delivery</strong><br>🔄 <strong>Returns</strong> • 💳 <strong>Payment</strong> • 🎟️ <strong>Support</strong><br><br>What can I help you with today?', 'bot');
              setTimeout(()=> showQuickReplies(), 300);
            } else {
              appendMessage('Welcome back! 👋 How can I help you today?', 'bot');
              setTimeout(()=> showQuickReplies(), 300);
            }
          }, 250);
        }
      });
    });

    if (closeBtn){
      closeBtn.addEventListener('click', () => setChatVisibility(false));
    }

    // Quick buttons support
    $all('.quick-btn').forEach(q => q.addEventListener('click', (e)=>{
      const msg = e.currentTarget.dataset.msg || e.currentTarget.textContent;
      if (inputEl) inputEl.value = msg;
      if (sendBtn) sendBtn.click();
    }));

    if (sendBtn && inputEl){
      sendBtn.addEventListener('click', ()=>{
        const txt = inputEl.value && inputEl.value.trim();
        if (!txt) return;
        appendMessage(txt, 'user');
        inputEl.value = '';
        setTimeout(()=> handleUserMessage(txt), 300);
      });

      inputEl.addEventListener('keypress',(e)=>{
        if (e.key === 'Enter') sendBtn.click();
      });
    }

    // Make links inside bot responses open in new tab safely
    const observer = new MutationObserver((mutations)=>{
      for (const m of mutations){
        for (const node of m.addedNodes){
          if (!(node instanceof HTMLElement)) continue;
          node.querySelectorAll && node.querySelectorAll('a').forEach(a=>{ a.target='_blank'; a.rel='noopener noreferrer'; });
        }
      }
    });
    if (messages) observer.observe(messages, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();