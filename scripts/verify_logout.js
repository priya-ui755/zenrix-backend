const fs = require('fs');
const html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');

console.log('=== FINAL VERIFICATION ===');
console.log('admin-authed refs:', (html.match(/admin-authed/g)||[]).length);
console.log('classList.remove refs:', (html.match(/classList\.remove\('admin-authed'\)/g)||[]).length);
console.log('setAuthGuard clean:', !html.includes("} catch(e) {}, !!isAuthed"));

// Check specific functions have the removal
const checkFunc = (funcName) => {
  const idx = html.indexOf('function ' + funcName);
  if (idx === -1) return 'NOT FOUND';
  const snippet = html.substring(idx, idx + 600);
  return snippet.includes("classList.remove('admin-authed')") ? 'YES - has removal' : 'NO - missing removal';
};

console.log('performLogout removes:', checkFunc('performLogout'));
console.log('clearAdminToken removes:', checkFunc('clearAdminToken'));
console.log('adminLogout removes:', checkFunc('adminLogout'));

// Check performLogout (it's a window property, not a function declaration)
const perfIdx = html.indexOf('window.performLogout');
if (perfIdx > -1) {
  const snippet = html.substring(perfIdx, perfIdx + 800);
  console.log('window.performLogout removes:', snippet.includes("classList.remove('admin-authed')") ? 'YES' : 'NO');
}

console.log('CSS has wrapper hiding:', html.includes('.wrapper.admin-app'));
console.log('CSS has chatbot hiding:', html.includes('#chatbot-container'));
console.log('CSS has modal hiding:', html.includes('#editProductModal'));
console.log('File size:', (fs.statSync('Frontend/admin-dashboard.html').size/1024).toFixed(0)+'KB');