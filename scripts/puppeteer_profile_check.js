const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'error', text: err.message }));

  await page.goto('http://localhost:3000/profile.html', { waitUntil: 'domcontentloaded' });
  // Emulate logged-in state to trigger profile loading
  await page.evaluate(() => localStorage.setItem('token', 'fake-token'));
  // Reload so scripts treat as logged-in
  await page.reload({ waitUntil: 'networkidle2' });

  // Wait a bit for async activity
  await new Promise(r => setTimeout(r, 1500));
  console.log('Console & errors captured:')
  logs.forEach(l => console.log(l.type.toUpperCase() + ': ' + l.text));

  await browser.close();
})();