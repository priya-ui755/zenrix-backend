const fetch = require('node-fetch');

(async () => {
  const API = process.env.API_URL || 'http://localhost:3000/api';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

  console.log('Logging in as admin...');
  const login = await fetch(`${API}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
  const j = await login.json();
  if (!j.success) return console.error('Admin login failed', j);
  const token = j.token;
  console.log('Authenticated as admin.');

  const testEmail = `e2e+${Date.now()}@example.test`;
  const payload = { supportEmail: testEmail, supportPhone: '+977-1234567890', footerBottomText: `E2E ${Date.now()}` };
  console.log('Updating site-settings with', payload);

  const upd = await fetch(`${API}/site-settings`, { method: 'PUT', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
  const updRes = await upd.json();
  if (!updRes.success) return console.error('Failed to update site-settings', updRes);
  console.log('Update successful. Verifying public GET...');

  const pub = await fetch(`${API}/site-settings`);
  const pubRes = await pub.json();
  if (!pubRes.success) return console.error('Failed to fetch site-settings', pubRes);

  if (pubRes.data && pubRes.data.supportEmail === testEmail) {
    console.log('E2E site settings update verified: supportEmail matches. ✅');
    process.exit(0);
  }

  console.error('Mismatch after update', pubRes.data);
  process.exit(2);
})();
