const puppeteer = require('puppeteer');
(async () => {
  const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
  const b = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
  const p = await b.newPage();
  p.on('console', m => console.log('[PAGE]', m.text()));
  try {
    await p.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'networkidle2', timeout: 30000 });
    const loginRes = await p.evaluate(async (pw) => {
      if (typeof window.__inlineAdminLogin !== 'function') return { error: 'no helper' };
      try {
        const ok = await window.__inlineAdminLogin(pw);
        return { ok, cookie: document.cookie };
      } catch (e) { return { error: String(e) }; }
    }, ADMIN_PW);
    console.log('inline result:', loginRes);
    // give the browser a moment
    await new Promise(r => setTimeout(r, 200));
    // reload the page
    await p.reload({ waitUntil: 'networkidle2' });
    // after reload, test ping
    const ping = await p.evaluate(async () => {
      try {
        const r = await fetch('/api/admin/ping', { credentials: 'include' });
        return { ok: r.ok, status: r.status, text: await r.text(), cookie: document.cookie };
      } catch(e) { return { error: String(e), cookie: document.cookie }; }
    });
    console.log('ping after reload:', ping);
    const cookies = await p.cookies();
    console.log('page cookies after reload:', cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly })));
    await b.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E direct reload error', err);
    await b.close();
    process.exit(2);
  }
})();
