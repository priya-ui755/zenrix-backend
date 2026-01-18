const puppeteer = require('puppeteer');
(async () => {
  const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
  const b = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
  const p = await b.newPage();
  p.on('console', m => console.log('[PAGE]', m.text()));
  try {
    await p.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'networkidle2', timeout: 30000 });
    // directly invoke inline helper
    const res = await p.evaluate(async (pw) => {
      if (typeof window.__inlineAdminLogin !== 'function') return { error: 'no helper' };
      try {
        const ok = await window.__inlineAdminLogin(pw);
        return { ok, cookie: document.cookie };
      } catch (e) { return { error: String(e) }; }
    }, ADMIN_PW);
    console.log('inline result:', res);
    const cookies = await p.cookies();
    console.log('page cookies:', cookies);
    await b.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E direct error', err);
    await b.close();
    process.exit(2);
  }
})();
