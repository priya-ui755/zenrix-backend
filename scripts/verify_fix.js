const fs = require('fs');

const html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');

console.log('=== Verification ===');
console.log('admin-authed references:', (html.match(/admin-authed/g) || []).length);
console.log('Has aggressive CSS:', html.includes('.wrapper.admin-app'));
console.log('Chatbot in hidden list:', html.includes('#chatbot-container'));
console.log('Modals in hidden list:', html.includes('#editProductModal'));
console.log('setAuthGuard patched:', html.includes("classList.toggle('admin-authed'"));
console.log('early token check patched:', html.includes('hasAdminToken()) { document.documentElement'));
console.log('login success patched:', html.includes('closeLoginModal(); document.documentElement.classList.add'));

// Check the JS file too
const js = fs.readFileSync('Frontend/js/admin-dashboard.js', 'utf8');
console.log('');
console.log('JS file:');
console.log('Has standalone toggle:', js.includes('ensureSidebarToggleStandalone'));
console.log('Has bootCharts:', js.includes('function bootCharts'));
console.log('Lines:', js.split('\n').length);