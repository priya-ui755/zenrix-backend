(async () => {
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const API = process.env.API_URL || 'http://localhost:3000/api';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const authRes = await fetch(`${API}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) });
  const auth = await authRes.json();
  if (!auth.success) return console.error('Admin login failed', auth);
  const token = auth.token;

  const getRes = await fetch(`${API}/components/slug/footer`);
  const getJson = await getRes.json();
  if (!getJson.success) return console.error('Failed to get footer', getJson);
  const footer = getJson.data;

  footer.data = footer.data || {};
  footer.data.supportPhone = '+44 20 7946 0018';

  const putRes = await fetch(`${API}/components/${footer._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ data: footer.data }) });
  const putJson = await putRes.json();
  console.log('PUT result:', putJson);

  const verifyRes = await fetch(`${API}/components/slug/footer`);
  const verifyJson = await verifyRes.json();
  console.log('Verify:', verifyJson.data && verifyJson.data.data ? verifyJson.data.data : verifyJson);
})();