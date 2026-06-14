const fs = require('fs');
let html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');

// Fix the duplicate/broken setAuthGuard
// Current broken state has duplicated code on one line
const broken = "function setAuthGuard(isAuthed) { try { document.documentElement.classList.toggle('admin-authed', !!isAuthed); document.body.classList.toggle('admin-authed', !!isAuthed); if (!isAuthed) { document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } } catch(e) {}, !!isAuthed); document.body.classList.toggle('admin-authed', !!isAuthed); } catch(e) {}";

const fixed = "function setAuthGuard(isAuthed) { try { document.documentElement.classList.toggle('admin-authed', !!isAuthed); document.body.classList.toggle('admin-authed', !!isAuthed); if (!isAuthed) { document.documentElement.classList.remove('admin-authed'); document.body.classList.remove('admin-authed'); } } catch(e) {}";

html = html.replace(broken, fixed);

fs.writeFileSync('Frontend/admin-dashboard.html', html);

// Verify
html = fs.readFileSync('Frontend/admin-dashboard.html', 'utf8');
const idx = html.indexOf('function setAuthGuard');
const snippet = html.substring(idx, idx + 300);
console.log('setAuthGuard now:');
console.log(snippet);

// Check for any remaining duplicate toggle patterns
const toggleCount = (snippet.match(/classList\.toggle/g) || []).length;
const removeCount = (snippet.match(/classList\.remove/g) || []).length;
console.log('\ntoggle calls:', toggleCount);
console.log('remove calls:', removeCount);
console.log('Has closing brace properly:', snippet.includes('} catch(e) {}') || snippet.includes("} catch(e) {}"));