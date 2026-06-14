const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'Frontend', 'admin-dashboard.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// ====== STEP 1: Replace critical CSS block ======
const oldBlock = html.match(/<style>[\s\S]*?\/\* CRITICAL: Prevent flash[\s\S]*?<\/style>/);
if (!oldBlock) {
  console.log('Trying alternative CSS block pattern...');
}

// Find any style block right before </head>
const allStyles = html.match(/<style>[\s\S]*?<\/style>/g);
console.log('Found', allStyles ? allStyles.length : 0, 'style blocks in HTML');

// The critical one should have 'CRITICAL' or 'admin-loading' in it
let targetStyle = null;
let targetIdx = -1;
if (allStyles) {
  for (let i = 0; i < allStyles.length; i++) {
    if (allStyles[i].includes('CRITICAL') || allStyles[i].includes('admin-loading') || allStyles[i].includes('row-flash')) {
      targetStyle = allStyles[i];
      targetIdx = html.indexOf(targetStyle);
      break;
    }
  }
}

if (targetStyle) {
  console.log('Found target style block at position', targetIdx, 'length:', targetStyle.length);
  
  const newBlock = `<style>
    /* CRITICAL: Force-hide ALL content except auth overlay until authenticated */
    html, body { background: #0f172a !important; min-height: 100vh; min-width: 100vw; margin: 0; padding: 0; }
    .wrapper.admin-app, .main-header, .main-sidebar, .content-wrapper, #adminContent,
    [id^="content-"], #chatbot-container, #chatbot-window, #chatbot-toggle,
    #loginModal, #editProductModal, #editCareerModal, #editPageModal, #editComponentModal,
    #orderDetailsModal, #editStaffModal, #ticketDetailsModal {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
    }
    #authOverlay {
        display: flex !important;
        visibility: visible !important;
        position: fixed !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 100vh !important;
        z-index: 13000 !important;
        background: rgba(15,23,42,0.995) !important;
        backdrop-filter: blur(14px) !important;
    }
    #authOverlay.hidden { display: none !important; visibility: hidden !important; pointer-events: none !important; }
    .row-flash { animation: rowFlash 1.1s ease-in-out; }
    @keyframes rowFlash { 0% { background-color: rgba(99,102,241,0.12); } 50% { background-color: rgba(99,102,241,0.22); } 100% { background-color: transparent; } }
    /* When admin-authed class is on html - reveal everything */
    html.admin-authed .wrapper.admin-app,
    html.admin-authed .main-header,
    html.admin-authed .main-sidebar,
    html.admin-authed .content-wrapper,
    html.admin-authed #adminContent,
    html.admin-authed [id^="content-"],
    html.admin-authed #chatbot-container,
    html.admin-authed #chatbot-toggle {
        display: revert !important;
        visibility: visible !important;
        pointer-events: auto !important;
        opacity: 1 !important;
    }
    html.admin-authed #chatbot-window:not(.hidden) {
        display: flex !important;
        visibility: visible !important;
        pointer-events: auto !important;
        opacity: 1 !important;
    }
    html.admin-authed #loginModal,
    html.admin-authed #editProductModal,
    html.admin-authed #editCareerModal,
    html.admin-authed #editPageModal,
    html.admin-authed #editComponentModal,
    html.admin-authed #orderDetailsModal,
    html.admin-authed #editStaffModal,
    html.admin-authed #ticketDetailsModal {
        display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;
    }
    html.admin-authed #authOverlay { display: none !important; visibility: hidden !important; pointer-events: none !important; }
</style>`;

  html = html.replace(targetStyle, newBlock);
  console.log('1. Replaced critical CSS block with aggressive version');
} else {
  console.log('ERROR: Could not find target style block');
  process.exit(1);
}

// ====== STEP 2: Add admin-authed class in inline scripts ======

// 2a. In setAuthGuard function
html = html.replace(
  'function setAuthGuard(isAuthed) {',
  'function setAuthGuard(isAuthed) { try { document.documentElement.classList.toggle(\'admin-authed\', !!isAuthed); document.body.classList.toggle(\'admin-authed\', !!isAuthed); } catch(e) {}'
);
console.log('2a. Updated setAuthGuard');

// 2b. In early token check script
html = html.replace(
  'if (hasAdminToken()) {\n                overlay.classList.add(\'hidden\');\n                overlay.style.display = \'none\';',
  'if (hasAdminToken()) { document.documentElement.classList.add(\'admin-authed\'); document.body.classList.add(\'admin-authed\');\n                overlay.classList.add(\'hidden\');\n                overlay.style.display = \'none\';'
);
console.log('2b. Updated early token check');

// 2c. On login success
html = html.replace(
  'try { closeLoginModal(); } catch(e) {}\n                    try { window.__adminServerValidated',
  'try { closeLoginModal(); document.documentElement.classList.add(\'admin-authed\'); document.body.classList.add(\'admin-authed\'); } catch(e) {}\n                    try { window.__adminServerValidated'
);
console.log('2c. Updated login success');

// 2d. On boot ping success
html = html.replace(
  'try { setAuthGuard(true); } catch(e){}\n                        try { updateAdminUI(); } catch(e){}',
  'try { setAuthGuard(true); document.documentElement.classList.add(\'admin-authed\'); document.body.classList.add(\'admin-authed\'); } catch(e){}\n                        try { updateAdminUI(); } catch(e){}'
);
console.log('2d. Updated boot ping');

fs.writeFileSync(htmlPath, html);
console.log('\nAll fixes applied! admin-authed references:', (html.match(/admin-authed/g) || []).length);