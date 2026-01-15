const puppeteer = require('puppeteer');

(async ()=>{
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });
    const supportText = await page.evaluate(()=>{
      const footerEl = document.querySelector('custom-footer');
      if (!footerEl || !footerEl.shadowRoot) return null;
      const contactLines = footerEl.shadowRoot.querySelector('.footer-support .contact-lines');
      return contactLines ? contactLines.textContent.trim() : null;
    });
    console.log('Footer contact text:', supportText);
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();