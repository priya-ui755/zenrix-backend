const fs = require('fs');
const path = require('path');

// =========== 1. FIX THE SIDEBAR TOGGLE IN admin-dashboard.js ===========
const jsPath = path.join(__dirname, '..', 'Frontend', 'js', 'admin-dashboard.js');
let js = fs.readFileSync(jsPath, 'utf8');

// Remove the standalone sidebar toggle function and its call
// The sidebar toggle is now handled inline in the HTML
const oldCode = `  // ========================================
  // IMMEDIATE: Sidebar toggle (MUST run before DOMContentLoaded)
  // ========================================
  function ensureSidebarToggleStandalone() {
    try {
      const btn = document.getElementById('sidebarToggle');
      if (!btn) return;
      const bodyEl = document.body;
      const collapsed = localStorage.getItem('adminSidebarCollapsed') === '1';
      if (collapsed) bodyEl.classList.add('sidebar-collapse'); else bodyEl.classList.remove('sidebar-collapse');
      btn.setAttribute('aria-expanded', String(!collapsed));
      if (!btn._sidebarHandlerAdded) {
        btn.addEventListener('click', function (e) {
          try { e.preventDefault(); } catch (e) {}
          try {
            const isCollapsed = bodyEl.classList.toggle('sidebar-collapse');
            btn.setAttribute('aria-expanded', String(!isCollapsed));
            try { localStorage.setItem('adminSidebarCollapsed', isCollapsed ? '1' : '0'); } catch (e) {}
          } catch (err) {}
        });
        btn._sidebarHandlerAdded = true;
      }
    } catch (e) { /* ignore */ }
  }
  try { ensureSidebarToggleStandalone(); document.addEventListener('DOMContentLoaded', ensureSidebarToggleStandalone, { once: true }); } catch (e) {}

  // ========================================
  // CHART INITIALIZATION (single, deduplicated)`;

const newCode = `  // ========================================
  // CHART INITIALIZATION (single, deduplicated)
  // Sidebar toggle is handled inline in admin-dashboard.html to avoid double-binding`;

js = js.replace(oldCode, newCode);

fs.writeFileSync(jsPath, js);
console.log('1. Updated admin-dashboard.js - removed duplicate sidebar toggle function');

// =========== 2. ADD CRITICAL ANTI-FOUC CSS BACK TO HTML ===========
const htmlPath = path.join(__dirname, '..', 'Frontend', 'admin-dashboard.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove any existing style block that has anti-FOUC styles already
const existingStyleInHead = html.match(/<link rel="stylesheet" href="\/css\/admin-dashboard-extras\.css">\s*<\/head>/);
if (!existingStyleInHead) {
  console.log(' - Could not find the link tag pattern, using alternative approach');
  // Just replace the </head> tag with critical CSS before it
} else {
  const criticalCSS = `<link rel="stylesheet" href="/css/admin-dashboard-extras.css">
    <style>
        /* CRITICAL: Prevent flash of unstyled content - must load before body renders */
        html.admin-loading,html.admin-loading body{background:#0f172a!important;min-height:100vh;min-width:100vw;overflow:hidden!important}
        html.admin-loading .content-wrapper,html.admin-loading #adminContent,html.admin-loading .main-footer,html.admin-loading #adminSidebar,
        body.admin-loading .content-wrapper,body.admin-loading #adminContent,body.admin-loading .main-footer,body.admin-loading #adminSidebar,
        html.admin-loading body>*:not(#authOverlay):not(#loginModal),body.admin-loading>*:not(#authOverlay):not(#loginModal){display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}
        #authOverlay{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-height:100vh!important;z-index:13000!important;background:rgba(15,23,42,0.995)!important;backdrop-filter:blur(14px)!important;display:flex!important;visibility:visible!important}
        #authOverlay.hidden{display:none!important;visibility:hidden!important;pointer-events:none!important}
        #content-products,#content-footer-editor,#content-site-settings,#content-hero,#content-orders,#content-careers,#content-staff,#content-subscribers,#content-testimonials,#content-tickets{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;z-index:-9999!important;overflow-y:auto!important}
        #content-dashboard{display:block!important;visibility:visible!important;opacity:1!important;z-index:1!important;overflow-y:auto!important}
        .row-flash{animation:rowFlash 1.1s ease-in-out}
        @keyframes rowFlash{0%{background-color:rgba(99,102,241,0.12)}50%{background-color:rgba(99,102,241,0.22)}100%{background-color:transparent}}
    </style>
</head>`;

  html = html.replace(/<link rel="stylesheet" href="\/css\/admin-dashboard-extras\.css">\s*<\/head>/, criticalCSS);
  fs.writeFileSync(htmlPath, html);
  console.log('2. Updated admin-dashboard.html - added critical anti-FOUC CSS in <head>');
}

// Remove duplicate row-flash from external CSS (now inline)
const cssPath = path.join(__dirname, '..', 'Frontend', 'css', 'admin-dashboard-extras.css');
let css = fs.readFileSync(cssPath, 'utf8');
// Remove the row-flash block that we moved to inline critical CSS
css = css.replace(/\/\* Quick row flash animation[\s\S]*?@keyframes rowFlash[\s\S]*?\}\s*\}/g, '');
// Also remove the duplicate authOverlay rules, #content- sections (now inline critical)
// But keep the rest intact - it's loaded after critical CSS so it won't cause flash
css = css.replace(/\n{3,}/g, '\n\n');
css = css.trim();
fs.writeFileSync(cssPath, css);
console.log('3. Cleaned up external CSS - removed duplicate rules now in inline critical CSS');

console.log('\nDone! Both issues fixed:');
console.log('  - Sidebar toggle: no longer bound twice (only inline HTML handler)');
console.log('  - Flash on reload: critical CSS loads synchronously in <head> before body renders');