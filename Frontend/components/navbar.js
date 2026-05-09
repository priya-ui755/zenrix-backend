class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    background: transparent;
                }
                .shell {
                    position: relative;
                    background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.9), rgba(49,46,129,0.85));
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(99,102,241,0.15);
                    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(99,102,241,0.08);
                }
                .shell::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: linear-gradient(180deg, rgba(255,255,255,0.14), transparent 55%);
                    opacity: 0.55;
                }
                .shell::after {
                    content: "";
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 50%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(168,85,247,0.3), transparent);
                }
                nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.9rem 1.5rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    gap: 1rem;
                }
                .brand {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6rem;
                    font-size: 1.35rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #e0e7ff, #c7d2fe, #a5b4fc);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    text-decoration: none;
                    letter-spacing: 0.03em;
                    transition: transform 0.2s ease;
                }
                .brand:hover {
                    transform: scale(1.02);
                }
                .brand .dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 999px;
                    background: linear-gradient(135deg, #22d3ee, #6366f1, #a855f7);
                    box-shadow: 0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(168,85,247,0.3);
                    animation: orbPulse 2s ease-in-out infinite;
                }
                @keyframes orbPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(168,85,247,0.3); }
                    50% { box-shadow: 0 0 30px rgba(99,102,241,0.8), 0 0 60px rgba(168,85,247,0.5); }
                }
                .nav-links {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                .nav-links a {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #cbd5e1;
                    text-decoration: none;
                    font-weight: 600;
                    padding: 0.55rem 1rem;
                    border-radius: 14px;
                    border: 1px solid transparent;
                    transition: all 0.2s ease;
                }
                .nav-links a svg { flex: 0 0 auto; opacity: 0.7; transition: opacity 0.2s ease; }
                .nav-links a:hover {
                    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1));
                    border-color: rgba(99,102,241,0.25);
                    color: #fff;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(99,102,241,0.2);
                }
                .nav-links a:hover svg { opacity: 1; }
                .nav-actions {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }
                .theme-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.55rem 1rem;
                    border-radius: 14px;
                    border: 1px solid rgba(99,102,241,0.25);
                    background: rgba(99,102,241,0.1);
                    color: #e2e8f0;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .theme-btn:hover {
                    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15));
                    border-color: rgba(99,102,241,0.4);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(99,102,241,0.25);
                }
                .chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.55rem 1rem;
                    border-radius: 14px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
                    color: #e2e8f0;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 0.9rem;
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: all 0.2s ease;
                }
                :host-context(.theme-light) .shell {
                    background: rgba(255,255,255,0.9);
                    border-bottom: 1px solid rgba(15,23,42,0.08);
                    box-shadow: 0 18px 40px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
                }
                :host-context(.theme-light) .shell::before {
                    background: linear-gradient(180deg, rgba(99,102,241,0.08), transparent 60%);
                    opacity: 1;
                }
                :host-context(.theme-light) .brand {
                    background: linear-gradient(135deg, #4f46e5, #2563eb, #1d4ed8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    color: #4f46e5;
                }
                :host-context(.theme-light) .nav-links a { color: #1f2937; }
                :host-context(.theme-light) .nav-links a:hover { background: rgba(15,23,42,0.06); color: #0f172a; }
                :host-context(.theme-light) .chip,
                :host-context(.theme-light) .theme-btn,
                :host-context(.theme-light) .mobile-menu-btn {
                    background: rgba(15,23,42,0.05);
                    color: #0f172a;
                    border-color: rgba(15,23,42,0.12);
                }
                :host-context(.theme-light) .mobile-panel {
                    background: rgba(255,255,255,0.95);
                    border-bottom: 1px solid rgba(15,23,42,0.08);
                }
                :host-context(.theme-light) .mobile-links a {
                    background: rgba(15,23,42,0.05);
                    color: #0f172a;
                    border-color: rgba(15,23,42,0.08);
                }
                .chip:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(99,102,241,0.2);
                    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1));
                    border-color: rgba(99,102,241,0.3);
                }
                .cart-icon {
                    position: relative;
                }
                .cart-count {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: linear-gradient(135deg, #22d3ee, #10b981);
                    color: #0b1120;
                    border-radius: 999px;
                    min-width: 20px;
                    height: 20px;
                    padding: 0 6px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 11px;
                    font-weight: 800;
                    transition: transform 220ms cubic-bezier(.2,.8,.2,1);
                    box-shadow: 0 4px 15px rgba(34,211,238,0.4), 0 0 20px rgba(16,185,129,0.3);
                    border: 2px solid rgba(15,23,42,0.8);
                }
                .cart-count.pop { transform: scale(1.4); }

                /* About dropdown styles */
                .about-wrap { position: relative; display: inline-block; }
                .about-toggle { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap:0.5rem; }
                .about-toggle .caret { font-size: 12px; opacity: 0.9; }
                .about-panel { position: absolute; right: 0; top: calc(100% + 0.5rem); min-width: 320px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 1rem; box-shadow: 0 18px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.04); display: none; z-index: 60; }
                :host-context(.theme-light) .about-panel { background: #fff; border-color: rgba(15,23,42,0.06); box-shadow: 0 12px 30px rgba(15,23,42,0.06); }
                .about-panel .about-blurb { color: #cbd5e1; font-size: 0.95rem; margin-bottom: 0.75rem; }
                :host-context(.theme-light) .about-panel .about-blurb { color: #374151; }
                .about-panel .about-team.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
                .about-panel .about-team .member { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.4rem; }
                .about-panel .about-team img { width: 64px; height: 64px; object-fit: cover; border-radius: 999px; }

                .mobile-menu-btn {
                    display: none;
                    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1));
                    border: 1px solid rgba(99,102,241,0.25);
                    color: #e2e8f0;
                    padding: 0.55rem 0.7rem;
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .mobile-menu-btn:hover {
                    background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15));
                    border-color: rgba(99,102,241,0.4);
                    transform: translateY(-1px);
                }
                .mobile-panel {
                    display: none;
                    position: absolute;
                    inset: 0;
                    top: 100%;
                    padding: 1.25rem 1.5rem 1.75rem;
                    background: linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,27,75,0.95));
                    border-bottom: 1px solid rgba(99,102,241,0.2);
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .mobile-panel.open { display: block; }
                .mobile-links {
                    display: grid;
                    gap: 0.6rem;
                }
                .mobile-links a {
                    display: block;
                    padding: 1rem 1.25rem;
                    border-radius: 16px;
                    background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.05));
                    color: #e2e8f0;
                    text-decoration: none;
                    font-weight: 600;
                    border: 1px solid rgba(99,102,241,0.15);
                    transition: all 0.2s ease;
                }
                .mobile-links a.icon-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6rem;
                }
                .mobile-links a.icon-link svg { flex: 0 0 auto; }
                .mobile-links a:hover { 
                    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.1));
                    border-color: rgba(99,102,241,0.3);
                    transform: translateX(4px);
                }
                @media (max-width: 900px) {
                    nav { padding: 0.85rem 1.25rem; }
                    .nav-links { display: none; }
                    .mobile-menu-btn { display: inline-flex; }
                }
            </style>
            <div class="shell">
                <nav>
                    <a href="/" class="brand"><span class="dot"></span><span class="brand-name">Zenrix</span></a>
                    <div class="nav-links">
                        <a href="/" data-nav-icon="home">
                            <span>Home</span>
                        </a>
                        <a href="/about.html" data-nav-icon="about">
                            <span>About</span>
                        </a>
                        <a href="/products.html" data-nav-icon="products">
                            <span>Products</span>
                        </a>
                        <a href="/contact.html" data-nav-icon="contact">
                            <span>Contact</span>
                        </a>
                    </div>
                    <div class="nav-actions">
                        <button class="theme-btn" id="themeToggleBtn" type="button" aria-label="Toggle theme">
                            <span class="theme-icon">🌙</span>
                            <span class="theme-label">Dark</span>
                        </button>
                        <a href="/profile.html" class="chip" aria-label="Your account">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M4 21c0-4.4 3.1-7 8-7s8 2.6 8 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                                <span>Account</span>
                        </a>
                        <a href="/cart.html" class="chip cart-icon" aria-label="View cart">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M4 5h2.2l.6 1.8M8 15h8.7c.6 0 1.1-.4 1.2-.9l1.1-6.1H7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="9.2" cy="18" r="1.2" fill="currentColor"/>
                                <circle cx="16.8" cy="18" r="1.2" fill="currentColor"/>
                            </svg>
                            <span class="cart-count" id="cartCount">0</span>
                        </a>
                        <button class="mobile-menu-btn" aria-label="Toggle menu">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </nav>
                <div class="mobile-panel" aria-label="Mobile navigation">
                    <div class="mobile-links">
                        <a href="/" class="icon-link" data-nav-icon="home">
                            <span>Home</span>
                        </a>
                        <a href="/about.html" class="icon-link" data-nav-icon="about">
                            <span>About</span>
                        </a>
                        <a href="/products.html" class="icon-link" data-nav-icon="products">
                            <span>Products</span>
                        </a>
                        <a href="/contact.html" class="icon-link" data-nav-icon="contact">
                            <span>Contact</span>
                        </a>
                        <a href="/cart.html">Cart</a>
                    </div>
                </div>
            </div>
        `;

        const readSiteBrandName = () => {
            try {
                const raw = localStorage.getItem('siteSettings');
                if (raw) {
                    const settings = JSON.parse(raw);
                    const name = (settings && (settings.siteTitle || settings.companyName)) ? String(settings.siteTitle || settings.companyName).trim() : '';
                    if (name) return name;
                }
            } catch (err) {}
            return 'Zenrix';
        };

        const applySiteBranding = () => {
            const brandName = readSiteBrandName();
            const brandEl = this.shadowRoot.querySelector('.brand-name');
            if (brandEl) brandEl.textContent = brandName;
        };

        this._siteBrandingHandler = applySiteBranding;
        window.addEventListener('siteSettingsUpdated', applySiteBranding);
        window.addEventListener('storage', applySiteBranding);
        applySiteBranding();

        const removeUnwantedLinks = (rootEl) => {
            if (!rootEl) return;
            // Remove Team auto-sections and Account link(s) when injected.
            const UNWANTED_NAV_LABELS = new Set([
                'team showcase',
                'sample team',
                'our team',
            ]);
            const UNWANTED_HREFS = new Set([
                '/team-showcase.html',
                '/sample-team.html',
                '/about.html#team',
                '/account.html',
            ]);

            rootEl.querySelectorAll('a').forEach((a) => {
                const label = (a.textContent || '').trim().toLowerCase();
                const href = (a.getAttribute('href') || '').trim();
                if (UNWANTED_NAV_LABELS.has(label) || UNWANTED_HREFS.has(href)) a.remove();
            });
        };

        const applyNavIcons = (rootEl) => {
            if (!rootEl) return;
            // Inline SVG icons (no external fonts). This avoids "square box" icons when
            // icon fonts are blocked by adblock/privacy filters or font loading issues.
            const svgNS = 'http://www.w3.org/2000/svg';
            const svgForHref = (href, size = 16) => {
                const makeSvg = (paths) => {
                    const svg = document.createElementNS(svgNS, 'svg');
                    svg.setAttribute('width', String(size));
                    svg.setAttribute('height', String(size));
                    svg.setAttribute('viewBox', '0 0 24 24');
                    svg.setAttribute('fill', 'none');
                    svg.setAttribute('aria-hidden', 'true');
                    svg.setAttribute('xmlns', svgNS);
                    paths.forEach((p) => {
                        const path = document.createElementNS(svgNS, 'path');
                        Object.entries(p).forEach(([k, v]) => path.setAttribute(k, v));
                        svg.appendChild(path);
                    });
                    return svg;
                };

                if (href === '/' || href === '/index.html') {
                    return makeSvg([
                        { d: 'M3 10.5L12 3l9 7.5', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        { d: 'M6.5 10.5V20h11V10.5', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                    ]);
                }
                if (href === '/about.html') {
                    return makeSvg([
                        { d: 'M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z', stroke: 'currentColor', 'stroke-width': '2' },
                        { d: 'M12 10.5v6', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
                        { d: 'M12 7.5h.01', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round' },
                    ]);
                }
                if (href === '/products.html') {
                    return makeSvg([
                        { d: 'M6 7V6a6 6 0 0112 0v1', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                        { d: 'M5 7h14l-1 14H6L5 7Z', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linejoin': 'round' },
                    ]);
                }
                if (href === '/contact.html') {
                    return makeSvg([
                        { d: 'M22 16.9v2a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 013.1 4.2 2 2 0 015 2h2a2 2 0 012 1.7c.1.8.3 1.6.6 2.4a2 2 0 01-.5 2.1L8.6 9.4a16 16 0 006 6l1.2-1.1a2 2 0 012.1-.5c.8.3 1.6.5 2.4.6A2 2 0 0122 16.9Z', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                    ]);
                }
                return null;
            };

            const decorateAnchor = (a, size) => {
                if (!a) return;
                if (a.querySelector('svg')) return;
                const href = (a.getAttribute('href') || '').trim();
                const svg = svgForHref(href, size || 16);
                if (!svg) return;
                const label = (a.textContent || '').trim();
                a.textContent = '';
                a.appendChild(svg);
                const span = document.createElement('span');
                span.textContent = label;
                a.appendChild(span);
            };

            rootEl.querySelectorAll('.nav-links a').forEach((a) => decorateAnchor(a, 16));
            rootEl.querySelectorAll('.mobile-links a').forEach((a) => decorateAnchor(a, 18));
        };

        const normalizeNavOrder = (rootEl) => {
            if (!rootEl) return;
            const reorderContainer = (containerSel) => {
                const container = rootEl.querySelector(containerSel);
                if (!container) return;

                // In CMS markup, "About" might be inside a wrapper (dropdown), so we reorder
                // by moving the top-level item (direct child of the container), not just the <a>.
                const findDirectItemByHref = (hrefs) => {
                    const hrefList = Array.isArray(hrefs) ? hrefs : [hrefs];
                    const anchor = container.querySelector(
                        hrefList.map((h) => `a[href=\"${h}\"]`).join(',')
                    );
                    if (!anchor) return null;
                    let node = anchor;
                    while (node && node.parentElement !== container) node = node.parentElement;
                    return node && node.parentElement === container ? node : null;
                };

                const desiredItems = [
                    findDirectItemByHref(['/', '/index.html']),
                    findDirectItemByHref('/about.html'),
                    findDirectItemByHref('/products.html'),
                    findDirectItemByHref('/contact.html'),
                ].filter(Boolean);

                // Insert in requested order at the front. Other items remain after.
                let insertBefore = container.firstElementChild;
                desiredItems.forEach((item) => {
                    container.insertBefore(item, insertBefore);
                    insertBefore = item.nextElementSibling;
                });
            };

            reorderContainer('.nav-links');
            reorderContainer('.mobile-links');
        };

        // Ensure unwanted links are removed in built-in markup too, and icons are present.
        try { removeUnwantedLinks(this.shadowRoot); } catch (e) {}
        try { applyNavIcons(this.shadowRoot); } catch (e) {}
        try { normalizeNavOrder(this.shadowRoot); } catch (e) {}

        // Try to fetch remote navbar content (CMS-managed) and replace nav-links
        (async () => {
            try {
                const API = window.API_URL || (location.origin + '/api');
                const res = await fetch(`${API}/components/slug/navbar`);
                const json = await res.json();
                if (json.success && json.data && json.data.html) {
                    const el = this.shadowRoot.querySelector('.nav-links');
                    if (!el) return;

                    let containerHtml = null;
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(json.data.html, 'text/html');
                        const container = doc.body.firstElementChild || doc.body;

                        // Remove unwanted auto-added navbar items (CMS can inject extra links)
                        // and ensure About isn't duplicated.
                        const UNWANTED_NAV_LABELS = new Set([
                            'team showcase',
                            'sample team',
                            'our team',
                        ]);

                        // Remove any anchors matching the unwanted labels (case-insensitive, trimmed)
                        container.querySelectorAll('a').forEach((a) => {
                            const label = (a.textContent || '').trim().toLowerCase();
                            if (UNWANTED_NAV_LABELS.has(label)) a.remove();
                        });

                        // Remove duplicate About links in dropdown
                        const dropdown = container.querySelector('#aboutDropdown');
                        if (dropdown) {
                            const menu = dropdown.querySelector('.dropdown-menu');
                            if (menu) {
                                // Remove all <a href="/about.html">...</a> in the menu
                                menu.querySelectorAll('a[href="/about.html"]').forEach(a => a.remove());
                            }
                            // Ensure the toggle is an anchor linking to /about.html
                            const toggle = dropdown.querySelector('.dropdown-toggle');
                            if (toggle && toggle.tagName && toggle.tagName.toLowerCase() !== 'a') {
                                const a = doc.createElement('a');
                                a.className = toggle.className || '';
                                a.setAttribute('href', '/about.html');
                                a.innerHTML = toggle.innerHTML || 'About';
                                toggle.replaceWith(a);
                            } else if (toggle && toggle.tagName && toggle.tagName.toLowerCase() === 'a') {
                                if (!toggle.getAttribute('href')) toggle.setAttribute('href', '/about.html');
                            }

                        }

                        el.innerHTML = container.innerHTML;
                    } catch (err) {
                        // fallback to raw HTML if parsing fails
                        el.innerHTML = json.data.html;
                    }

                    // Safety net: ensure unwanted links are removed even if parsing was partial
                    // or CMS markup changes.
                    try {
                        removeUnwantedLinks(el);
                    } catch (cleanupErr) {
                        // ignore
                    }

                    // Ensure icons are present even when CMS provides plain text links.
                    try {
                        applyNavIcons(this.shadowRoot);
                    } catch (iconErr) {
                        // ignore
                    }

                    // Enforce desired order even if CMS provides a different ordering.
                    try {
                        normalizeNavOrder(this.shadowRoot);
                    } catch (orderErr) {
                        // ignore
                    }

                    // Ensure About link exists (CMS might not include it)
                    if (!el.querySelector('a[href="/about.html"]')) {
                        el.insertAdjacentHTML('beforeend', `<a href="/about.html">About</a>`);
                    }

                    // Deduplicate About links: if multiple "About Us" anchors exist, keep only the first one
                    try {
                        const aboutLinks = el.querySelectorAll('a[href="/about.html"]');
                        if (aboutLinks.length > 1) {
                            // Remove all but the first
                            for (let i = 1; i < aboutLinks.length; i++) aboutLinks[i].remove();
                        }
                    } catch (dedupeErr) {
                        console.warn('About dedupe failed', dedupeErr && dedupeErr.message);
                    }
                }
            } catch (e) {
                // silent fallback to built-in links
            }
        })();

        // Mobile toggle
        const panel = this.shadowRoot.querySelector('.mobile-panel');
        const toggleBtn = this.shadowRoot.querySelector('.mobile-menu-btn');
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('open');
                panel.classList.toggle('open', !isOpen);
            });
        }

        // About dropdown removed — keep a simple About link in the navbar only.
        // Any advanced preview behavior is now available on the dedicated About page.

        // Theme toggle — use global theme system from script.js
        const themeBtn = this.shadowRoot.getElementById('themeToggleBtn');
        const iconSpan = themeBtn?.querySelector('.theme-icon');
        const labelSpan = themeBtn?.querySelector('.theme-label');

        const getGlobalTheme = () => {
            const stored = localStorage.getItem('zenrix_theme');
            if (stored === 'dark' || stored === 'light') return stored;
            return 'light';
        };

        const syncThemeButton = (theme) => {
            if (!iconSpan || !labelSpan) return;
            if (theme === 'light') {
                iconSpan.textContent = '☀️';
                labelSpan.textContent = 'Light';
            } else {
                iconSpan.textContent = '🌙';
                labelSpan.textContent = 'Dark';
            }
        };

        if (themeBtn) {
            // Sync button display on page load
            syncThemeButton(getGlobalTheme());
            
            // Call global toggleTheme() if available, otherwise fallback to local implementation
            themeBtn.addEventListener('click', () => {
                if (typeof window.toggleTheme === 'function') {
                    window.toggleTheme();
                } else {
                    // Fallback for pages without script.js loaded
                    const current = getGlobalTheme();
                    const next = current === 'light' ? 'dark' : 'light';
                    const nextClass = next === 'light' ? 'theme-light' : 'theme-dark';
                    document.documentElement.classList.remove('theme-light', 'theme-dark');
                    document.documentElement.classList.add(nextClass);
                    localStorage.setItem('zenrix_theme', next);
                    window.dispatchEvent(new CustomEvent('zenrix-theme-changed', { detail: { theme: next } }));
                }
            });
            
            // Listen for theme changes from anywhere (script.js or other components)
            window.addEventListener('zenrix-theme-changed', (e) => {
                syncThemeButton(e.detail?.theme || getGlobalTheme());
            });
        }

        // Add a global accessible live region for screen readers if not present
        if (!document.getElementById('zenrix-cart-live')) {
            const live = document.createElement('div');
            live.id = 'zenrix-cart-live';
            live.setAttribute('role', 'status');
            live.setAttribute('aria-live', 'polite');
            live.setAttribute('aria-atomic', 'true');
            // visually hidden styles
            live.style.position = 'absolute';
            live.style.width = '1px';
            live.style.height = '1px';
            live.style.padding = '0';
            live.style.margin = '-1px';
            live.style.overflow = 'hidden';
            live.style.clip = 'rect(0 0 0 0)';
            live.style.whiteSpace = 'nowrap';
            live.style.border = '0';
            document.body.appendChild(live);
        }

        // Update count immediately
        this.updateCartCount = () => {
            try {
                const cart = JSON.parse(localStorage.getItem('zenrix_cart')) || [];
                const total = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const el = this.shadowRoot.getElementById('cartCount');
                if (el) {
                    // Animate if count increased
                    const prev = this._lastCount || 0;
                    el.textContent = total;
                    el.style.display = total > 0 ? 'flex' : 'none';
                    if (total > prev) {
                        el.classList.remove('pop');
                        // force reflow
                        void el.offsetWidth;
                        el.classList.add('pop');
                        setTimeout(() => el.classList.remove('pop'), 300);
                    }
                    this._lastCount = total;
                }

                // Update global live region for screen readers
                const live = document.getElementById('zenrix-cart-live');
                if (live) {
                    live.textContent = total > 0 ? `Cart has ${total} item${total === 1 ? '' : 's'}` : 'Cart is empty';
                }
            } catch (e) {
                // ignore
            }
        };

        // Bind and initialize
        this._boundUpdate = this.updateCartCount.bind(this);
        window.addEventListener('cartUpdated', this._boundUpdate);
        window.addEventListener('storage', (e) => { if (e.key === 'zenrix_cart') this._boundUpdate(); });
        this._lastCount = 0;
        this._boundUpdate();
    }

    disconnectedCallback() {
        if (this._siteBrandingHandler) {
            window.removeEventListener('siteSettingsUpdated', this._siteBrandingHandler);
            window.removeEventListener('storage', this._siteBrandingHandler);
        }
        window.removeEventListener('cartUpdated', this._boundUpdate);
    }
}

customElements.define('custom-navbar', CustomNavbar);