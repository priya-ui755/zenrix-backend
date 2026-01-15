const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'error', text: err.message }));

  // Load admin page, set adminToken in same origin, then reload to simulate logged-in admin
  await page.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.setItem('adminToken', 'fake-admin-token'); });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const elements = await page.evaluate(() => {
    const logoutEl = document.getElementById('logoutBtn');
    const sidebar = document.getElementById('adminSidebar');
    const reprocess = document.getElementById('reprocessImagesBtn');
    const brand = document.querySelector('.brand-text');
    const productsList = document.getElementById('productsList');
    return {
      sidebarExists: !!sidebar,
      sidebarVisible: sidebar ? getComputedStyle(sidebar).display !== 'none' : false,
      logoutExists: !!logoutEl,
      logoutVisible: logoutEl ? getComputedStyle(logoutEl).display !== 'none' : false,
      logoutStyles: logoutEl ? (function(cs){ return { background: cs.backgroundColor, color: cs.color, padding: cs.padding, borderRadius: cs.borderRadius, display: cs.display}; })(getComputedStyle(logoutEl)) : null,
      reprocessStyles: reprocess ? (function(cs){ return { background: cs.backgroundColor, color: cs.color, padding: cs.padding, display: cs.display}; })(getComputedStyle(reprocess)) : null,
      brandText: brand ? brand.textContent.trim() : null,
      productsListExists: !!productsList,
      recentOrdersExists: !!document.getElementById('recentOrdersBody'),
      testimonialsTabExists: !!document.getElementById('tab-testimonials')
    };
  });

  await page.screenshot({ path: 'tmp/admin-dashboard.png', fullPage: true });

  console.log(JSON.stringify({ logs, elements }, null, 2));

  await browser.close();
})();