const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://localhost:3000/admin-dashboard.html';
  console.log('[diag] launching puppeteer, target=', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[browser]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[pageerror]', err));
  page.on('requestfailed', req => console.warn('[requestfailed]', req.url(), req.failure()));

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('[diag] initial load status=', res && res.status());

    const overlayBtn = await page.$('#authOverlayLogin');
    const mainBtn = await page.$('#adminLoginBtn');
    console.log('[diag] overlayBtn=', !!overlayBtn, 'mainBtn=', !!mainBtn);

    if (overlayBtn) {
      await overlayBtn.click();
      console.log('[diag] clicked overlay button');
      await (page.waitForTimeout ? page.waitForTimeout(300) : new Promise(r => setTimeout(r, 300)));
    }

    // check modal visibility
    const modalVisible = await page.evaluate(() => {
      const m = document.getElementById('loginModal');
      if (!m) return 'no-modal';
      const hidden = m.classList.contains('hidden') || getComputedStyle(m).display === 'none' || getComputedStyle(m).visibility === 'hidden' || getComputedStyle(m).opacity === '0';
      return hidden ? 'hidden' : 'visible';
    });
    console.log('[diag] loginModal visibility after click:', modalVisible);

    // open using main button if overlay didn't work
    if (modalVisible === 'hidden' && mainBtn) {
      await mainBtn.click();
      console.log('[diag] clicked main login button');
      await (page.waitForTimeout ? page.waitForTimeout(300) : new Promise(r => setTimeout(r, 300)));
      const modalVisible2 = await page.evaluate(() => {
        const m = document.getElementById('loginModal');
        if (!m) return 'no-modal';
        const hidden = m.classList.contains('hidden') || getComputedStyle(m).display === 'none' || getComputedStyle(m).visibility === 'hidden' || getComputedStyle(m).opacity === '0';
        return hidden ? 'hidden' : 'visible';
      });
      console.log('[diag] loginModal visibility after main click:', modalVisible2);
    }

    // fill password and submit if modal visible
    const finalVisibility = await page.evaluate(() => {
      const m = document.getElementById('loginModal');
      if (!m) return 'no-modal';
      return m.classList.contains('hidden') ? 'hidden' : 'visible';
    });

    if (finalVisibility === 'visible') {
      await page.type('#adminPassword', process.env.ADMIN_PW || 'admin');
      console.log('[diag] filled password');

      // wait for /admin/login response
      const [response] = await Promise.all([
        page.waitForResponse(r => r.url().includes('/admin/login') && r.request().method() === 'POST', { timeout: 5000 }).catch(e => null),
        page.click('#loginModal button[type="submit"]')
      ]);

      if (response) {
        console.log('[diag] /admin/login status=', response.status());
        try {
          const json = await response.json();
          console.log('[diag] /admin/login json=', json);
        } catch (e) { console.warn('[diag] failed to parse /admin/login response as json', e); }
      } else {
        console.warn('[diag] no /admin/login response detected (timeout)');
      }

      const cookies = await page.cookies();
      console.log('[diag] cookies after login attempt:', cookies.map(c => ({ name: c.name, value: c.value, httpOnly: c.httpOnly }))); 

      const docCookie = await page.evaluate(() => document.cookie);
      console.log('[diag] document.cookie:', docCookie);
    }

    console.log('[diag] done');
  } catch (err) {
    console.error('[diag] error', err);
    await browser.close();
    process.exit(1);
  }
  await browser.close();
})();
