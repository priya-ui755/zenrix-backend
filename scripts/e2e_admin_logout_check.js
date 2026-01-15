const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'error', text: err.message }));

  await page.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'domcontentloaded' });
  // Detect script parse errors by attempting to compile each script's content
  const scriptErrors = await page.evaluate(async () => {
    const res = [];
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      try {
        let src = s.src || '<inline>';
        let content = s.src ? await (await fetch(s.src)).text() : (s.textContent || '');
        try {
          new Function(content);
        } catch (err) {
          res.push({ src, error: err && err.message ? err.message : String(err) });
        }
      } catch (e) {
        res.push({ src: s.src || '<inline>', error: 'fetch-failed ' + e.message });
      }
    }
    return res;
  });
  if (scriptErrors && scriptErrors.length) {
    console.log('SCRIPT PARSE ERRORS', JSON.stringify(scriptErrors, null, 2));
  }

  // simulate signed-in admin
  await page.evaluate(() => { localStorage.setItem('adminToken', 'FAKE_TOKEN'); if (typeof setAdminToken === 'function') setAdminToken('FAKE_TOKEN'); });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const pre = await page.evaluate(() => ({ token: localStorage.getItem('adminToken'), logoutVisible: !!(document.getElementById('logoutBtn') && getComputedStyle(document.getElementById('logoutBtn')).display !== 'none') }));

  // click logout button
  await page.evaluate(() => {
    const el = document.getElementById('logoutBtn');
    if (el) { el.scrollIntoView({ block: 'center' }); el.click(); }
  });
  await new Promise(r => setTimeout(r, 900));

  const after = await page.evaluate(() => {
    const el = document.getElementById('logoutBtn');
    return {
      token: localStorage.getItem('adminToken'),
      logoutVisible: !!(el && getComputedStyle(el).display !== 'none'),
      logoutClassList: el ? Array.from(el.classList) : null,
      logoutStyleDisplay: el ? el.style.display : null,
      logoutAriaHidden: el ? el.getAttribute('aria-hidden') : null,
      logoutDisabled: el ? !!el.disabled : null
    };
  });

  const screenshotPath = 'tmp/admin-logout-check.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });

  console.log(JSON.stringify({ logs, pre, after, screenshotPath }, null, 2));

  await browser.close();
})();