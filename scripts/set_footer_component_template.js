/*
 * Updates the CMS Component with slug "footer" to a full editable template.
 *
 * Usage:
 *   node scripts/set_footer_component_template.js
 *
 * Optional env:
 *   API_URL=http://localhost:3000/api
 *   ADMIN_PASSWORD=admin123
 */

const API = process.env.API_URL || 'http://localhost:3000/api';

const TEMPLATE_HTML = String.raw`<!-- FOOTER TEMPLATE (editable sections) -->

<div class="footer-about">
  <a class="brand" href="/"><span class="orb"></span>Fashion Hub</a>
  <p class="lede">Your one-stop shop for quality products at affordable prices.</p>

  <div class="cta-row" data-footer-cta>
    <a class="btn primary" href="/products.html">Fashion Hub</a>
    <a class="btn ghost" href="/contact.html">Talk to us</a>
  </div>
</div>

<div class="footer-stayclose">
  <div class="column-title">Stay close</div>
  <p class="lede" style="max-width: 320px; margin: 0;">New drops, back-in-stock notes, and launches without the noise.</p>
  <div class="social">
    <a href="#" aria-label="Facebook">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 8h-2c-.6 0-1 .4-1 1v2h3l-.4 3H12v7H9v-7H7V11h2V9.2C9 7 10.2 5 13 5h2v3Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <a href="#" aria-label="Twitter">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 5.5a6.9 6.9 0 0 1-2 .55 3.47 3.47 0 0 0 1.52-1.92 6.9 6.9 0 0 1-2.2.84A3.44 3.44 0 0 0 12 7.9a9.77 9.77 0 0 1-7.1-3.6 3.44 3.44 0 0 0 1.07 4.6 3.4 3.4 0 0 1-1.56-.43v.04a3.45 3.45 0 0 0 2.76 3.37 3.43 3.43 0 0 1-1.55.06 3.45 3.45 0 0 0 3.22 2.4A6.9 6.9 0 0 1 3 16.54 9.74 9.74 0 0 0 8.29 18c6.29 0 9.73-5.21 9.73-9.73 0-.15 0-.29-.01-.44A6.95 6.95 0 0 0 21 5.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <a href="#" aria-label="Instagram">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="7" r="0.6" fill="currentColor"/></svg>
    </a>
    <a href="#" aria-label="YouTube">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 7.2c-.2-.9-.9-1.6-1.8-1.8C17.2 5 12 5 12 5s-5.2 0-6.7.4c-.9.2-1.6.9-1.8 1.8C3 8.8 3 12 3 12s0 3.2.5 4.8c.2.9.9 1.6 1.8 1.8C6.8 19 12 19 12 19s5.2 0 6.7-.4c.9-.2 1.6-.9 1.8-1.8.5-1.6.5-4.8.5-4.8s0-3.2-.5-4.8Z" stroke="currentColor" stroke-width="1.4"/><path d="m10 9.75 4.5 2.25L10 14.25V9.75Z" fill="currentColor"/></svg>
    </a>
  </div>
</div>

<div class="footer-shop">
  <div class="column-title">Shop</div>
  <ul class="links-list">
    <li><a href="/products.html">All Products</a></li>
    <li><a href="/products.html?category=electronics">Electronics</a></li>
    <li><a href="/products.html?category=fashion">Fashion</a></li>
    <li><a href="/products.html?category=home">Home &amp; Kitchen</a></li>
    <li><a href="/products.html?category=beauty">Beauty</a></li>
  </ul>
</div>

<div class="footer-company">
  <div class="column-title">Company</div>
  <ul class="links-list">
    <li><a href="/about.html">About</a></li>
    <li><a href="/careers.html">Careers</a></li>
    <li><a href="/blog.html">Blog</a></li>
    <li><a href="/privacy.html">Privacy</a></li>
    <li><a href="/terms.html">Terms</a></li>
  </ul>
</div>

<div class="footer-support">
  <div class="column-title">Support</div>
  <div class="contact-lines">
    <div><span>Email</span> support@fashionhub.com</div>
    <div><span>Phone</span> <span data-footer-phone>+977 9819922314</span></div>
    <div><span>Chat</span> Live chat 9am-9pm</div>
  </div>
  <a href="/support.html" class="support-btn" style="text-decoration: none;">Open support</a>
</div>

<div class="footer-bottom">
  <span>&copy; <span data-footer-year></span> Fashion Hub. Built for modern shoppers.</span>
  <div class="badge-row">
    <span class="mini-badge">Secure checkout</span>
    <span class="mini-badge">48h support</span>
    <span class="mini-badge">Tracked shipping</span>
  </div>
</div>
`;

async function loginWithPassword(password) {
  const res = await fetch(`${API}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json || !json.success || !json.token) {
    return null;
  }
  return json.token;
}

async function main() {
  const passwords = [process.env.ADMIN_PASSWORD, 'admin123', 'admin'].filter(Boolean);
  let token = null;
  for (const pwd of passwords) {
    token = await loginWithPassword(pwd);
    if (token) break;
  }
  if (!token) {
    throw new Error('Admin login failed. Set ADMIN_PASSWORD env var to the correct password.');
  }

  const footerRes = await fetch(`${API}/components/slug/footer`);
  const footerJson = await footerRes.json();
  if (!footerRes.ok || !footerJson || !footerJson.success || !footerJson.data || !footerJson.data._id) {
    throw new Error('Could not fetch existing footer component (slug: footer).');
  }

  const id = footerJson.data._id;

  const updateRes = await fetch(`${API}/components/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: footerJson.data.name || 'Main Footer',
      html: TEMPLATE_HTML,
      published: true
    })
  });

  const updateJson = await updateRes.json().catch(() => ({}));
  if (!updateRes.ok || !updateJson || !updateJson.success) {
    throw new Error(`Footer update failed: ${updateRes.status} ${JSON.stringify(updateJson)}`);
  }

  const verifyRes = await fetch(`${API}/components/slug/footer`);
  const verifyJson = await verifyRes.json();
  const hasCta = Boolean(verifyJson?.data?.html?.includes('class="cta-row"'));

  console.log('Updated footer component:', { id, published: verifyJson?.data?.published, hasCta });
}

main().catch((err) => {
  console.error(String(err && err.stack ? err.stack : err));
  process.exitCode = 1;
});
