const fs = require('fs');

let html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');

// The early token check script - using regex to handle both \r\n and \n
html = html.replace(
  /if \(hasAdminToken\(\)\) \{\r?\n\s+overlay\.classList\.add\('hidden'\);/,
  "if (hasAdminToken()) { document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed');\n                overlay.classList.add('hidden');"
);

// Login success - set admin-authed when token arrives
html = html.replace(
  /try \{ setAdminToken\(data\.token\); \} catch\(e\) \{\}/,
  "try { setAdminToken(data.token); document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed'); } catch(e) {}"
);

// Close login modal on success - add admin-authed
html = html.replace(
  /try \{ closeLoginModal\(\); \} catch\(e\) \{\}\r?\n\s+try \{ window\.__adminServerValidated/,
  "try { closeLoginModal(); document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed'); } catch(e) {}\n                    try { window.__adminServerValidated"
);

// Also add admin-authed on initial token sync (the IIFE at the top that caches token)
html = html.replace(
  /try \{ setToken\(localToken\); \} catch\(e\)\{\}\s*\r?\n\s+\}/,
  "try { setToken(localToken); document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed'); } catch(e){}\n                        }"
);

// Boot ping success
html = html.replace(
  /try \{ setAuthGuard\(true\); \} catch\(e\)\{\}\r?\n\s+try \{ updateAdminUI\(\); \} catch\(e\)\{\}/,
  "try { setAuthGuard(true); document.documentElement.classList.add('admin-authed'); document.body.classList.add('admin-authed'); } catch(e){}\n                        try { updateAdminUI(); } catch(e){}"
);

fs.writeFileSync('Frontend/admin-dashboard.html', html);
console.log('All FOUC fixes applied with CRLF handling!');

// Final verification
html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');
const checks = [
  ['Early token early check', /hasAdminToken\(\)\) \{ document\.documentElement\.classList\.add\('admin-authed'\)/],
  ['setAdminToken patched', /setAdminToken\(data\.token\); document\.documentElement\.classList\.add\('admin-authed'\)/],
  ['closeLoginModal patched', /closeLoginModal\(\); document\.documentElement\.classList\.add\('admin-authed'\)/],
  ['Aggressive CSS wrapper', /\.wrapper\.admin-app/],
  ['Chatbot hidden', /#chatbot-container/],
  ['Modals hidden', /#editProductModal/],
  ['setAuthGuard patched', /classList\.toggle\('admin-authed'\)/],
];

checks.forEach(([name, pattern]) => {
  console.log(`  ${name}: ${pattern.test(html) ? 'YES' : 'NO'}`);
});

console.log('\nTotal admin-authed references:', (html.match(/admin-authed/g) || []).length);