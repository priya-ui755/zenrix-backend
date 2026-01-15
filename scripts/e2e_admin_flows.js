/*
Simple E2E test script (node) for admin flows:
- Admin login
- Create testimonial via public POST
- Approve testimonial via admin PUT
- Check audit entries
- Create product via admin POST
- Update product via admin PUT
- Delete product
- Create a subscriber (public) and export via admin
- Toggle hero via admin PUT

This is intentionally simple and uses fetch; run with: node scripts/e2e_admin_flows.js
*/

let fetch = global.fetch;
try {
  if (!fetch) {
    const mod = require('node-fetch');
    fetch = mod.default || mod;
  }
} catch (err) {
  try {
    const undici = require('undici');
    fetch = undici.fetch;
  } catch (err2) {
    // will handle below
  }
}
if (!fetch) {
  console.error('No fetch implementation available. Install node-fetch (v2) or run on Node 18+');
  process.exit(2);
}
const assert = require('assert');

const API = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';

async function adminLogin(){
  const res = await fetch(`${API}/admin/login`, { method: 'POST', body: JSON.stringify({ password: ADMIN_PW }), headers: { 'Content-Type':'application/json' } });
  const j = await res.json(); if (!j.success) throw new Error('Admin login failed');
  return j.token;
}

async function main(){
  console.log('E2E: starting');
  const token = await adminLogin();
  console.log('E2E: admin token acquired');

  // Submit testimonial (public)
  const tv = { name: 'E2E Tester', review: 'E2E flow review', rating: 5 };
  let res = await fetch(`${API}/testimonials`, { method: 'POST', body: JSON.stringify(tv), headers: {'Content-Type':'application/json'} });
  let j = await res.json(); assert.ok(j.success, 'Submit testimonial failed');
  console.log('E2E: testimonial submitted');

  // Admin list testimonials
  res = await fetch(`${API}/testimonials/admin/all`, { headers: { Authorization: 'Bearer ' + token }});
  j = await res.json(); assert.ok(j.success && Array.isArray(j.data), 'List testimonials failed');
  const t = j.data.find(x => x.name === tv.name && x.review === tv.review);
  assert.ok(t, 'Submitted testimonial not found');
  console.log('E2E: testimonial visible to admin', t._id);

  // Approve
  res = await fetch(`${API}/testimonials/admin/${t._id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ status: 'approved', isActive: true }) });
  j = await res.json(); assert.ok(j.success && j.data.status === 'approved', 'Approve failed');
  console.log('E2E: testimonial approved');

  // Check audits
  res = await fetch(`${API}/testimonials/admin/${t._id}/audits`, { headers: { Authorization: 'Bearer ' + token } });
  j = await res.json(); assert.ok(j.success && j.data.length >= 1, 'Audit check failed');
  console.log('E2E: audits present, count=', j.data.length);

  // Create product
  const product = { name: 'E2E Product', price: 199, description: 'Test product', category:'other', stock: 3, image: '/uploads/products/placeholder.png' };
  res = await fetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(product) });
  j = await res.json(); assert.ok(j.success && j.data && j.data._id, 'Create product failed');
  const prodId = j.data._id; console.log('E2E: product created', prodId);

  // Update product
  res = await fetch(`${API}/products/${prodId}`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ price: 299 }) });
  j = await res.json(); assert.ok(j.success && j.data.price === 299, 'Update product failed');
  console.log('E2E: product updated');

  // Delete product
  res = await fetch(`${API}/products/${prodId}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  j = await res.json(); assert.ok(j.success, 'Delete product failed');
  console.log('E2E: product deleted');

  // Payment settings update
  res = await fetch(`${API}/payment-settings`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ instructions: 'E2E update' }) });
  j = await res.json(); assert.ok(j.success, 'Payment settings update failed');
  console.log('E2E: payment settings updated');

  // Toggle hero
  res = await fetch(`${API}/hero`, { headers: { Authorization: 'Bearer ' + token }, method: 'GET' }); j = await res.json(); const original = j.data.enabled;
  res = await fetch(`${API}/hero`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ enabled: !original }) }); j = await res.json(); assert.ok(j.success && typeof j.data.enabled === 'boolean', 'Hero toggle failed');
  // revert
  res = await fetch(`${API}/hero`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ enabled: original }) }); j = await res.json(); assert.ok(j.success, 'Hero revert failed');
  console.log('E2E: hero toggled and reverted');

  console.log('E2E: All checks passed');
}

main().catch(err=>{ console.error('E2E failed:', err); process.exit(2); });