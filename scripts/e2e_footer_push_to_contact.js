const puppeteer = require('puppeteer');
const assert = require('assert');

const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_DASH = (process.env.ADMIN_URL || 'http://localhost:3000') + '/admin-dashboard.html';

(async () => {
  console.log('E2E FOOTER->CONTACT PUSH: Launching');
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

    // snapshot contact page before
    const contactBefore = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/pages/slug/contact`); const j = await r.json(); return j && j.success ? (j.data || {}) : null;
    }, API_BASE);
    assert.ok(contactBefore, 'Failed to read contact page');
    const beforeContent = contactBefore.content || '';

    await page.evaluate((t) => localStorage.setItem('adminToken', t), loginResp.token);
    await page.reload({ waitUntil: 'networkidle2' });

    // Open Footer Editor
    await page.evaluate(() => { const el = document.querySelector('[data-jump-tab="footer-editor"]'); if (el) el.click(); });
    await new Promise(r => setTimeout(r, 300));

    const unique = Math.floor(Math.random()*100000);
    const newEmail = `footer-${unique}@example.com`;
    const newPhone = `+1555${String(unique).slice(0,6)}`;
    const newAddress = `100 Test St, City ${unique}`;
    const newMap = `https://maps.google.com/?q=test+${unique}`;

    await page.evaluate((email, phone, addr, map) => {
      const form = document.getElementById('footerEditorForm');
      form.querySelector('[name="supportEmail"]').value = email;
      form.querySelector('[name="supportPhone"]').value = phone;
      form.querySelector('[name="address"]').value = addr;
      form.querySelector('[name="mapEmbed"]').value = map;
      // ensure push to contact is checked
      const c = document.getElementById('footerPushContact'); if (c) c.checked = true;
    }, newEmail, newPhone, newAddress, newMap);

    // submit
    await page.click('#footerEditorForm button[type="submit"]');
    await new Promise(r => setTimeout(r, 1000));

    // read contact page meta after
    const contactAfterPage = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/pages/slug/contact`); const j = await r.json(); return j && j.success ? (j.data || {}) : null;
    }, API_BASE);
    console.log('Contact before content:', beforeContent.slice(0,120), 'Contact after content:', (contactAfterPage && (contactAfterPage.content||'')).slice(0,160));

    assert.ok(contactAfterPage, 'Failed to read contact page after update');
    const afterContent = contactAfterPage.content || '';
    assert.ok(afterContent.includes(newEmail), 'Contact page content does not include updated email');
    assert.ok(afterContent.includes(newPhone), 'Contact page content does not include updated phone');
    assert.ok(afterContent.includes(newAddress), 'Contact page content does not include updated address');

    // Now set push checkbox off and change footer values; contact should not change
    await page.evaluate(() => { const c = document.getElementById('footerPushContact'); if (c) c.checked = false; const form = document.getElementById('footerEditorForm'); form.querySelector('[name="supportEmail"]').value = 'no-push@example.com'; form.querySelector('[name="supportPhone"]').value = '+1555000000'; form.querySelector('[name="address"]').value = 'DoNotPush'; });
    await page.click('#footerEditorForm button[type="submit"]');
    await new Promise(r => setTimeout(r, 1000));

    const contactAfterNoPushPage = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/pages/slug/contact`); const j = await r.json(); return j && j.success ? (j.data || {}) : null;
    }, API_BASE);

    assert.ok(contactAfterNoPushPage, 'Failed to read contact after no-push update');
    const afterNoPushContent = contactAfterNoPushPage.content || '';
    assert.ok(afterNoPushContent.includes(newEmail), 'Contact email changed unexpectedly when push unchecked');

    console.log('E2E FOOTER->CONTACT PUSH: Success');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E FOOTER->CONTACT PUSH: Failure', err && err.message ? err.message : err);
    try { await page.screenshot({ path: 'tmp/e2e-footer-push-failure.png', fullPage: true }); } catch(e){}
    await browser.close();
    process.exit(2);
  }
})();