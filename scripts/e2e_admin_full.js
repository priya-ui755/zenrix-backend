/*
Puppeteer E2E test for admin flows:
- Admin login via POST /api/admin/login
- Navigate to /admin-dashboard.html
- Open Products tab, edit a product price, confirm change via API
- Submit testimonial (public), approve via admin API, and verify audits exist

Run locally with: ADMIN_PASSWORD=admin123 node scripts/e2e_admin_full.js
*/

const puppeteer = require('puppeteer');
const assert = require('assert');

const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_DASH = (process.env.ADMIN_URL || 'http://localhost:3000') + '/admin-dashboard.html';

(async () => {
  console.log('E2E ADMIN: Launching browser');
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  try {
    // Perform admin login via fetch in the page context so the session token is valid for same-origin requests
    await page.goto(ADMIN_DASH, { waitUntil: 'domcontentloaded' });
    const loginResp = await page.evaluate(async (apiUrl, pw) => {
      const res = await fetch(`${apiUrl}/admin/login`, {
        method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ password: pw })
      });
      return res.json();
    }, API_BASE, ADMIN_PW);
    console.log('Login response', loginResp && (loginResp.success ? 'success' : JSON.stringify(loginResp)));
    assert.ok(loginResp && loginResp.success, 'Admin login failed');

    // Store token and reload
    await page.evaluate((token) => localStorage.setItem('adminToken', token), loginResp.token);
    await page.reload({ waitUntil: 'networkidle2' });
    console.log('E2E ADMIN: Logged in and reloaded dashboard');

    // Navigate to Products tab
    await page.evaluate(() => {
      const btn = document.querySelector('[data-jump-tab="products"]');
      if (btn) btn.click();
    });

    // Wait for products to render
    await page.waitForSelector('#productsList', { visible: true });
    // Wait for at least one Edit button
    await page.waitForSelector('[data-edit-product]', { visible: true });

    // Grab first product id
    const productId = await page.evaluate(() => {
      const btn = document.querySelector('[data-edit-product]');
      return btn ? btn.getAttribute('data-edit-product') : null;
    });
    assert.ok(productId, 'No product found to edit');
    console.log('E2E ADMIN: Editing product', productId);

    // Click edit, change price, submit form
    await page.click(`[data-edit-product="${productId}"]`);
    await page.waitForSelector('#editProductModal', { visible: true });
    // Read current price
    const oldPrice = await page.$eval('#editProductForm [name="price"]', el => el.value);
    const newPrice = String(Math.floor(Number(oldPrice || 100) + 1));

    // ensure tmp exists
    await page.evaluate(() => {
      try { window.__e2e_tmp = window.__e2e_tmp || {}; } catch(e) {}
    });

    // take before screenshot
    try { await page.screenshot({ path: 'tmp/admin-product-before.png', fullPage: false }); } catch(e){}

    await page.focus('#editProductForm [name="price"]');
    await page.click('#editProductForm [name="price"]', { clickCount: 3 });
    await page.keyboard.type(newPrice);
    // Submit the form
    await page.click('#editProductForm button[type="submit"]');

    // Wait briefly for modal to hide then confirm via API that product updated
    await new Promise(r => setTimeout(r, 1000));
    const productAfter = await page.evaluate(async (api, id) => {
      const res = await fetch(`${api}/products/${id}`);
      return res.json();
    }, API_BASE, productId);
    assert.ok(productAfter && productAfter.success, 'Failed to fetch updated product');
    assert.strictEqual(String(productAfter.data.price), newPrice, 'Product price did not update');

    // Give UI a chance to refresh: reload and wait for products list
    try {
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#productsList', { visible: true, timeout: 5000 });
      await new Promise(r => setTimeout(r, 700));
    } catch(e) { /* ignore - best-effort */ }

    // UI check: product card shows updated price
    const uiDiagnostics = await page.evaluate((id) => {
      const btn = document.querySelector(`[data-edit-product="${id}"]`);
      if (!btn) return { found: false };
      const card = btn.closest('.card-hover') || btn.closest('[class*="bg-white"]') || btn.closest('.bg-white');
      if (!card) return { found: false };
      const txt = card.textContent || '';
      return { found: true, text: txt.trim() };
    }, productId);

    console.log('Product API price:', productAfter.data.price, 'New price we set:', newPrice);
    console.log('Product card text sample:', uiDiagnostics && uiDiagnostics.text ? uiDiagnostics.text.slice(0,200) : '(not found)');

    const formattedNew = Number(newPrice).toLocaleString('en-IN');
    const uiHasNewPrice = uiDiagnostics && uiDiagnostics.found && (
      uiDiagnostics.text.includes(newPrice) || uiDiagnostics.text.includes('NPR ' + newPrice) || uiDiagnostics.text.includes(formattedNew) || uiDiagnostics.text.includes('NPR ' + formattedNew)
    );

    // take after screenshot
    try { await page.screenshot({ path: 'tmp/admin-product-after.png', fullPage: false }); } catch(e){}

    assert.ok(uiHasNewPrice, 'Product card UI did not reflect new price');

    console.log('E2E ADMIN: Product updated successfully');

    // Submit a public testimonial with a test tag so cleanup can find it easily
    const testTag = 'E2E_TEST_' + Date.now();
    const tv = { name: `${testTag} - E2E Test`, review: `Automated E2E testimonial ${testTag}`, rating: 5 };
    const submitResp = await page.evaluate(async (api, t) => {
      const res = await fetch(`${api}/testimonials`, { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(t) });
      return res.json();
    }, API_BASE, tv);
    assert.ok(submitResp && submitResp.success, 'Testimonial submit failed');
    console.log('E2E ADMIN: Testimonial submitted', testTag);

    // Admin list testimonials and find the new one (search by tag)
    const adminList = await page.evaluate(async (api, token, tag) => {
      const res = await fetch(`${api}/testimonials/admin/all`, { headers: { 'Authorization': 'Bearer ' + token } });
      const j = await res.json();
      if (!j || !j.success) return j;
      const found = (j.data || []).find(t => (t.name || '').startsWith(tag) || (t.review || '').includes(tag));
      return { success: true, found, raw: j };
    }, API_BASE, loginResp.token, testTag);
    assert.ok(adminList && adminList.success && adminList.found, 'Submitted testimonial not present in admin list');
    const created = adminList.found;
    console.log('E2E ADMIN: Testimonial visible in admin', created._id);

    // Approve testimonial via admin API
    const approveResp = await page.evaluate(async (api, id, token) => {
      const res = await fetch(`${api}/testimonials/admin/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ status: 'approved', isActive: true }) });
      return res.json();
    }, API_BASE, created._id, loginResp.token);
    assert.ok(approveResp && approveResp.success && approveResp.data && approveResp.data.status === 'approved', 'Approving testimonial failed');
    console.log('E2E ADMIN: Testimonial approved');

    // Check audits
    const audits = await page.evaluate(async (api, id, token) => {
      const res = await fetch(`${api}/testimonials/admin/${id}/audits`, { headers: { 'Authorization': 'Bearer ' + token } });
      return res.json();
    }, API_BASE, created._id, loginResp.token);
    assert.ok(audits && audits.success && Array.isArray(audits.data) && audits.data.length >= 1, 'Audit entries not found');
    console.log('E2E ADMIN: Audits present, count=', audits.data.length);

    // Cleanup: delete any testimonials with the tag and revert product price
    try {
      const deleted = await page.evaluate(async (api, tag, token) => {
        const res = await fetch(`${api}/testimonials/admin/all`, { headers: { 'Authorization': 'Bearer ' + token } });
        const j = await res.json();
        if (!j || !j.success) return { success: false, raw: j };
        const toDelete = (j.data || []).filter(t => (t.name || '').startsWith(tag) || (t.review || '').includes(tag));
        const results = [];
        for (const t of toDelete) {
          const r = await fetch(`${api}/testimonials/admin/${t._id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
          results.push(await r.json());
        }
        return { success: true, deleted: results.length };
      }, API_BASE, testTag, loginResp.token);
      if (!(deleted && deleted.success)) console.warn('Cleanup: failed to delete testimonials by tag', deleted);

      // revert product price
      const revert = await page.evaluate(async (api, id, oldPrice, token) => {
        const res = await fetch(`${api}/products/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ price: Number(oldPrice) }) });
        return res.json();
      }, API_BASE, productId, oldPrice, loginResp.token);
      if (!(revert && revert.success)) console.warn('Cleanup: failed to revert product', revert);
    } catch (cleanupErr) {
      console.warn('Cleanup steps failed', cleanupErr && cleanupErr.message ? cleanupErr.message : cleanupErr);
    }

    console.log('E2E ADMIN: All checks passed');
    try { await page.screenshot({ path: 'tmp/e2e-admin-success.png' }); } catch(e){}
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E ADMIN: Failure', err && err.message ? err.message : err);
    try { await page.screenshot({ path: 'tmp/e2e-admin-failure.png', fullPage: true }); } catch(e){}
    await browser.close();
    process.exit(2);
  }
})();