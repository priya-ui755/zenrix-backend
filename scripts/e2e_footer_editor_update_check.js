const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

(async () => {
    const API = process.env.API_URL || 'http://localhost:3000/api';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    try {
        // Open the public site page
        const site = await browser.newPage();
        await site.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });

        // Read initial bottom text
        const initialBottom = await site.evaluate(() => {
            const footerEl = document.querySelector('custom-footer');
            if (!footerEl || !footerEl.shadowRoot) return null;
            const bottom = footerEl.shadowRoot.querySelector('.bottom');
            return bottom ? bottom.textContent.trim() : null;
        });
        console.log('Initial bottom text:', initialBottom);

        // Prepare admin page, login via page context and set token using the site's helper
        const adminPage = await browser.newPage();
        await adminPage.goto('http://localhost:3000/admin-dashboard.html', { waitUntil: 'networkidle2' });

        const authJson = await adminPage.evaluate(async (pwd) => {
            const res = await fetch('/api/admin/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd })
            });
            return await res.json();
        }, adminPassword);

        if (!authJson || !authJson.success || !authJson.token) {
            console.error('Admin login failed (page login):', authJson);
            await browser.close();
            process.exit(1);
        }

        // Set token using site's helper so UI updates properly, then reload to ensure UI reflects auth
        await adminPage.evaluate((t) => { try { localStorage.setItem('adminToken', t); if (typeof setAdminToken === 'function') setAdminToken(t); } catch (e) {} }, authJson.token);
        await adminPage.reload({ waitUntil: 'networkidle2' });

        // Open Footer Editor tab
        await adminPage.waitForSelector('[data-jump-tab="footer-editor"]', { visible: true });
        await adminPage.click('[data-jump-tab="footer-editor"]');
        // Wait for editor form
        await adminPage.waitForSelector('#footerEditorForm', { visible: true, timeout: 20000 });

        const newBottom = 'E2E footer update ' + Date.now();
        const newMap = 'https://www.google.com/maps?q=2+Test+St+Testville&output=embed';

        await adminPage.focus('#content-footer-editor [name="bottomText"]');
        await adminPage.evaluate((val)=>{ document.querySelector('#content-footer-editor [name="bottomText"]').value = val; }, newBottom);
        await adminPage.evaluate((val)=>{ document.querySelector('#content-footer-editor [name="mapEmbed"]').value = val; }, newMap);

        // Verify inputs were updated
        const inputs = await adminPage.evaluate(() => ({ bottom: document.querySelector('#content-footer-editor [name="bottomText"]').value, map: document.querySelector('#content-footer-editor [name="mapEmbed"]').value }));
        console.log('Admin form values before submit:', inputs);

        // Check admin token present
        const adminToken = await adminPage.evaluate(() => localStorage.getItem('adminToken'));
        console.log('Admin token present (len):', adminToken ? adminToken.length : 0);

        // Attach response listener to capture any component requests
        const putResponses = [];
        adminPage.on('response', async r => {
            try {
                const url = r.url();
                if (url.includes('/api/components/')) putResponses.push({ url, status: r.status(), ok: r.ok() });
                // Capture bodies for admin-related APIs (to catch malformed JSON)
                if (url.includes('/api/admin/orders') || url.includes('/api/admin/')) {
                    try {
                        const txt = await r.text();
                        console.log('ADMIN API RESPONSE:', url, 'status', r.status(), 'snippet:', txt.slice(0,240));
                        try { JSON.parse(txt); } catch (pe) { console.log('ADMIN API JSON parse issue at', url, 'error', pe.message); }
                    } catch (e) {}
                } else if (url.includes('/api/') && r.headers && /application\/json/.test(r.headers()['content-type'] || r.headers()['Content-Type'] || '')) {
                    try {
                        const txt = await r.text();
                        // Try parsing to detect invalid JSON and show snippet
                        try { JSON.parse(txt); } catch (pe) { console.log('API JSON parse issue at', url, 'status', r.status(), 'snippet:', txt.slice(0,240)); }
                    } catch (e) {}
                }
            } catch (e) {}
        });
        // Capture admin page console and errors for debugging
        adminPage.on('console', msg => { try { const loc = msg.location ? msg.location() : {}; console.log('ADMIN LOG:', msg.type(), msg.text(), loc); } catch (e) {} });
        adminPage.on('pageerror', err => { try { console.log('ADMIN PAGE ERROR:', err.message || String(err), err.stack || 'no-stack'); } catch (e) {} });

        // Submit the form
        await adminPage.click('#content-footer-editor form button[type="submit"]');

        // Determine footer component id so we can wait for the server PUT response (perform fetch in page context)
        const footerJson = await adminPage.evaluate(async (api) => {
            const res = await fetch(api + '/components/slug/footer');
            return await res.json();
        }, API);
        const footerId = footerJson && footerJson.data && footerJson.data._id;
        if (!footerId) throw new Error('Could not determine footer component id');

        console.log('Waiting for PUT /components/' + footerId + ' to complete...');
        // Wait for the admin page to issue the PUT to update the component (longer timeout for slow CI)
        let putJson = null;
        try {
            const putResp = await adminPage.waitForResponse(resp => resp.url().endsWith(`/components/${footerId}`) && resp.request().method() === 'PUT', { timeout: 30000 });
            putJson = await putResp.json();
        } catch (e) {
            console.log('waitForResponse timed out; seen component responses:', putResponses);
            // Fallback: fetch component from server to see if updates were applied
            const verify = await site.evaluate(async (api) => { const r = await fetch(api + '/components/slug/footer'); return await r.json(); }, API);
            if (verify && verify.data && verify.data.data && String(verify.data.data.bottomText || '').includes('E2E footer update')) {
                console.log('Server component already shows updated bottomText (fallback check).');
            } else {
                throw new Error('Timeout waiting for PUT and server component not updated. Responses: ' + JSON.stringify(putResponses));
            }
        }

        if (putJson) {
            if (!putJson.success) throw new Error('Footer PUT failed: ' + JSON.stringify(putJson));
            console.log('Footer updated on server:', putJson.data && putJson.data._id);
        }

        // Wait for site to pick up the change (via storage event or other sync)
        console.log('Polling site localStorage for footerData update...');
        await site.waitForFunction((expected) => {
            try {
                const ls = localStorage.getItem('footerData');
                if (!ls) return false;
                return ls.includes(expected);
            } catch (e) { return false; }
        }, { timeout: 20000 }, newBottom);
        console.log('Site localStorage shows updated footerData.');
        await site.waitForFunction((expected) => {
            const footerEl = document.querySelector('custom-footer');
            if (!footerEl || !footerEl.shadowRoot) return false;
            const bottom = footerEl.shadowRoot.querySelector('.bottom');
            if (!bottom) return false;
            return bottom.textContent.includes(expected);
        }, { timeout: 20000 }, newBottom);

        const updatedBottom = await site.evaluate(() => {
            const footerEl = document.querySelector('custom-footer');
            const bottom = footerEl && footerEl.shadowRoot && footerEl.shadowRoot.querySelector('.bottom');
            return bottom ? bottom.textContent.trim() : null;
        });

        const updatedMap = await site.evaluate(() => {
            const footerEl = document.querySelector('custom-footer');
            const iframe = footerEl && footerEl.shadowRoot && footerEl.shadowRoot.getElementById('footer-map-iframe');
            return iframe ? iframe.src : null;
        });

        console.log('Updated bottom text:', updatedBottom);
        console.log('Updated map src:', updatedMap);

        // Simple assertions
        if (!updatedBottom || !updatedBottom.includes('E2E footer update')) throw new Error('Footer bottom text did not update');
        if (!updatedMap || !updatedMap.includes('Test+St+Testville')) throw new Error('Footer map did not update');

        console.log('E2E Footer Editor update verified: footer updated without reload.');
    } catch (err) {
        console.error('E2E test failed:', err);
        process.exit(2);
    } finally {
        try { await browser.close(); } catch (e) {}
    }
})();