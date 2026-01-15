(async () => {
    const API = process.env.API_URL || 'http://localhost:3000/api';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const fetch = globalThis.fetch || (await import('node-fetch')).default;

    // Login as admin
    const authRes = await fetch(`${API}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) });
    const auth = await authRes.json();
    if (!auth.success) return console.error('Admin login failed', auth);
    const token = auth.token;

    // Get contact page
    const pRes = await fetch(`${API}/pages/slug/contact`);
    const pJson = await pRes.json();
    if (!pJson.success) return console.error('Failed to get contact page', pJson);
    const page = pJson.data;

    const newPhone = '+1 555 999 0000';
    const newContent = (page.content || '').replace(/Phone:\s*[^<\n]+/, `Phone: ${newPhone}`);

    const putRes = await fetch(`${API}/pages/${page._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ slug: page.slug, title: page.title, content: newContent, published: page.published, meta: page.meta || {} }) });
    const putJson = await putRes.json();
    console.log('Page update result:', putJson);

    // Wait a moment for async propagation to run
    await new Promise(r => setTimeout(r, 1200));

    // Check footer component
    const fRes = await fetch(`${API}/components/slug/footer`);
    const fJson = await fRes.json();
    console.log('Footer data after sync attempt:', fJson.data && fJson.data.data ? fJson.data.data : fJson);
})();