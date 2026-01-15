const puppeteer = require('puppeteer');
const assert = require('assert');

const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_DASH = (process.env.ADMIN_URL || 'http://localhost:3000') + '/admin-dashboard.html';

(async () => {
  console.log('E2E CONTACT->FOOTER SYNC: Launching');
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

    // take snapshot of current footer contact fields
    const footerBefore = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/components/slug/footer`); const j = await r.json();
      if (!j || !j.success) return null; const d = j.data.data || {}; return { supportEmail: d.supportEmail || '', supportPhone: d.supportPhone || '', mapEmbed: d.mapEmbed || '' };
    }, API_BASE);
    assert.ok(footerBefore, 'Failed to read footer component');

    // set admin token and reload to ensure UI is loaded as authed
    await page.evaluate((t) => localStorage.setItem('adminToken', t), loginResp.token);
    await page.reload({ waitUntil: 'networkidle2' });

    // Navigate to Contact Editor and change values
    await page.evaluate(() => document.querySelector('[data-jump-tab="contact-editor"]')?.click());
    await new Promise(r => setTimeout(r, 300));

    const uniqueSuffix = Math.floor(Math.random()*100000);
    const newEmail = `test-${uniqueSuffix}@example.com`;
    const newPhone = `+1555${String(uniqueSuffix).slice(0,6)}`;

    await page.evaluate((email, phone) => {
      const form = document.getElementById('contactEditorForm');
      form.querySelector('[name="supportEmail"]').value = email;
      form.querySelector('[name="supportPhone"]').value = phone;
    }, newEmail, newPhone);

    // Submit the contact editor form
    await page.click('#contactEditorForm button[type="submit"]');
    // wait a bit for submission
    await new Promise(r => setTimeout(r, 900));

    // read footer component again
    const footerAfter = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/components/slug/footer`); const j = await r.json();
      if (!j || !j.success) return null; const d = j.data.data || {}; return { supportEmail: d.supportEmail || '', supportPhone: d.supportPhone || '', mapEmbed: d.mapEmbed || '' };
    }, API_BASE);

    console.log('Footer before:', footerBefore, 'Footer after:', footerAfter);

    assert.ok(footerAfter, 'Failed to read footer component after update');
    assert.strictEqual(footerAfter.supportEmail, footerBefore.supportEmail, 'Footer supportEmail changed unexpectedly');
    assert.strictEqual(footerAfter.supportPhone, footerBefore.supportPhone, 'Footer supportPhone changed unexpectedly');

    console.log('E2E CONTACT->FOOTER SYNC: Success (contact edits did not modify footer)');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E CONTACT->FOOTER SYNC: Failure', err && err.message ? err.message : err);
    try { await page.screenshot({ path: 'tmp/e2e-contact-footer-failure.png', fullPage: true }); } catch (e) {}
    await browser.close();
    process.exit(2);
  }
})();