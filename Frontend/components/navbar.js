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
                    background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(49,46,129,0.85));
                    backdrop-filter: blur(14px);
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
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
                    gap: 0.5rem;
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #e0e7ff;
                    text-decoration: none;
                    letter-spacing: 0.04em;
                }
                .brand .dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 999px;
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    box-shadow: 0 0 20px rgba(99,102,241,0.45);
                }
                .nav-links {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }
                .nav-links a {
                    color: #cbd5e1;
                    text-decoration: none;
                    font-weight: 600;
                    padding: 0.45rem 0.85rem;
                    border-radius: 999px;
                    transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
                }
                .nav-links a:hover {
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                    transform: translateY(-1px);
                }
                .nav-actions {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }
                .theme-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.45rem 0.85rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.08);
                    color: #e2e8f0;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
                }
                .theme-btn:hover {
                    background: rgba(255,255,255,0.12);
                    border-color: rgba(255,255,255,0.2);
                    transform: translateY(-1px);
                }
                .chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.5rem 0.85rem;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.08);
                    color: #e2e8f0;
                    text-decoration: none;
                    font-weight: 600;
                    border: 1px solid rgba(255,255,255,0.08);
                    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                }
                :host-context(.theme-light) .shell {
                    background: rgba(255,255,255,0.9);
                    border-bottom: 1px solid rgba(15,23,42,0.08);
                    box-shadow: 0 18px 40px rgba(15,23,42,0.08);
                }
                :host-context(.theme-light) .brand { color: #0f172a; }
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
                    transform: translateY(-1px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
                    background: rgba(255,255,255,0.12);
                }
                .cart-icon {
                    position: relative;
                }
                .cart-count {
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    background: linear-gradient(135deg, #22c55e, #10b981);
                    color: #0b1120;
                    border-radius: 999px;
                    min-width: 20px;
                    height: 20px;
                    padding: 0 6px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 12px;
                    font-weight: 800;
                    transition: transform 220ms cubic-bezier(.2,.8,.2,1);
                    box-shadow: 0 8px 20px rgba(34,197,94,0.35);
                }
                .cart-count.pop { transform: scale(1.4); }

                .mobile-menu-btn {
                    display: none;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.12);
                    color: #e2e8f0;
                    padding: 0.45rem 0.6rem;
                    border-radius: 12px;
                    cursor: pointer;
                }
                .mobile-panel {
                    display: none;
                    position: absolute;
                    inset: 0;
                    top: 100%;
                    padding: 1rem 1.5rem 1.5rem;
                    background: rgba(15,23,42,0.95);
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                .mobile-panel.open { display: block; }
                .mobile-links {
                    display: grid;
                    gap: 0.75rem;
                }
                .mobile-links a {
                    display: block;
                    padding: 0.85rem 1rem;
                    border-radius: 14px;
                    background: rgba(255,255,255,0.04);
                    color: #e2e8f0;
                    text-decoration: none;
                    font-weight: 600;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                .mobile-links a:hover { background: rgba(255,255,255,0.07); }
                @media (max-width: 900px) {
                    nav { padding: 0.85rem 1.25rem; }
                    .nav-links { display: none; }
                    .mobile-menu-btn { display: inline-flex; }
                }
            </style>
            <div class="shell">
                <nav>
                    <a href="/" class="brand"><span class="dot"></span>Zenrix</a>
                    <div class="nav-links">
                        <a href="/">Home</a>
                        <a href="/products.html">Products</a>
                        <a href="/account.html">Account</a>
                        <a href="/contact.html">Contact</a>
                    </div>
                    <div class="nav-actions">
                        <button class="theme-btn" id="themeToggleBtn" type="button" aria-label="Toggle theme">
                            <span class="theme-icon">🌙</span>
                            <span class="theme-label">Dark</span>
                        </button>
                        <a href="/profile.html" class="chip" aria-label="Your account">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5Z" stroke="#e2e8f0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M4 21c0-4.4 3.1-7 8-7s8 2.6 8 7" stroke="#e2e8f0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
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
                                <path d="M4 6h16M4 12h16M4 18h16" stroke="#e2e8f0" stroke-width="1.6" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </nav>
                <div class="mobile-panel" aria-label="Mobile navigation">
                    <div class="mobile-links">
                        <a href="/">Home</a>
                        <a href="/products.html">Products</a>
                        <a href="/account.html">Account</a>
                        <a href="/contact.html">Contact</a>
                        <a href="/cart.html">Cart</a>
                    </div>
                </div>
            </div>
        `;

        // Try to fetch remote navbar content (CMS-managed) and replace nav-links
        (async () => {
            try {
                const API = window.API_URL || (location.origin + '/api');
                const res = await fetch(`${API}/components/slug/navbar`);
                const json = await res.json();
                if (json.success && json.data && json.data.html) {
                    const el = this.shadowRoot.querySelector('.nav-links');
                    if (el) {
                        try {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(json.data.html, 'text/html');
                            const container = doc.body.firstElementChild || doc.body;

                            // Remove duplicate About links in dropdown (keep only Our Team)
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
                        } catch (e) {
                            // fallback to raw HTML if parsing fails
                            el.innerHTML = json.data.html;
                        }
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

        // Theme toggle
        const themeBtn = this.shadowRoot.getElementById('themeToggleBtn');
        const iconSpan = themeBtn?.querySelector('.theme-icon');
        const labelSpan = themeBtn?.querySelector('.theme-label');

        const getCurrentTheme = () => {
            const stored = localStorage.getItem('zenrix_theme');
            if (stored === 'light' || stored === 'dark') return stored;
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        };

        const setTheme = (theme) => {
            const next = theme === 'light' ? 'theme-light' : 'theme-dark';
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(next);
            localStorage.setItem('zenrix_theme', theme === 'light' ? 'light' : 'dark');
            window.dispatchEvent(new CustomEvent('zenrix-theme-changed', { detail: { theme } }));
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
            syncThemeButton(getCurrentTheme());
            themeBtn.addEventListener('click', () => {
                const current = getCurrentTheme();
                const next = current === 'light' ? 'dark' : 'light';
                // Apply immediately in case global listener is missing
                setTheme(next);
                // Notify any global listeners (script.js) to stay in sync
                window.dispatchEvent(new CustomEvent('zenrix-theme-toggle', { detail: { theme: next }, bubbles: true, composed: true }));
            });
            window.addEventListener('zenrix-theme-changed', (e) => {
                syncThemeButton(e.detail?.theme || getCurrentTheme());
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
        window.removeEventListener('cartUpdated', this._boundUpdate);
    }
}

customElements.define('custom-navbar', CustomNavbar);