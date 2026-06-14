const fs = require('fs');

const html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');

console.log('=== FINAL VERIFICATION ===');
console.log('admin-authed refs:', (html.match(/admin-authed/g) || []).length);
console.log('setAuthGuard patched:', html.includes('classList.toggle'));
console.log('Early token check:', html.includes('hasAdminToken())) { document.documentElement'));
console.log('CSS has wrapper hiding:', html.includes('.wrapper.admin-app'));
console.log('CSS has chatbot hiding:', html.includes('#chatbot-container'));
console.log('CSS has modal hiding:', html.includes('#editProductModal'));
console.log('hoistAuthLayers exists:', html.includes('hoistAuthLayers'));
console.log('loginModal hidden on start:', html.includes("style.setProperty('display', 'none', 'important')"));
console.log('Total lines:', html.split('\n').length);
console.log('File size:', (fs.statSync('Frontend/admin-dashboard.html').size / 1024).toFixed(0) + 'KB');