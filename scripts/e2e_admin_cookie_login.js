// Simple E2E check for cookie-based admin login
// Usage: ADMIN_PASSWORD=admin123 node scripts/e2e_admin_cookie_login.js

const puppeteer = require('puppeteer');
(async () => {
  const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
  const b = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
  const p = await b.newPage();
  p.on('console', m => console.log('[PAGE]', m.text()));
  p.on('pageerror', e => console.log('[PAGEERR]', e.message));
  try {
    await p.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'networkidle2', timeout: 30000 });
    // open login modal
    await p.evaluate(() => { if (typeof robustOpenLogin === 'function') robustOpenLogin('e2e-test'); });
    await p.waitForSelector('#loginModal', { visible: true, timeout: 5000 });
    await p.type('#adminPassword', ADMIN_PW, { delay: 20 });
    await p.click('#loginForm button[type=submit]');
    await p.waitForResponse(r => r.url().includes('/api/admin/login') && r.status() === 200, { timeout: 5000 });
    // give browser a moment to settle and apply cookie
    await p.waitForTimeout(200);
    const cookies = await p.cookies();
    const hasAdminCookie = cookies.some(c => c.name === 'adminToken');
    console.log('hasAdminCookie=', hasAdminCookie);
    const ping = await p.evaluate(async () => {
      const r = await fetch('/api/admin/ping', { credentials: 'include' });
      return { ok: r.ok, status: r.status, txt: await r.text() };
    });
    console.log('ping after login:', ping);
    // Reload and check ping persists
    await p.reload({ waitUntil: 'networkidle2' });
    const ping2 = await p.evaluate(async () => {
      const r = await fetch('/api/admin/ping', { credentials: 'include' });
      return { ok: r.ok, status: r.status, txt: await r.text() };
    });
    console.log('ping after reload:', ping2);
    await b.close();
    const success = hasAdminCookie && ping.ok && ping2.ok;
    process.exit(success ? 0 : 2);
  } catch (err) {
    console.error('E2E error', err);
    await b.close();
    process.exit(3);
  }
})();