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
  }

  // Richer responses
  const canned = [
    {p:/\b(order status|track order|where is my order)\b/i, r: "To check an order, go to <a href=\"/orders.html\">Orders</a> or tell me your order ID and I'll guide you through the status."},
    {p:/\b(return|refund|how to return|returns|exchange)\b/i, r: "🔄 We have a 30-day return window from delivery for most items. To start a return: visit <a href=\"/orders.html\">Orders</a> → select the item → 'Return'. Pack the item securely and follow the instructions. Refunds are processed within 5–7 business days after we receive the return."},
    {p:/\b(shipping|delivery|ship|delivery time)\b/i, r: "🚚 Standard delivery across Nepal typically takes 3–5 business days; remote areas may take longer. Free shipping applies for orders over रु 7,500. For exact delivery times, check the shipping options at checkout or your order's tracking page."},
    {p:/\b(product|products|catalog|category)\b/i, r: "Browse our full catalog at <a href=\"/products.html\">Products</a>. You can also ask about a specific product id (e.g. 'product id 69554ce7b4f651f29d9ea369') and I'll try to fetch details displayed on the product page."},
    {p:/\b(price|cost|how much|price of)\b/i, r: "Prices are shown on each product page and may include ongoing discounts. For bulk or wholesale pricing, contact support@zenrix.com.np with your requirements."},
    {p:/\b(payment|pay|payment methods|card|upi|esewa|khalti)\b/i, r: "We accept major credit/debit cards and local wallets like eSewa and Khalti. For payment issues, email support@zenrix.com.np with your order id and payment reference and we'll investigate."},
    {p:/\b(account|profile|login|register|password)\b/i, r: "Manage your account at <a href=\"/profile.html\">Account</a>. If you forgot your password, use 'Forgot password' or contact support for help."},
    {p:/\b(contact|support|help|agent|human)\b/i, r: "You can reach support at <a href=\"mailto:support@zenrix.com.np\">support@zenrix.com.np</a>. To open a support ticket from here, say 'open ticket' or 'create ticket' and I'll help you submit it. For urgent assistance, say 'connect to agent' and I'll provide next steps for escalation."},
    {p:/\b(cancel order|cancel)\b/i, r: "To cancel an order, visit Orders and tap 'Cancel' as early as possible. If your order is already dispatched, please use the return process after delivery."},
    {p:/\b(warranty|guarantee|defective|broken)\b/i, r: "Warranty terms vary by product—electronics usually have 1-year manufacturer warranty. Please check the product page under 'Warranty' or contact support for claims."},
    {p:/\b(career|jobs|work with|hiring)\b/i, r: "For careers at Zenrix, visit our Careers page or email hr@zenrix.com.np with your CV and the position you're interested in."},
    {p:/\b(privacy|data|gdpr|personal)\b/i, r: "Your privacy matters to us. You can read our privacy policies on the Privacy page. For data requests, contact privacy@zenrix.com.np."},
    {p:/\b(hello|hi|hey|namaste)\b/i, r: "Namaste! 🙏 I'm Zenrix Assistant. I can help with orders, products, delivery, returns, or connecting you to support."}
  ];

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
      appendMessage('Let me fetch that product for you...', 'bot');
      fetch('/api/products/' + id)
        .then(r => r.json())
        .then(data => {
          if (data && data.success && data.data){
            const p = data.data;
            const sale = p.onSale && p.salePrice ? ` <strong>Sale: ₹${p.salePrice}</strong>` : '';
            appendMessage(`<strong>${escapeHtml(p.name)}</strong><br>Price: ₹${p.price}${sale}<br><a href="/product.html?id=${p._id}">View product</a>`, 'bot');
          } else {
            appendMessage('I could not find a product with that id. Please check the id and try again.', 'bot');
          }
        })
        .catch(()=> appendMessage('There was an error fetching product details. Try again later or visit the Products page.', 'bot'));
      return;
    }

    // Basic intent matching
    for (const item of canned){
      if (item.p.test(text)){
        return appendMessage(item.r, 'bot');
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
    fetch('/api/knowledge/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, topK: 3, useLLM: true })
    }).then(r => r.json()).then(data => {
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
        appendMessage('I found some related information:<br><br>' + s + '<br><br>If this does not answer your question, try contacting support@zenrix.com.np', 'bot');
      } else {
        appendMessage('No relevant documents were found. Would you like me to open a support ticket so our team can follow up?', 'bot');
        showTicketOffer(text);
      }
    }).catch(()=> {
      appendMessage('Sorry, I had trouble contacting the knowledge service. Please try again later or contact support@zenrix.com.np', 'bot');
      // Offer ticket creation
      showTicketOffer(text);
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
            appendMessage(`Thank you! Your ticket has been created (ID: ${data.data._id}). Our support team will reach out to ${escapeHtml(email)}.` , 'bot');
          } else {
            appendMessage('There was an issue creating your ticket. Please try again later or email support@zenrix.com.np', 'bot');
          }
        }catch(e){
          appendMessage('Failed to submit ticket. Please try again later or contact support@zenrix.com.np', 'bot');
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

    // set accessible colors if needed (added class-based adjustments can be in CSS)

    // Attach toggles
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!chatWindow) return;
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden') && messages && messages.children.length === 0){
          setTimeout(() => appendMessage('Hi there 👋 I can help with orders, products, delivery, returns, and account issues. Try: "order status", "product id <id>", or "connect to agent". You can also use the quick buttons below.', 'bot'), 250);
        }
      });
    });

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
        setTimeout(()=> handleUserMessage(txt), 500);
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