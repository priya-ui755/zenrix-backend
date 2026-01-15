const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'], protocolTimeout: 120000 });
  const page = await browser.newPage();
  const logs = [];
  const net = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'error', text: err.message }));
  page.on('request', req => { if (req.url().includes('/api/admin/login')) net.push({ type: 'request', url: req.url(), method: req.method(), postData: req.postData() }); });
  page.on('response', async res => { if (res.url().includes('/api/admin/login')) { let body = null; try { body = await res.text(); } catch(e) { body = '<body-fetch-failed>'; } net.push({ type: 'response', url: res.url(), status: res.status(), statusText: res.statusText(), body }); } });

  await page.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));

  // Try to open login modal via adminStatus click, then type password and submit
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
  try {
    // Try to open the login modal using the public helper if available
    await page.evaluate(() => { if (typeof openLoginModal === 'function') try { openLoginModal(); } catch(e) {} });
  } catch (e) {}
  // Wait for login modal to appear or ensure the inline modal exists
  await page.waitForSelector('#loginModal', { visible: true, timeout: 60000 }).catch(() => {});
  // Wait for password input and type the password
  const pwdSelector = '#loginModal #adminPassword';
  await page.waitForSelector(pwdSelector, { visible: true, timeout: 60000 });
  await page.click(pwdSelector);
  await page.type(pwdSelector, ADMIN_PASSWORD, { delay: 30 });
  // Click submit button in the form
  const submitSelector = '#loginForm button[type=submit]';
  await page.waitForSelector(submitSelector, { visible: true, timeout: 60000 });
  await page.click(submitSelector);

  // wait for network/handlers
  await new Promise(r => setTimeout(r, 1500));

  // capture adminToken and UI state
  const state = await page.evaluate(() => ({
    adminToken: localStorage.getItem('adminToken'),
    authSign: document.getElementById('adminAuthSign') ? document.getElementById('adminAuthSign').innerHTML : null,
    logoutVisible: !!(document.getElementById('logoutBtn') && getComputedStyle(document.getElementById('logoutBtn')).display !== 'none')
  }));

  // Grab recent network requests (if any) from performance entries
  const perf = await page.evaluate(() => performance.getEntries().slice(-20).map(e => ({ name: e.name, initiatorType: e.initiatorType })) );

  console.log(JSON.stringify({ logs, res, state, perf }, null, 2));
  await browser.close();
})();