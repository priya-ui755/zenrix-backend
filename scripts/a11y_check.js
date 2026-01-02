const puppeteer = require('puppeteer');
const fs = require('fs');
const axeSource = require('axe-core').source;

(async () => {
  const TEST_PORT = process.env.UI_TEST_PORT || 3001;
  const app = require('../server');
  const server = app.listen(TEST_PORT);
  const base = `http://localhost:${TEST_PORT}`;

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // programmatic admin login to enable authenticated views
    try{
      const login = await (await fetch(`${base}/api/admin/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'admin' }) })).json();
      if (login && login.success && login.token) {
        await page.goto('about:blank');
        await page.evaluate(token => localStorage.setItem('adminToken', token), login.token);
      }
    }catch(e){ /* ignore */ }

    await page.goto(base + '/admin-dashboard.html', { waitUntil: 'networkidle2' });
    // inject axe
    await page.evaluate(axeSource);
    const { violations, passes, inapplicable } = await page.evaluate(async () => {
      return await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    });

    const out = { violations: violations.length, details: violations };
    const outPath = 'tmp/a11y-results.json';
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
    fs.writeFileSync(outPath, JSON.stringify({ violations, passes, inapplicable }, null, 2));
    console.log('A11Y results written to', outPath);

    await browser.close();
    server.close();

    if (violations.length > 0) {
      console.error('Accessibility violations found:', violations.length);
      process.exit(2);
    }

    console.log('No accessibility violations found.');
    process.exit(0);
  } catch (err) {
    console.error('A11Y check failed:', err);
    await browser.close();
    server.close();
    process.exit(3);
  }
})();