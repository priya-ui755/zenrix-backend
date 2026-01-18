const puppeteer = require('puppeteer');
const assert = require('assert');

const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_DASH = (process.env.ADMIN_URL || 'http://localhost:3000') + '/admin-dashboard.html';

(async () => {
  console.log('E2E TAB: Launching browser');
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  try {
    await page.goto(ADMIN_DASH, { waitUntil: 'domcontentloaded' });
    const loginResp = await page.evaluate(async (apiUrl, pw) => {
      const res = await fetch(`${apiUrl}/admin/login`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ password: pw }) });
      return res.json();
    }, API_BASE, ADMIN_PW);
    assert.ok(loginResp && loginResp.success, 'Admin login failed');
    await page.evaluate((token) => localStorage.setItem('adminToken', token), loginResp.token);
    await page.reload({ waitUntil: 'networkidle2' });

    // Gather all tabs from data-jump-tab elements
    const tabs = await page.$$eval('[data-jump-tab]', els => Array.from(new Set(els.map(e => e.getAttribute('data-jump-tab')))).filter(Boolean));
    console.log('Found tabs:', tabs);

    for (const tab of tabs) {
      console.log('Testing tab', tab);
      // click the first element that has this data-jump-tab
      await page.evaluate((t) => { const el = document.querySelector(`[data-jump-tab="${t}"]`); if (el) el.click(); }, tab);
      await new Promise(r => setTimeout(r, 300)); // allow UI to update
      const visible = await page.evaluate((t) => {
        const prefix = 'content-';
        const all = Array.from(document.querySelectorAll('[id^="content-"]'));
        const vis = all.filter(a => !a.classList.contains('hidden')).map(a => a.id);
        return { visible: vis, tab: t, isExpectedVisible: !document.getElementById('content-' + t)?.classList.contains('hidden') };
      }, tab);
      console.log('Visible content after switching to', tab, ':', visible.visible);
      assert.ok(visible.isExpectedVisible, `Expected content-${tab} to be visible`);
      // ensure no other content-* except expected is visible
      const otherVisible = visible.visible.filter(id => id !== ('content-' + tab));
      assert.strictEqual(otherVisible.length, 0, `Other content sections visible when on ${tab}: ${otherVisible.join(',')}`);
    }

    console.log('E2E TAB: All tabs isolated successfully');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E TAB: Failure', err && err.message ? err.message : err);
    await page.screenshot({ path: 'tmp/e2e-tab-failure.png', fullPage: true }).catch(()=>{});
    await browser.close();
    process.exit(2);
  }
})();