const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'Frontend', 'admin-dashboard.html');
let html = fs.readFileSync(htmlPath, 'utf8');

let patches = 0;

// 1. In performLogout: remove admin-authed class after clearing token
html = html.replace(
  /try \{ clearAdminToken\(\); \} catch\(e\) \{\}/,
  "try { clearAdminToken(); document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } catch(e) {}"
);
patches++;

// 2. In clearAdminToken function: remove admin-authed class
html = html.replace(
  /function clearAdminToken\(\) \{[\s\S]*?setAuthGuard\(false\);[\s\S]*?\}/,
  (match) => {
    if (match.includes("classList.remove('admin-authed')")) return match; // already patched
    return match.replace(
      'setAuthGuard(false);',
      "setAuthGuard(false);\n            try { document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } catch(e) {}"
    );
  }
);
patches++;

// 3. In adminLogout function: remove admin-authed class  
html = html.replace(
  /try \{ clearAdminToken\(\); \} catch \(e\) \{ console\.error\('clearAdminToken failed', e\); \}/,
  "try { clearAdminToken(); document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } catch (e) { console.error('clearAdminToken failed', e); }"
);
patches++;

// 4. Also in the performLogout function, after all the cleanup, ensure admin-authed is removed
// Find the performLogout function and add class removal after the token cleanup
html = html.replace(
  /try \{ document\.cookie = 'adminTokenPublic=; path=\/; max-age=0'; \} catch\(e\) \{\}\s*\n\s*\n\s*try \{\s*const btn = document\.getElementById\('logoutBtn'\)/,
  "try { document.cookie = 'adminTokenPublic=; path=/; max-age=0'; } catch(e) {}\n\n            // Remove admin-authed to re-show login modal on next auth attempt\n            try { document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } catch(e) {}\n\n            try {\n                const btn = document.getElementById('logoutBtn')"
);
patches++;

// 5. In setAuthGuard: when isAuthed is false, also explicitly remove admin-authed
html = html.replace(
  /function setAuthGuard\(isAuthed\) \{ try \{ document\.documentElement\.classList\.toggle\('admin-authed'/,
  "function setAuthGuard(isAuthed) { try { document.documentElement.classList.toggle('admin-authed', !!isAuthed); document.body.classList.toggle('admin-authed', !!isAuthed); if (!isAuthed) { document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } } catch(e) {}"
);
patches++;

// 6. Also remove the duplicate setAuthGuard that was already patched (keep only the new one)
// The first replace in step 5 may have created a duplicate line, so clean it up
html = html.replace(
  /function setAuthGuard\(isAuthed\) \{ try \{ document\.documentElement\.classList\.toggle\('admin-authed', !!isAuthed\); document\.body\.classList\.toggle\('admin-authed', !!isAuthed\); \} catch\(e\) \{\}\s*try \{ document\.documentElement\.classList\.toggle\('admin-authed'/,
  "function setAuthGuard(isAuthed) { try { document.documentElement.classList.toggle('admin-authed', !!isAuthed); document.body.classList.toggle('admin-authed', !!isAuthed); if (!isAuthed) { document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } } catch(e) {}"
);
patches++;

fs.writeFileSync(htmlPath, html);

// Verify
html = fs.readFileSync(htmlPath, 'utf8');
console.log('Patches applied:', patches);
console.log('');
console.log('=== Verification ===');
console.log('setAuthGuard shows class removal on false:', html.includes("if (!isAuthed) { document.documentElement.classList.remove('admin-authed')"));
console.log('performLogout removes admin-authed:', html.includes("performLogout") && html.includes("classList.remove('admin-authed')"));
console.log('clearAdminToken removes admin-authed:', html.includes("function clearAdminToken") && html.includes("classList.remove('admin-authed')"));
console.log('Total admin-authed references:', (html.match(/admin-authed/g) || []).length);
console.log('classList.remove references:', (html.match(/classList\.remove\('admin-authed'\)/g) || []).length);