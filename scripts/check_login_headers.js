// posts to /api/admin/login and prints headers/body
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'admin' }),
      redirect: 'manual'
    });
    console.log('status', res.status);
    console.log('headers:');
    for (const [k,v] of res.headers.entries()) console.log(k + ':', v);
    const text = await res.text();
    console.log('body:', text);
  } catch (e) {
    console.error('error', e);
    process.exit(2);
  }
})();
