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

    // Wait for bot message that offers ticket — our UI attaches button with id _open_ticket_btn
    await page.waitForSelector('#_open_ticket_btn', { timeout: 15000 });

    const btn = await page.$('#_open_ticket_btn');
    if (!btn) throw new Error('Ticket offer button not found');

    console.log('E2E: chatbot ticket offer check: OK');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E: chatbot ticket offer check: FAILED', err.message);
    await browser.close();
    process.exit(2);
  }
})();