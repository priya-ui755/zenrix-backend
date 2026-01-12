const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // Start the app programmatically on a test port so headless browser can reach it reliably
  const app = require('../server');
  const TEST_PORT = process.env.UI_TEST_PORT || 3001;
  const server = app.listen(TEST_PORT);
  const base = `http://localhost:${TEST_PORT}`;
  const pagesToCheck = [
    '/admin-dashboard.html',
    '/admin.html',
    '/',
    '/index.html',
    '/products.html',
    '/product.html',
    '/cart.html',
    '/checkout.html',
    '/support.html',
    '/wishlist.html',
    '/login.html',
    '/register.html'
  ];
  const results = [];

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    for (const path of pagesToCheck) {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(30000);

      const pageResult = { path, console: [], errors: [], failedResponses: [] };

      page.on('console', msg => {
        try {
          pageResult.console.push({ type: msg.type(), text: msg.text() });
        } catch (e) {
          pageResult.console.push({ type: 'log', text: String(msg) });
        }
      });

      page.on('pageerror', err => {
        pageResult.errors.push({ message: err.message, stack: err.stack });
      });

      // capture runtime errors with more details (filename / lineno) inside the page
      await page.evaluateOnNewDocument(() => {
        window._pageErrors = [];
        window.addEventListener('error', e => {
          window._pageErrors.push({ message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error && e.error.stack });
        });
        window.addEventListener('unhandledrejection', e => {
          const reason = e.reason;
          window._pageErrors.push({ message: 'unhandledrejection: ' + (reason && reason.message ? reason.message : String(reason)), stack: reason && reason.stack });
        });
      });

      // Allow tests to override API host for same-origin requests
      await page.evaluateOnNewDocument(port => {
        window.__API__ = `http://localhost:${port}/api`;
      }, TEST_PORT);

      page.on('response', res => {
        if (!res.ok()) {
          pageResult.failedResponses.push({ url: res.url(), status: res.status(), statusText: res.statusText() });
        }
      });

      // Configure request interception to rewrite API host from 3000 -> test port (avoids CSP cross-origin failures)
      await page.setRequestInterception(true);
      page.on('request', req => {
        const url = req.url();
        if (url.startsWith('http://localhost:3000/api')) {
          const newUrl = url.replace('http://localhost:3000', `http://localhost:${TEST_PORT}`);
          req.continue({ url: newUrl });
        } else {
          req.continue();
        }
      });

      // If admin-dashboard, try a login via API to set admin token in localStorage (talk to the test server)
      if (path.includes('admin-dashboard')) {
        try {
          const resp = await (await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'admin' }) })).json();
          if (resp && resp.success && resp.token) {
            await page.goto('about:blank');
            await page.evaluate(token => localStorage.setItem('adminToken', token), resp.token);
          }
        } catch (e) {
          pageResult.console.push({ type: 'error', text: 'Failed to login via API: ' + e.message });
        }
      }

      await page.goto(base + path, { waitUntil: 'networkidle2' }).catch(e => pageResult.console.push({ type: 'navigation-error', text: e.message }));
      // wait a bit for any async logs
      await new Promise(r => setTimeout(r, 1200));

      // capture any page-level tracked errors
      try {
        const pageErrors = await page.evaluate(() => window._pageErrors || []);
        if (pageErrors && pageErrors.length) pageResult.pageErrors = pageErrors;
      } catch (e) {
        // ignore
      }

      // collect any admin diagnostics exposed by the page
      try {
        const diag = await page.evaluate(() => window.__adminDiagnostics || null);
        if (diag) pageResult.adminDiagnostics = diag;
      } catch (e) {
        // ignore
      }

      // capture screenshot
      const outdir = 'tmp/ui-check-screenshots';
      if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });
      const filename = `${outdir}/${path.replace(/[^a-z0-9.-]/gi, '_')}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      pageResult.screenshot = filename;

      results.push(pageResult);
      await page.close();
    }

    const summaryPath = 'tmp/ui-check-results.json';
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
    console.log('UI check completed. Results written to', summaryPath);
    console.log(JSON.stringify(results, null, 2));

    // Opt-in failure rules: fail if UI_FAIL_ON_ERRORS environment flag is set
    const failOnErrors = (process.env.UI_FAIL_ON_ERRORS === '1' || process.env.UI_FAIL_ON_ERRORS === 'true');
    if (failOnErrors) {
      let found = false;
      results.forEach(r => {
        if (r.console && r.console.some(c => c.type === 'error')) found = true;
        if (r.adminDiagnostics && Array.isArray(r.adminDiagnostics.failedResponses) && r.adminDiagnostics.failedResponses.length) found = true;
        if (r.failedResponses && r.failedResponses.some(f => f.status >= 400)) found = true;
      });
      if (found) {
        console.error('UI check failed due to console errors/failed responses (UI_FAIL_ON_ERRORS enabled).');
        await browser.close();
        process.exit(2);
      }
    }

    await browser.close();
    process.exit(0);

  } catch (err) {
    console.error('Headless UI check failed:', err);
    await browser.close();
    process.exit(2);
  }
})();
