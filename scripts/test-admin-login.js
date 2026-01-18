// Automated admin login test for Zenrix
const fetch = require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin123' })
    });
    const data = await res.json();
    console.log('Login response:', data);
    if (data.success && data.token) {
      console.log('✅ Login successful! Token:', data.token);
    } else {
      console.error('❌ Login failed:', data.error || data);
    }
  } catch (err) {
    console.error('❌ Error during login:', err);
  }
})();
