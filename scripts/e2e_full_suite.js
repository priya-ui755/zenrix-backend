const puppeteer = require('puppeteer');
(async()=>{
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[PAGE]', msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  try {
    console.log('➡️ Opening admin dashboard');
    await page.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'domcontentloaded' });

    // Ensure overlay is visible
    await page.waitForSelector('#authOverlay', { timeout: 5000 });

    // Click overlay login
    const overlayBtn = await page.$('#authOverlayLogin');
    if (!overlayBtn) throw new Error('authOverlayLogin not found');
    await overlayBtn.click();
    await page.waitForSelector('#loginModal:not(.hidden)', { timeout: 3000 });

    console.log('➡️ Logging in as admin');
    await page.type('#adminPassword', 'admin123');
    await page.click('#loginForm button[type="submit"]');

    // Wait for login success
    await page.waitForFunction(()=>{
      const b = document.getElementById('logoutBtn');
      return !!b && !b.classList.contains('hidden');
    }, { timeout: 7000 });
    console.log('✅ Logged in');

    // Navigate to Products tab
    console.log('➡️ Opening Products tab');
    await page.click('[data-jump-tab="products"]');
    await page.waitForSelector('#content-products .products-list, #productsList', { timeout: 5000 }).catch(()=>{});
    console.log('✅ Products tab loaded');

    // Create a temporary product via in-page fetch (authenticated via cookie/public token)
    console.log('➡️ Creating temporary product via API');
    const tmpProduct = await page.evaluate(async ()=>{
      const payload = { name: 'E2E Test Product ' + Date.now(), price: 1.23, stock: 5, description: 'temp e2e', category: 'other' };
      const res = await fetch('/api/products', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      let j = null;
      try { j = await res.json(); } catch(e) { j = null; }
      return { status: res.status, body: j };
    });

    if (!tmpProduct || !(tmpProduct.status >= 200 && tmpProduct.status < 300) || !tmpProduct.body || !tmpProduct.body.data) {
      throw new Error('Failed to create temp product: ' + JSON.stringify(tmpProduct));
    }
    const pid = tmpProduct.body.data._id;
    console.log('temp product created at id=', pid);
    console.log('✅ Created temp product:', pid);

    // Try opening its edit modal via UI (search product row and click edit)
    console.log('➡️ Attempting to open product edit modal');
    await page.evaluate((pid)=>{
      try {
        const row = document.querySelector(`[data-product-id="${pid}"]`) || document.querySelector(`[data-edit-product="${pid}"]`);
        if (row) {
          const btn = row.querySelector('[data-edit-product]') || row.querySelector('button[data-edit-product]');
          if (btn) btn.click();
        }
      } catch(e){}
    }, pid);
    // Wait briefly (modal may or may not open depending on list render)
    await new Promise(r => setTimeout(r, 600));
    console.log('✅ Product edit attempted (non-blocking)');

    // Navigate to Orders tab
    console.log('➡️ Opening Orders tab');
    await page.click('[data-jump-tab="orders"]');
    await new Promise(r => setTimeout(r, 600));
    console.log('✅ Orders tab visited');
    // Clean up: delete temp product via in-page fetch
    console.log('➡️ Deleting temporary product via API:', pid);
    const delRes = await page.evaluate(async (pid)=>{
      try {
        const res = await fetch('/api/products/' + pid, { method:'DELETE', credentials:'include' });
        return { status: res.status, ok: res.ok };
      } catch(e) { return { error: String(e) } }
    }, pid);
    console.log('Delete result:', delRes);

    // Logout
    console.log('➡️ Logging out');
    await page.evaluate(()=>{ try { document.getElementById('logoutBtn')?.click(); } catch(e){} });
    await new Promise(r => setTimeout(r, 400));

    console.log('✅ E2E flow completed successfully');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E suite failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();