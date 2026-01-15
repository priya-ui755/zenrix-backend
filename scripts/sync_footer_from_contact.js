(async () => {
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const API = process.env.API_URL || 'http://localhost:3000/api';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const pageRes = await fetch(`${API}/pages/slug/contact`);
  const pageJson = await pageRes.json();
  if (!pageJson.success) return console.error('Failed to get contact page', pageJson);
  const content = pageJson.data && pageJson.data.content ? pageJson.data.content : '';

  const emailMatch = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = content.match(/(\+?\d[\d\-\s()]{6,}\d)/);
  const supportEmail = emailMatch ? emailMatch[0].trim() : '';
  const supportPhone = phoneMatch ? phoneMatch[0].trim() : '';

  if (!supportEmail && !supportPhone) return console.error('No contact details found in contact page content');

  // login as admin to update component
  const authRes = await fetch(`${API}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) });
  const auth = await authRes.json();
  if (!auth.success) return console.error('Admin login failed', auth);
  const token = auth.token;

  const getRes = await fetch(`${API}/components/slug/footer`);
  const getJson = await getRes.json();
  if (!getJson.success) return console.error('Failed to get footer', getJson);
  const footer = getJson.data;

  footer.data = footer.data || {};
  if (supportEmail) footer.data.supportEmail = supportEmail;
  if (supportPhone) footer.data.supportPhone = supportPhone;

  const putRes = await fetch(`${API}/components/${footer._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ data: footer.data }) });
  const putJson = await putRes.json();
  console.log('Sync result:', putJson);
})();