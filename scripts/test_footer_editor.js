(async () => {
    try {
        const API = process.env.API_URL || 'http://localhost:3000/api';
        console.log('Using API:', API);

        const getRes = await fetch(`${API}/components/slug/footer`);
        const json = await getRes.json();
        if (!json.success) {
            console.error('Failed to GET footer component:', json);
            process.exit(1);
        }
        const footer = json.data;
        console.log('Current footer component id:', footer._id);
        console.log('Current data:', footer.data || {});

        const payload = {
            data: {
                ...(footer.data || {}),
                bottomText: 'Automated test update at ' + new Date().toISOString(),
                mapEmbed: 'https://www.google.com/maps?q=1+Test+St+Testville&output=embed'
            }
        };

        // Acquire admin token (password from env ADMIN_PASSWORD or default 'admin')
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
        const authRes = await fetch(`${API}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
        });
        const authJson = await authRes.json();
        if (!authJson.success || !authJson.token) {
            console.error('Failed to login as admin:', authJson);
            process.exit(3);
        }
        const token = authJson.token;
        console.log('Obtained admin token (truncated):', token.slice(0, 12) + '...');

        const putRes = await fetch(`${API}/components/${footer._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const putJson = await putRes.json();
        console.log('PUT result:', putJson);

        const verifyRes = await fetch(`${API}/components/slug/footer`);
        const verifyJson = await verifyRes.json();
        console.log('Verify GET after update:', verifyJson.data && verifyJson.data.data ? verifyJson.data.data : verifyJson);
    } catch (err) {
        console.error('Error:', err);
        process.exit(2);
    }
})();