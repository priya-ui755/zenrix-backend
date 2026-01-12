const puppeteer = require('puppeteer');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 });

    // Open chatbot widget
    const toggleSelector = '#chatbotToggle, #chatbot-toggle, .chat-toggle';
    await page.waitForSelector(toggleSelector, { timeout: 10000 });
    await page.click(toggleSelector);

    // Wait for input
    const inputSel = '#chatbot-input, #chatbotInput';
    await page.waitForSelector(inputSel, { timeout: 10000 });

    // Enter a gibberish message that shouldn't produce KB results
    const testMsg = 'qwertyuiop asdfghjkl zxcvbnm 12345';
    await page.type(inputSel, testMsg);

    // Click send
    const sendSel = '#chatbot-send, #chatbotSend';
    await page.click(sendSel);

    // Wait up to 20s for either the ticket button or a bubble that asks to open a support ticket
    const offerFound = await page.evaluate(() => {
      const findText = (el, txt) => el && el.textContent && el.textContent.toLowerCase().includes(txt.toLowerCase());
      // poll for element or bubble text
      const btn = document.getElementById('_open_ticket_btn');
      if (btn) return true;
      const bubbles = Array.from(document.querySelectorAll('.bubble.bot'));
      for (const b of bubbles){
        if (findText(b, 'open a support ticket') || findText(b, 'would you like me to open a support ticket') || findText(b, 'would you like me to open a ticket')) return true;
      }
      return false;
    });

    // Retry polling for up to 20s
    let attempts = 0;
    while(!offerFound && attempts < 20){
      // sleep 1s
      await new Promise(r=>setTimeout(r,1000));
      const found = await page.evaluate(() => {
        const findText = (el, txt) => el && el.textContent && el.textContent.toLowerCase().includes(txt.toLowerCase());
        const btn = document.getElementById('_open_ticket_btn');
        if (btn) return true;
        const bubbles = Array.from(document.querySelectorAll('.bubble.bot'));
        for (const b of bubbles){
          if (findText(b, 'open a support ticket') || findText(b, 'would you like me to open a support ticket') || findText(b, 'would you like me to open a ticket')) return true;
        }
        return false;
      });
      if (found) break;
      attempts++;
    }

    const final = await page.evaluate(() => {
      const btn = document.getElementById('_open_ticket_btn');
      const bubbles = Array.from(document.querySelectorAll('.bubble.bot')).map(b=>b.textContent.trim()).slice(-6);
      return { hasBtn: !!btn, recentBubbles: bubbles };
    });

    if (!final.hasBtn && !final.recentBubbles.some(b => /open a support ticket|open a ticket|support ticket/i.test(b))) {
      console.error('Recent bot bubbles:', final.recentBubbles);
      throw new Error('Ticket offer not found in chat UI');
    }

    console.log('E2E: chatbot ticket offer check: OK');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E: chatbot ticket offer check: FAILED', err.message);
    await browser.close();
    process.exit(2);
  }
})();