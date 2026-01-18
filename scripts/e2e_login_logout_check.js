const puppeteer = require('puppeteer');
(async () => {
  const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
  const b = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
  const p = await b.newPage();
  p.on('console', m => console.log('[PAGE]', m.text()));
  try {
    await p.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'networkidle2', timeout: 30000 });
    // Login
    const loginRes = await p.evaluate(async (pw) => {
      if (typeof window.__inlineAdminLogin !== 'function') return { error: 'no helper' };
      try {
        const ok = await window.__inlineAdminLogin(pw);
        return { ok, cookie: document.cookie };
      } catch (e) { return { error: String(e) }; }
    }, ADMIN_PW);
    console.log('inline login result:', loginRes);
    await new Promise(r => setTimeout(r, 300));
    // Click logout button
    await p.evaluate(() => {
      const btn = document.getElementById('logoutBtn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    // After logout, reload and check if login modal is visible
    await p.reload({ waitUntil: 'networkidle2' });
    const isLoggedOut = await p.evaluate(() => {
      const modal = document.getElementById('loginModal');
      return modal && !modal.classList.contains('hidden');
    });
    console.log('Is login modal visible after logout+reload?', isLoggedOut);
    await b.close();
    process.exit(isLoggedOut ? 0 : 2);
  } catch (err) {
    console.error('E2E login/logout error', err);
    await b.close();
    process.exit(2);
  }
})();
