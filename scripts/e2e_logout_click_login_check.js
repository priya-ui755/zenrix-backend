const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));

  await page.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 300));

  // simulate signed-in admin
  await page.evaluate(() => { localStorage.setItem('adminToken', 'FAKE_TOKEN'); if (typeof setAdminToken === 'function') setAdminToken('FAKE_TOKEN'); });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // ensure logout is visible
  const before = await page.evaluate(() => ({
    logoutPresent: !!document.getElementById('logoutBtn'),
    logoutVisible: !!(document.getElementById('logoutBtn') && getComputedStyle(document.getElementById('logoutBtn')).display !== 'none')
  }));
  console.log('BEFORE LOGOUT:', before);

  // click logout and wait for small delay
  await page.evaluate(() => { const el = document.getElementById('logoutBtn'); if (el) el.click(); });
  await new Promise(r => setTimeout(r, 800));

  // ensure we're back on admin-dashboard and overlay present
  const afterLogout = await page.evaluate(() => ({
    url: location.href,
    adminToken: localStorage.getItem('adminToken'),
    overlayVisible: !!(document.getElementById('authOverlay') && getComputedStyle(document.getElementById('authOverlay')).display !== 'none'),
    overlayHiddenClass: document.getElementById('authOverlay') ? document.getElementById('authOverlay').classList.contains('hidden') : null
  }));
  console.log('AFTER LOGOUT:', afterLogout);

  // Try clicking the overlay login button
  await page.evaluate(() => {
    const btn = document.getElementById('authOverlayLogin');
    if (btn) { btn.scrollIntoView({block:'center'}); btn.click(); }
  });
  await new Promise(r => setTimeout(r, 600));

  const afterClick = await page.evaluate(() => ({
    loginModalHidden: document.getElementById('loginModal') ? document.getElementById('loginModal').classList.contains('hidden') : null,
    adminPasswordVisible: !!(document.getElementById('adminPassword') && getComputedStyle(document.getElementById('adminPassword')).display !== 'none')
  }));
  console.log('AFTER CLICK:', afterClick);

  const screenshotPath = 'tmp/e2e-logout-login-check.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('screenshot saved to', screenshotPath);

  await browser.close();
})();