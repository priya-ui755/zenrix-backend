#!/usr/bin/env node
// Update footer component HTML and structured data to replace old phone
// Usage:
//   ADMIN_PASSWORD=admin123 SUPPORT_PHONE="+977 9819922314" API_URL=http://localhost:3000 node scripts/update_footer_phone_html.js

const API = process.env.API_URL || 'http://localhost:3000/api';
const PASSWORD = process.env.ADMIN_PASSWORD;
const NEW_PHONE = process.env.SUPPORT_PHONE || process.env.NEW_PHONE;
const OLD_PHONE_DISPLAY = '+1 (800) 123-4567';
const OLD_PHONE_TEL = '+18001234567';

if (!PASSWORD) {
  console.error('ERROR: set ADMIN_PASSWORD env var');
  process.exit(1);
}
if (!NEW_PHONE) {
  console.error('ERROR: set SUPPORT_PHONE (or NEW_PHONE) env var');
  process.exit(1);
}

(async () => {
  try {
    const fetchFn = global.fetch || (await import('node-fetch')).default;

    // login
    const loginRes = await fetchFn(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD })
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok || !loginJson || !loginJson.success || !loginJson.token) {
      console.error('Login failed:', loginJson);
      process.exit(2);
    }
    const token = loginJson.token;

    // fetch footer
    const fRes = await fetchFn(`${API}/components/slug/footer`);
    const fJson = await fRes.json();
    if (!fRes.ok || !fJson || !fJson.success || !fJson.data) {
      console.error('Failed to fetch footer component:', fJson);
      process.exit(3);
    }
    const comp = fJson.data;
    const id = comp._id;
    let html = String(comp.html || '');
    const data = Object.assign({}, comp.data || {});

    // compute tel-friendly number
    const newTel = String(NEW_PHONE).replace(/[^+\d]/g, '');

    // Replace display and tel patterns (simple global replaces)
    html = html.split(OLD_PHONE_DISPLAY).join(NEW_PHONE);
    html = html.split(OLD_PHONE_TEL).join(newTel);
    // Also replace any bare +1 (800) 123-4567 variants without parentheses or spaces
    html = html.split('+18001234567').join(newTel);

    // Update structured data
    data.supportPhone = NEW_PHONE;

    // Prepare update body preserving name/published
    const body = {
      name: comp.name || 'Main Footer',
      html,
      published: typeof comp.published === 'boolean' ? comp.published : true,
      data
    };

    const putRes = await fetchFn(`${API}/components/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const putJson = await putRes.json().catch(() => ({}));
    if (!putRes.ok || !putJson || !putJson.success) {
      console.error('Update failed:', putJson);
      process.exit(4);
    }

    console.log('Footer component updated. id=', id);
    console.log('New supportPhone:', NEW_PHONE);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.stack ? err.stack : err);
    process.exit(99);
  }
})();
