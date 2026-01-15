const puppeteer = require('puppeteer');

(async () => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    // Open public site
    const site = await browser.newPage();
    await site.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });

    // Capture initial phone text
    const initialPhone = await site.evaluate(() => {
      const footerEl = document.querySelector('custom-footer');
      if (!footerEl || !footerEl.shadowRoot) return null;
      const p = footerEl.shadowRoot.querySelector('.footer-support .contact-lines');
      return p ? p.textContent.trim() : null;
    });
    console.log('Initial footer contact text:', initialPhone);

    // Admin page
    const admin = await browser.newPage();
    // Acquire admin token via API and set into localStorage before loading the admin page
    const tokenRes = await (await fetch('http://localhost:3000/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) })).json();
    if (!tokenRes.success || !tokenRes.token) throw new Error('Admin login (API) failed');
    await admin.evaluateOnNewDocument((t)=> { try { localStorage.setItem('adminToken', t); } catch(e){} }, tokenRes.token);
    await admin.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'networkidle2' });
    // ensure admin UI is ready
    await admin.waitForFunction(() => typeof getAdminToken === 'function' && !!getAdminToken(), { timeout: 5000 });

    // Open Pages tab
    await admin.waitForSelector('[data-jump-tab="pages"]', { visible: true });
    await admin.click('[data-jump-tab="pages"]');
    await admin.waitForSelector('#content-pages .bg-white', { visible: true });

    // Find the contact page card and click its Edit button
    const pageCards = await admin.$$('#content-pages [data-edit-page]');
    let clicked = false;
    for (const btn of pageCards) {
      const container = (await btn.evaluateHandle(b => b.closest('div.bg-white')));
      const slugEl = await container.$('p.text-sm');
      const slugText = slugEl ? await slugEl.evaluate(n => n.textContent) : '';
      if (slugText && slugText.includes('/contact')) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) throw new Error('Contact page edit button not found');

    // Wait for edit modal and quill to initialize
    await admin.waitForSelector('#editPageModal', { visible: true });
    await admin.waitForSelector('#editPageEditor', { visible: true });

    // Update content: change phone number
    const newPhone = '+91 99988 77766';
    await admin.evaluate((val) => {
      const q = window.quillEdit;
      if (!q) return;
      const html = q.root.innerHTML || '';
      const updated = html.replace(/Phone:\s*[^<\n]*/i, 'Phone: ' + val);
      q.root.innerHTML = updated;
    }, newPhone);

    // Submit the form
    await admin.click('#editPageModal form button[type="submit"]');

    // Wait for save success toast
    await admin.waitForFunction(() => {
      const el = document.querySelector('.toast');
      return el && el.textContent && el.textContent.toLowerCase().includes('page updated');
    }, { timeout: 5000 }).catch(() => {});

    // Poll the components API until footer supportPhone is updated (server or client-side sync)
    const start = Date.now();
    let footerUpdated = false;
    while (Date.now() - start < 8000) {
      const f = await admin.evaluate(async () => {
        const r = await fetch('/api/components/slug/footer');
        return await r.json();
      });
      if (f && f.success && f.data && f.data.data && f.data.data.supportPhone && f.data.data.supportPhone.includes(newPhone.replace(/\s+/g,'')) || (f && f.success && f.data && f.data.data && f.data.data.supportPhone && f.data.data.supportPhone.includes(newPhone))) {
        footerUpdated = true;
        // Make sure running site tabs also apply the new footer data
        await site.evaluate((payload) => {
          try { localStorage.setItem('footerData', JSON.stringify(payload)); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('footerDataUpdated', { detail: { data: payload } })); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('componentUpdated', { detail: { slug: 'footer', data: { data: payload } } })); } catch (e) {}
        }, f.data.data);
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!footerUpdated) throw new Error('Footer component did not update in time');

    const updatedText = await site.evaluate(() => {
      const footerEl = document.querySelector('custom-footer');
      const p = footerEl && footerEl.shadowRoot && footerEl.shadowRoot.querySelector('.footer-support .contact-lines');
      return p ? p.textContent.trim() : null;
    });

    console.log('Updated footer contact text:', updatedText);
    if (!updatedText || !updatedText.includes('+91 99988 77766')) throw new Error('Footer did not pick up updated phone');

    console.log('E2E contact->footer sync: OK');
    await browser.close();
  } catch (err) {
    console.error('E2E contact->footer sync FAILED', err);
    try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();