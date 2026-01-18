const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'], protocolTimeout: 120000 });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1000));

    const computed = await page.evaluate(() => {
      function info(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          selector: sel,
          exists: true,
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          zIndex: cs.zIndex,
          position: cs.position,
          pointerEvents: cs.pointerEvents,
          rect: { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left }
        };
      }
      return {
        header: info('.main-header'),
        sidebar: info('.main-sidebar'),
        authOverlay: info('#authOverlay'),
        loginModal: info('#loginModal'),
        loginCard: info('#loginModal .auth-card'),
        logoutBtn: info('#logoutBtn'),
        adminAuthSign: info('#adminAuthSign')
      };
    });

    const screenshotPath = 'tmp/login-debug.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(JSON.stringify({ ok: true, screenshotPath, computed }, null, 2));
      // Try clicking the overlay Login button to open modal (simulate user click)
      try {
        await page.evaluate(() => { const btn = document.getElementById('authOverlayLogin'); if (btn) try { btn.click(); } catch(e) {} });
        await new Promise(r => setTimeout(r, 400));
        const computedAfter = await page.evaluate(() => {
          function info(sel) {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              selector: sel,
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity,
              zIndex: cs.zIndex,
              position: cs.position,
              pointerEvents: cs.pointerEvents,
              rect: { x: r.x, y: r.y, width: r.width, height: r.height }
            };
          }
          return {
            authOverlay: info('#authOverlay'),
            loginModal: info('#loginModal'),
            loginCard: info('#loginModal .auth-card'),
            adminPassword: info('#adminPassword')
          };
        });
        const afterPath = 'tmp/login-after-click.png';
        await page.screenshot({ path: afterPath, fullPage: true });
        console.log(JSON.stringify({ clicked: true, afterPath, computedAfter }, null, 2));
      } catch (e) {
        console.error(JSON.stringify({ clicked: false, error: String(e) }, null, 2));
      }
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: String(err) }, null, 2));
  } finally {
    await browser.close();
  }
})();
