class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    position: sticky;
                    top: 0;
                    z-index: 50;
                }
                nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .logo {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #4f46e5;
                    text-decoration: none;
                }
                .nav-links {
                    display: flex;
                    gap: 2rem;
                }
                .nav-links a {
                    color: #333;
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.3s ease;
                }
                .nav-links a:hover {
                    color: #4f46e5;
                }
                .nav-actions {
                    display: flex;
                    gap: 1.5rem;
                    align-items: center;
                }
                .cart-icon {
                    position: relative;
                }
                .cart-count {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #4f46e5;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 12px;
                    font-weight: 600;
                    transition: transform 220ms cubic-bezier(.2,.8,.2,1);
                }

                .cart-count.pop {
                    transform: scale(1.4);
                }
                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                @media (max-width: 768px) {
                    .nav-links {
                        display: none;
                    }
                    .mobile-menu-btn {
                        display: block;
                    }
                }
            </style>
            <nav>
                    <a href="/" class="logo">Zenrix</a>
<div class="nav-links">
                    <a href="/">Home</a>
                    <a href="/products.html">Products</a>
                    <a href="/account.html">Account</a>
                    <a href="/contact.html">Contact</a>
                </div>
                <div class="nav-actions">
                    <a href="/profile.html" class="account-link" aria-label="Your account">
                        <!-- user SVG -->
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" stroke="#374151" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3 21c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#374151" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </a>
<a href="/cart.html" class="cart-icon" aria-label="View cart">
                        <!-- Inline shopping bag SVG for better control -->
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M6 7L6.4 4.8C6.6 3.6 7.6 2.8 8.8 2.8H15.2C16.4 2.8 17.4 3.6 17.6 4.8L18 7" stroke="#374151" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M20 7H4L5 20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20L20 7Z" stroke="#374151" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="cart-count" id="cartCount">0</span>
                    </a>
                    <button class="mobile-menu-btn" aria-label="Open menu">
                        <!-- menu bars SVG -->
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M3 6h18" stroke="#374151" stroke-width="1.6" stroke-linecap="round"/>
                            <path d="M3 12h18" stroke="#374151" stroke-width="1.6" stroke-linecap="round"/>
                            <path d="M3 18h18" stroke="#374151" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </nav>
        `;

        // Try to fetch remote navbar content (CMS-managed) and replace nav-links
        (async () => {
            try {
                const API = window.API_URL || (location.origin + '/api');
                const res = await fetch(`${API}/components/slug/navbar`);
                const json = await res.json();
                if (json.success && json.data && json.data.html) {
                    const el = this.shadowRoot.querySelector('.nav-links');
                    if (el) el.innerHTML = json.data.html;
                }
            } catch (e) {
                // silent fallback to built-in links
            }
        })();

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