const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://localhost:3000/admin-dashboard.html';
  console.log('[diag-flow] launching puppeteer, target=', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[browser]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[pageerror]', err));

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('[diag-flow] initial load done');

    // Programmatic login to ensure server-side cookie is set
    const loginSuccess = await page.evaluate(async (pw) => {
      if (typeof window.__inlineAdminLogin === 'function') {
        return await window.__inlineAdminLogin(pw);
      }
      try {
        const res = await fetch((window.API_URL || '/api') + '/admin/login', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: pw }) });
        const body = await res.json();
        return body && body.success;
      } catch (e) { return false; }
    }, process.env.ADMIN_PW || 'admin');
    console.log('[diag-flow] programmatic login success=', loginSuccess);

    // Reload page to reflect server-side session
    await page.reload({ waitUntil: 'networkidle2' });
    // Check authed UI (logout visible, overlay hidden)
    const authed = await page.evaluate(() => {
      const logout = document.getElementById('logoutBtn');
      const overlay = document.getElementById('authOverlay');
      return { logoutVisible: !!(logout && getComputedStyle(logout).display !== 'none' && !logout.classList.contains('hidden')), overlayHidden: !!(overlay && overlay.classList.contains('hidden')) };
    });
    console.log('[diag-flow] after login UI state:', authed);

    // Click logout button (should call performLogout which hits server logout)
    const logoutBtn = await page.$('#logoutBtn');
    if (logoutBtn) {
      await logoutBtn.click();
      console.log('[diag-flow] clicked logout');
    } else {
      console.log('[diag-flow] logout button not found');
    }

    // Wait for navigation (performLogout triggers redirect)
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
    console.log('[diag-flow] after logout navigation done');

    // Now try clicking login overlay button and expect modal visible
    const overlayBtn = await page.$('#authOverlayLogin');
    console.log('[diag-flow] overlay login button present=', !!overlayBtn);
    if (overlayBtn) {
      await overlayBtn.click();
      await (page.waitForTimeout ? page.waitForTimeout(300) : new Promise(r => setTimeout(r,300)));
      const modalVisible = await page.evaluate(() => {
        const m = document.getElementById('loginModal');
        if (!m) return 'no-modal';
        const hidden = m.classList.contains('hidden') || getComputedStyle(m).display === 'none' || getComputedStyle(m).visibility === 'hidden';
        return hidden ? 'hidden' : 'visible';
      });
      console.log('[diag-flow] loginModal visibility after logout click:', modalVisible);
    }

    console.log('[diag-flow] done');
  } catch (err) {
    console.error('[diag-flow] error', err);
  } finally {
    await browser.close();
  }
})();