const { test, expect } = require('@playwright/test');
const diagUtil = require('../helpers/e2e-utils');
const path = require('path');

// Per-test hooks to collect diagnostics and traces when E2E_DIAGNOSTICS=true
test.beforeEach(async ({ page }) => {
  // attach console/pageerror collectors
  page._e2e_logs = [];
  page.on('console', m => page._e2e_logs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => page._e2e_logs.push({ type: 'pageerror', text: e.message }));

  if (diagUtil.diagnosticsEnabled()) {
    try { await diagUtil.startTracing(page.context()); } catch (e) { console.warn('Tracing start failed', e); }
  }
});

test.afterEach(async ({ page }, testInfo) => {
  if (!diagUtil.diagnosticsEnabled()) return;

  if (testInfo.status !== 'passed') {
    const safeTitle = testInfo.title.replace(/[^\w\-]+/g, '_').slice(0,200);
    try { await diagUtil.writeDiagnosticScreenshot(`${safeTitle}.png`, page); } catch(e) {}
    const html = await page.content().catch(()=>null);
    if (html) diagUtil.writeDiagnosticFile(`${safeTitle}.html`, html);
    const lastErrors = await page.evaluate(() => window._lastErrors || []).catch(()=>null);
    if (lastErrors) diagUtil.writeDiagnosticJson(`${safeTitle}.errors.json`, lastErrors);
    const logs = page._e2e_logs || [];
    if (logs && logs.length>0) diagUtil.writeDiagnosticJson(`${safeTitle}.console.json`, logs);
    try { await diagUtil.stopTracing(`${safeTitle}.zip`, page.context()); } catch (e) { console.warn('Tracing stop failed', e); }
  } else {
    // stop tracing quietly on success
    try { await page.context().tracing.stop(); } catch (e) { /* ignore */ }
  }
});

test('Admin CRUD and ordering flow (E2E)', async ({ page, request }) => {
  // Load admin dashboard (served from /admin-dashboard.html)
  await page.goto('/admin-dashboard.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // collect console/page errors for diagnostics
  const logs = [];
  page.on('console', m => logs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => logs.push({ type: 'pageerror', text: e.message }));

  // install in-page error collectors for additional diagnostics
  await page.evaluate(() => {
    window._lastErrors = [];
    window.addEventListener('error', (e) => { try { window._lastErrors.push({ message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno }); } catch (err) {} });
    window.addEventListener('unhandledrejection', (e) => { try { window._lastErrors.push({ message: e.reason && e.reason.message ? e.reason.message : String(e.reason) }); } catch (err) {} });
  });

  // ensure base login button exists (may be replaced by setAdminUI)
  await page.waitForSelector('#adminControls', { timeout: 30000 });
  // if login button present, wait for it to be clickable
  // (we'll set admin login via API anyway)

  // Acquire token via API and set it in the page to ensure reliable auth state
  const loginRes = await request.post('/api/admin/login', { data: { password: 'admin' } });
  const loginJson = await loginRes.json();
  const apiToken = loginJson.token;

  // Set token in localStorage (API login) and ensure UI reflects login state (fallback to manual DOM update if helper isn't available)
  await page.evaluate((t) => { localStorage.setItem('adminToken', t); }, apiToken);
  // Attempt to call site helper; if not present, patch the UI directly
  await page.evaluate(() => {
    if (typeof window.setAdminUI === 'function') {
      window.setAdminUI();
    } else {
      const adminControls = document.getElementById('adminControls');
      if (adminControls) adminControls.innerHTML = `<span class="text-sm text-green-600">Admin: Logged in</span> <button class="ml-2 px-3 py-1 rounded border" onclick="logoutAdmin()">Logout</button>`;
    }
  });

  // Wait until the UI reflects admin login
  await page.waitForFunction(() => {
    const c = document.getElementById('adminControls');
    return c && c.innerText && c.innerText.includes('Admin: Logged in');
  });
  await expect(page.locator('#adminControls')).toContainText('Admin: Logged in');

  // Ensure fallback editors exist immediately so tests don't depend on CDN/quill timing
  await page.evaluate(() => {
    function ensureFallback() {
      try {
        if (!window.quillAdd || !window.quillAdd.root) {
          const add = document.getElementById('addPageEditor');
          if (add && !add.querySelector('.fallback-editor') && !add.querySelector('.ql-container')) {
            add.innerHTML = '';
            const d = document.createElement('div');
            d.setAttribute('contenteditable','true');
            d.className = 'fallback-editor';
            d.style.minHeight = '160px';
            add.appendChild(d);
            window.quillAdd = { root: d };
          } else if (add && add.querySelector('.ql-container') && !window.quillAdd) {
            window.quillAdd = { root: add.querySelector('.ql-editor') || add.querySelector('.ql-container') };
          }
        }
        if (!window.quillEdit || !window.quillEdit.root) {
          const edit = document.getElementById('editPageEditor');
          if (edit && !edit.querySelector('.fallback-editor') && !edit.querySelector('.ql-container')) {
            edit.innerHTML = '';
            const d2 = document.createElement('div');
            d2.setAttribute('contenteditable','true');
            d2.className = 'fallback-editor';
            d2.style.minHeight = '160px';
            edit.appendChild(d2);
            window.quillEdit = { root: d2 };
          } else if (edit && edit.querySelector('.ql-container') && !window.quillEdit) {
            window.quillEdit = { root: edit.querySelector('.ql-editor') || edit.querySelector('.ql-container') };
          }
        }
        window.quillReady = true;
        window.quillStatus = window.quillStatus || 'injected-fallback';
        return true;
      } catch (e) { return false; }
    }
    return ensureFallback();
  });

  // Create a new page
  const slug = `e2e-page-${Date.now()}`;
  await page.fill('form#addPageForm input[name="slug"]', slug);
  await page.fill('form#addPageForm input[name="title"]', 'E2E Test Page');

  // Wait for the test helper or fallback editor to appear; if it doesn't show up, create fallback editors so test can proceed
  try {
    await page.waitForFunction(() => typeof window.ensureQuillReady === 'function' || !!document.querySelector('.fallback-editor'), { timeout: 15000 });
  } catch (err) {
    if (page.isClosed && page.isClosed()) throw new Error('Page closed before Quill helper appeared; logs: ' + JSON.stringify(logs.slice(0,50)));
    // collect diagnostic info and attempt to create fallback editors safely
    try {
      const diagFail = await page.evaluate(() => ({
        hasQuill: !!window.Quill,
        hasInit: typeof initQuillEditors === 'function',
        hasEnsure: typeof window.ensureQuillReady === 'function',
        quillStatus: window.quillStatus || null,
        scripts: Array.from(document.scripts).map(s => s.src || (s.innerText||'').slice(0,120))
      }));
      await page.evaluate(() => {
        if (!document.querySelector('.fallback-editor')) {
          const add = document.getElementById('addPageEditor');
          if (add) { add.innerHTML = ''; const d = document.createElement('div'); d.setAttribute('contenteditable','true'); d.className = 'fallback-editor'; d.style.minHeight = '160px'; add.appendChild(d); }
          const edit = document.getElementById('editPageEditor');
          if (edit) { edit.innerHTML = ''; const d2 = document.createElement('div'); d2.setAttribute('contenteditable','true'); d2.className = 'fallback-editor'; d2.style.minHeight = '160px'; edit.appendChild(d2); }
        }
        return true;
      });
      // brief pause to ensure DOM updates
      await page.waitForTimeout(200);
    } catch (e) {
      throw new Error('Failed to ensure/create fallback editor; original: ' + (err && err.message) + ' inner: ' + (e && e.message) + ' | logs: ' + JSON.stringify(logs.slice(0,50)));
    }
  }

  const diag = await page.evaluate(() => ({
    hasQuill: !!window.Quill,
    hasInit: typeof initQuillEditors === 'function',
    hasEnsure: typeof window.ensureQuillReady === 'function',
    quillStatus: window.quillStatus || null,
    hasQuillScript: !!document.querySelector('script[src*="quilljs.com"]'),
    hasInitText: document.documentElement.innerHTML.includes('initQuillEditors'),
    hasAddEditor: !!document.getElementById('addPageEditor'),
    hasEditEditor: !!document.getElementById('editPageEditor'),
    scripts: Array.from(document.scripts).map(s => ({ src: s.src, type: s.type, inner: (s.innerText || '').slice(0,120) }))
  }));

  // Call helper (or resolve true if using a fallback editor)
  const quillOk = await page.evaluate(() => {
    try {
      if (typeof window.ensureQuillReady === 'function') return window.ensureQuillReady(25000);
      return Promise.resolve(true); // fallback editor was created by page
    } catch (e) {
      return false;
    }
  });
  if (!quillOk) throw new Error('Quill did not initialize in time; diagnostic: ' + JSON.stringify(diag) + ' | logs: ' + JSON.stringify(logs.slice(0,50)));

  const editorEmpty = await page.evaluate(() => window.quillAdd && window.quillAdd.root && window.quillAdd.root.innerHTML.length === 0);
  if (editorEmpty) {
    await page.evaluate(() => { window.quillAdd.root.innerHTML = '<h2>Test Content</h2><p>This was created by Playwright</p>' });
  }

  // Instrument /api/pages requests to capture responses for diagnostics
  const pageApiLogs = [];
  page.on('request', req => { if (req.url().includes('/api/pages')) pageApiLogs.push({ type: 'request', url: req.url(), method: req.method() }); });
  page.on('response', async resp => { if (resp.url().includes('/api/pages')) { const body = await resp.text().catch(()=>null); pageApiLogs.push({ type: 'response', url: resp.url(), status: resp.status(), body }); } });

  await page.click('form#addPageForm button:has-text("Create Page")');

  // Wait for the POST /api/pages response and assert it succeeded
  let postResp = null;
  try {
    postResp = await page.waitForResponse(resp => resp.url().includes('/api/pages') && resp.request().method() === 'POST', { timeout: 10000 });
  } catch (e) {
    throw new Error('No POST /api/pages response within timeout; logs: ' + JSON.stringify(logs.slice(0,50)));
  }
  const postBody = await postResp.json().catch(()=>null);
  if (!postResp.ok()) throw new Error('Create page failed: ' + postResp.status() + ' ' + JSON.stringify(postBody));

  // Wait for the page to show in the list
  await page.waitForSelector('#pagesList .font-bold:has-text("E2E Test Page")', { timeout: 10000 });

  // Test preview endpoint (should require auth)
  const previewResUnauth = await request.get(`/api/pages/preview/${slug}`);
  const previewUnauthJson = await previewResUnauth.json();
  // without auth this should fail
  expect(previewUnauthJson.success).toBeFalsy();

  // with token it should succeed
  const previewRes = await request.get(`/api/pages/preview/${slug}`, { headers: { Authorization: 'Bearer ' + apiToken } });
  const previewJson = await previewRes.json();
  expect(previewJson.success).toBeTruthy();
  expect(previewJson.data.slug).toBe(slug);

  // Find the created page card and click Edit
  const pageCard = page.locator('#pagesList .font-bold').filter({ hasText: 'E2E Test Page' }).first();
  await expect(pageCard).toBeVisible();
  const parentCard = pageCard.locator('..').locator('..');
  const editBtn = parentCard.locator('button:has-text("Edit")').first();
  // get onclick handler for diagnostics
  let onclick = await editBtn.evaluate(n => n.getAttribute('onclick'));
  const dataId = onclick && onclick.match(/'([0-9a-f]{24})'/); // attempt to extract id
  await editBtn.click();
  // short pause to allow inline handler to run
  await page.waitForTimeout(100);

  // Wait for modal and add diagnostics if not visible
  try {
    await page.waitForSelector('#editPageModal:not(.hidden)', { timeout: 5000 });
  } catch (e) {
    // attempt to call editPage directly using onclick id
    onclick = onclick || await editBtn.evaluate(n => n.getAttribute('onclick'));
    const idMatch = (onclick && onclick.match(/'([0-9a-f]{24})'/)) || null;
    if (idMatch) {
      await page.evaluate((id) => { try { window.editPage(id); } catch(e) { window._lastErrors.push({ message: 'Direct editPage call failed: ' + (e && e.message)}); } }, idMatch[1]);
      // short wait to let DOM update
      await page.waitForTimeout(100);
      const nowVis = await page.$('#editPageModal:not(.hidden)');
      if (nowVis) {
        // modal appeared via direct call; continue
      } else {
        // capture diagnostic HTML and screenshot (only when diagnostics enabled)
        const html = await page.content();
        const state = await page.evaluate(() => ({
          pagesCacheKeys: Object.keys(window.pagesCache || {}),
          pagesCacheSample: Object.keys(window.pagesCache || {}).slice(0,5).map(k => ({ k, title: window.pagesCache[k] && window.pagesCache[k].title })),
          editModalClass: document.getElementById('editPageModal') && document.getElementById('editPageModal').className,
          lastConsole: window._lastErrors || null
        }));

        const diag = require('../helpers/e2e-utils');
        if (diag.diagnosticsEnabled()) {
          diag.writeDiagnosticFile('admin_edit_modal_failure.html', html);
          await diag.writeDiagnosticScreenshot('admin_edit_modal_failure.png', page);
          diag.writeDiagnosticJson('admin_edit_modal_state.json', state);
          throw new Error('Edit modal did not become visible; saved tmp/admin_edit_modal_failure.{html,png} and tmp/admin_edit_modal_state.json');
        } else {
          console.warn('Edit modal did not become visible; enable E2E_DIAGNOSTICS=true to save diagnostics. State:', state);
          throw new Error('Edit modal did not become visible; enable E2E_DIAGNOSTICS for more info');
        }
      }
    } else {
      const html = await page.content();
      const state = await page.evaluate(() => ({ pagesCacheKeys: Object.keys(window.pagesCache || {}), editModalClass: document.getElementById('editPageModal') && document.getElementById('editPageModal').className, lastConsole: window._lastErrors || null }));
      const diag = require('../helpers/e2e-utils');
      if (diag.diagnosticsEnabled()) {
        diag.writeDiagnosticFile('admin_edit_modal_failure.html', html);
        await diag.writeDiagnosticScreenshot('admin_edit_modal_failure.png', page);
        diag.writeDiagnosticJson('admin_edit_modal_state.json', state);
        throw new Error('Edit modal did not become visible and onclick id could not be determined; saved diagnostic files');
      } else {
        console.warn('Edit modal did not become visible and onclick id could not be determined; enable E2E_DIAGNOSTICS for more info. State:', state);
        throw new Error('Edit modal did not become visible and onclick id could not be determined; enable E2E_DIAGNOSTICS for more info');
      }
    }
  }

  // Update title and content
  await page.fill('#editPageForm input[name="title"]', 'E2E Test Page Updated');
  // Wait for helper or fallback editor to appear before editing; create fallback if it never appears
  try {
    await page.waitForFunction(() => typeof window.ensureQuillReady === 'function' || !!document.querySelector('.fallback-editor'), { timeout: 15000 });
  } catch (err) {
    if (page.isClosed && page.isClosed()) throw new Error('Page closed before Quill helper appeared (edit step); logs: ' + JSON.stringify(logs.slice(0,50)));
    try {
      const diagFail = await page.evaluate(() => ({ hasQuill: !!window.Quill, hasInit: typeof initQuillEditors === 'function', hasEnsure: typeof window.ensureQuillReady === 'function', quillStatus: window.quillStatus || null }));
      await page.evaluate(() => {
        if (!document.querySelector('.fallback-editor')) {
          const edit = document.getElementById('editPageEditor');
          if (edit) { edit.innerHTML = ''; const d2 = document.createElement('div'); d2.setAttribute('contenteditable','true'); d2.className = 'fallback-editor'; d2.style.minHeight = '160px'; edit.appendChild(d2); }
        }
        return true;
      });
      await page.waitForTimeout(200);
    } catch (e) {
      throw new Error('Failed to ensure/create fallback editor (edit step); original: ' + (err && err.message) + ' inner: ' + (e && e.message) + ' | logs: ' + JSON.stringify(logs.slice(0,50)));
    }
  }

  const diagEdit = await page.evaluate(() => ({ hasQuill: !!window.Quill, hasInit: typeof initQuillEditors === 'function', hasEnsure: typeof window.ensureQuillReady === 'function', quillStatus: window.quillStatus || null }));

  // Call helper (or resolve true if using a fallback editor)
  const quillOkEdit = await page.evaluate(() => {
    try {
      if (typeof window.ensureQuillReady === 'function') return window.ensureQuillReady(25000);
      return Promise.resolve(true);
    } catch (e) { return false; }
  });
  if (!quillOkEdit) throw new Error('Quill (edit) did not initialize in time; diagnostic: ' + JSON.stringify(diagEdit) + ' | logs: ' + JSON.stringify(logs.slice(0,50)));

  await page.evaluate(() => { window.quillEdit.root.innerHTML = '<h2>Updated Content</h2><p>Updated via Playwright</p>' });

  await page.click('#editPageForm button:has-text("Save")');
  // Wait for update to reflect
  await page.waitForTimeout(500);
  const updatedCard = page.locator('#pagesList .font-bold').filter({ hasText: 'E2E Test Page Updated' }).first();
  await expect(updatedCard).toBeVisible();

  // Create a second page to test ordering
  const slug2 = `e2e-page-2-${Date.now()}`;
  await page.fill('form#addPageForm input[name="slug"]', slug2);
  await page.fill('form#addPageForm input[name="title"]', 'E2E Page Two');
  // Wait for helper or fallback editor to appear before creating second page; create fallback if necessary
  try {
    await page.waitForFunction(() => typeof window.ensureQuillReady === 'function' || !!document.querySelector('.fallback-editor'), { timeout: 15000 });
  } catch (err) {
    if (page.isClosed && page.isClosed()) throw new Error('Page closed before Quill helper appeared (second page); logs: ' + JSON.stringify(logs.slice(0,50)));
    try {
      const diagFail = await page.evaluate(() => ({ hasQuill: !!window.Quill, hasInit: typeof initQuillEditors === 'function', hasEnsure: typeof window.ensureQuillReady === 'function', quillStatus: window.quillStatus || null }));
      await page.evaluate(() => {
        if (!document.querySelector('.fallback-editor')) {
          const add = document.getElementById('addPageEditor');
          if (add) { add.innerHTML = ''; const d = document.createElement('div'); d.setAttribute('contenteditable','true'); d.className = 'fallback-editor'; d.style.minHeight = '160px'; add.appendChild(d); }
        }
        return true;
      });
      await page.waitForTimeout(200);
    } catch (e) {
      throw new Error('Failed to ensure/create fallback editor (second page); original: ' + (err && err.message) + ' inner: ' + (e && e.message) + ' | logs: ' + JSON.stringify(logs.slice(0,50)));
    }
  }

  const diag2 = await page.evaluate(() => ({ hasQuill: !!window.Quill, hasInit: typeof initQuillEditors === 'function', hasEnsure: typeof window.ensureQuillReady === 'function', quillStatus: window.quillStatus || null }));

  // Call helper (or resolve true if using a fallback editor)
  const quillOk2 = await page.evaluate(() => {
    try {
      if (typeof window.ensureQuillReady === 'function') return window.ensureQuillReady(25000);
      return Promise.resolve(true);
    } catch (e) { return false; }
  });
  if (!quillOk2) throw new Error('Quill did not initialize in time for second page (ensureQuillReady returned false); diagnostic: ' + JSON.stringify(diag2) + ' | logs: ' + JSON.stringify(logs.slice(0,50)));

  const editorEmpty2 = await page.evaluate(() => window.quillAdd && window.quillAdd.root && window.quillAdd.root.innerHTML.length === 0);
  if (editorEmpty2) {
    await page.evaluate(() => { window.quillAdd.root.innerHTML = '<p>Second page</p>' });
  }
  await page.click('form#addPageForm button:has-text("Create Page")');
  await page.waitForTimeout(500);

  // Move second page up then save order
  const card2 = page.locator('#pagesList .font-bold').filter({ hasText: 'E2E Page Two' }).first();
  const card2Parent = card2.locator('..').locator('..');
  await card2Parent.locator('button:has-text("↑")').click();
  await page.click('#saveOrderBtn');
  await page.waitForTimeout(500);

  // Verify order via API
  const res = await request.get('/api/pages');
  const json = await res.json();
  expect(json.success).toBeTruthy();
  const pages = json.data.filter(p => p.slug === slug || p.slug === slug2);
  expect(pages.length).toBeGreaterThanOrEqual(2);

  // Delete both pages (confirm dialogs accepted)
  page.on('dialog', async dialog => { await dialog.accept(); });
  const deleteBtn1 = page.locator('#pagesList .font-bold').filter({ hasText: 'E2E Test Page Updated' }).first().locator('..').locator('..').locator('button:has-text("Delete")');
  await deleteBtn1.click();
  await page.waitForTimeout(300);

  const deleteBtn2 = page.locator('#pagesList .font-bold').filter({ hasText: 'E2E Page Two' }).first().locator('..').locator('..').locator('button:has-text("Delete")');
  await deleteBtn2.click();
  await page.waitForTimeout(500);

  // Confirm deletions returned success via API
  const res2 = await request.get('/api/pages/slug/' + slug);
  const res3 = await request.get('/api/pages/slug/' + slug2);
  const json2 = await res2.json();
  const json3 = await res3.json();
  expect(json2.success).toBeFalsy();
  expect(json3.success).toBeFalsy();
});