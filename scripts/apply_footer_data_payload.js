/*
 * Apply a footer `data` payload to the CMS component with slug `footer`.
 * Usage:
 *   node scripts/apply_footer_data_payload.js
 * Optional env:
 *   API_URL=http://localhost:3000/api
 *   ADMIN_PASSWORD=admin123
 */

const API = process.env.API_URL || 'http://localhost:3000/api';

async function loginWithPassword(password) {
  const res = await fetch(`${API}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json || !json.success || !json.token) return null;
  return json.token;
}

async function main() {
  const passwords = [process.env.ADMIN_PASSWORD, 'admin123', 'admin'].filter(Boolean);
  let token = null;
  for (const pwd of passwords) {
    token = await loginWithPassword(pwd);
    if (token) break;
  }
  if (!token) throw new Error('Admin login failed. Set ADMIN_PASSWORD env var to the correct password.');

  const footerRes = await fetch(`${API}/components/slug/footer`);
  const footerJson = await footerRes.json();
  if (!footerRes.ok || !footerJson || !footerJson.success || !footerJson.data || !footerJson.data._id) {
    throw new Error('Could not fetch existing footer component (slug: footer).');
  }
  const id = footerJson.data._id;

  const payloadData = {
    shopLinks: [
      { label: 'All products', url: '/products.html' },
      { label: 'Electronics', url: '/products.html?category=electronics' },
      { label: 'Fashion', url: '/products.html?category=fashion' },
      { label: 'Home & Kitchen', url: '/products.html?category=home' },
      { label: 'Beauty', url: '/products.html?category=beauty' }
    ],
    companyLinks: [
      { label: 'About', url: '/about.html' },
      { label: 'Careers', url: '/careers.html' },
      { label: 'Blog', url: '/blog.html' },
      { label: 'Privacy', url: '/privacy.html' },
      { label: 'Terms', url: '/terms.html' }
    ],
    supportEmail: 'support@zenrix.com',
    // Allow overriding the default phone via env var SUPPORT_PHONE
    supportPhone: process.env.SUPPORT_PHONE || '+977 9819922314',
    chatLink: '/index.html#chat',
    socialLinks: [
      { name: 'facebook', url: 'https://facebook.com/zenrix' },
      { name: 'twitter', url: 'https://twitter.com/zenrix' },
      { name: 'instagram', url: 'https://instagram.com/zenrix' },
      { name: 'youtube', url: 'https://youtube.com/zenrix' }
    ],
    bottomText: '© 2026 Zenrix. Built for modern shoppers.'
  };

  // Preserve existing html/name/published values
  const updateBody = {
    name: footerJson.data.name || 'Main Footer',
    html: footerJson.data.html || '',
    published: true,
    data: Object.assign({}, footerJson.data.data || {}, payloadData)
  };

  const updateRes = await fetch(`${API}/components/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updateBody)
  });

  const updateJson = await updateRes.json().catch(() => ({}));
  if (!updateRes.ok || !updateJson || !updateJson.success) {
    throw new Error(`Footer data update failed: ${updateRes.status} ${JSON.stringify(updateJson)}`);
  }

  console.log('Footer data updated for id:', id);
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
