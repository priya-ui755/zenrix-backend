const fs = require('fs');

let html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');

// Fix early token check - this is the KEY fix for flash on page load
// The critical CSS hides everything, but we need admin-authed to be added
// BEFORE the DOM renders when a token exists
html = html.replace(
  "if (hasAdminToken()) {\n                overlay.classList.add",
  "if (hasAdminToken()) { document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed');\n                overlay.classList.add"
);

// Fix login success - add admin-authed when user logs in
html = html.replace(
  "try { setAdminToken(data.token); } catch(e) {}",
  "try { setAdminToken(data.token); document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed'); } catch(e) {}"
);

// Fix the empty loginModal display issue - ensure it's hidden on login success
// This handles the case where login modal stays visible after auth
html = html.replace(
  "try { closeLoginModal(); } catch(e) {}\n                    try { window.__adminServerValidated",
  "try { closeLoginModal(); document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed'); } catch(e) {}\n                    try { window.__adminServerValidated"
);

fs.writeFileSync('Frontend/admin-dashboard.html', html);
console.log('All FOUC fixes applied successfully!');

// Verify
html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');
console.log('admin-authed references:', (html.match(/admin-authed/g) || []).length);
console.log('Early token check:', html.includes("hasAdminToken()) { document.documentElement.classList.add('admin-authed'"));
console.log('setAdminToken patched:', html.includes("setAdminToken(data.token); document.documentElement.classList.add('admin-authed'"));