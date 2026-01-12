const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async ()=>{
  try{
    const base = process.env.BASE_URL || 'http://localhost:3000';
    const adminPw = process.env.ADMIN_PASSWORD || 'admin123';

    // Login admin
    const loginRes = await (await fetch(`${base}/api/admin/login`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: adminPw }) })).json();
    if (!loginRes || !loginRes.success || !loginRes.token) throw new Error('Admin login failed');
    const token = loginRes.token;

    // Ensure feature is enabled
    await (await fetch(`${base}/api/knowledge/feature`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ enabled: true }) }));
    const on = await (await fetch(`${base}/api/knowledge/feature`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    if (!on || !on.enabled) throw new Error('Failed to enable feature');
    console.log('Knowledge feature enabled');

    // Query should succeed
    const q1 = await (await fetch(`${base}/api/knowledge/query`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ q: 'setup local', topK: 1 }) })).json();
    if (!q1 || !q1.success) throw new Error('KB query failed when enabled');
    console.log('KB query returned', q1.snippets && q1.snippets.length);

    // Disable feature
    await (await fetch(`${base}/api/knowledge/feature`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ enabled: false }) }));
    const off = await (await fetch(`${base}/api/knowledge/feature`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    if (off && off.enabled) throw new Error('Failed to disable feature');
    console.log('Knowledge feature disabled');

    // Query should return 503 or disabled error
    const q2Res = await fetch(`${base}/api/knowledge/query`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ q: 'setup local', topK: 1 }) });
    const q2 = await q2Res.json();
    if (q2 && q2.success) throw new Error('KB query succeeded while disabled');
    console.log('KB query correctly disabled (status ' + q2Res.status + ')');

    // Re-enable
    await (await fetch(`${base}/api/knowledge/feature`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ enabled: true }) }));
    console.log('Knowledge feature restored');

    process.exit(0);
  }catch(e){ console.error('E2E feature toggle check failed:', e.message); process.exit(2); }
})();