class CustomFooter extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    background: radial-gradient(circle at 12% 10%, rgba(99,102,241,0.18), transparent 32%),
                                radial-gradient(circle at 82% 12%, rgba(16,185,129,0.12), transparent 30%),
                                linear-gradient(150deg, #05070f 0%, #0b1224 45%, #05070f 100%);
                    color: #e5e7eb;
                    padding: 2.4rem 0 2.1rem;
                    margin-top: 2.6rem;
                    overflow: hidden;
                    border-top: 1px solid rgba(255,255,255,0.08);
                }
                :host::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
                    background-size: 24px 24px;
                    opacity: 0.35;
                    pointer-events: none;
                }
                .frame {
                    position: relative;
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 0 1.25rem;
                    z-index: 1;
                }
                .hero-card {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                    background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 14px;
                    padding: 1.1rem 1.1rem;
                    box-shadow: 0 18px 48px rgba(0,0,0,0.34);
                    width: 100%;
                    max-width: 1060px;
                    margin: 0 auto 1.25rem;
                }
                .hero-left {
                    display: grid;
                    gap: 0.75rem;
                }
                .brand {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.65rem;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #f8fafc;
                    text-decoration: none;
                    letter-spacing: 0.01em;
                }
                .orb {
                    width: 12px;
                    height: 12px;
                    border-radius: 999px;
                    background: linear-gradient(135deg, #22d3ee, #6366f1);
                    box-shadow: 0 0 18px rgba(99,102,241,0.6);
                }
                .lede {
                    color: #cbd5e1;
                    line-height: 1.5;
                    max-width: 420px;
                }
                .cta-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.78rem 1.05rem;
                    border-radius: 12px;
                    font-weight: 800;
                    text-decoration: none;
                    border: 1px solid rgba(255,255,255,0.12);
                    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
                }
                .btn.primary {
                    background: linear-gradient(120deg, #22d3ee, #6366f1);
                    color: #04101b;
                }
                .btn.ghost {
                    background: rgba(255,255,255,0.06);
                    color: #e5e7eb;
                }
                .btn:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(99,102,241,0.35); }
                .hero-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
                    gap: 1rem;
                }
                .stat {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                    padding: 1.05rem 1.1rem;
                    border-radius: 14px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: radial-gradient(circle at 20% 20%, rgba(99,102,241,0.16), transparent 45%),
                                radial-gradient(circle at 80% 0%, rgba(34,211,238,0.14), transparent 40%),
                                rgba(255,255,255,0.04);
                    min-height: 135px;
                    align-self: stretch;
                    box-shadow: 0 14px 28px rgba(0,0,0,0.4);
                    overflow: hidden;
                }
                .stat::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.06);
                    pointer-events: none;
                }
                .stat strong { display: block; font-size: 1.3rem; color: #f8fafc; letter-spacing: 0.01em; }
                .stat span {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.32rem 0.6rem;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.07);
                    color: #c7d2fe;
                    font-weight: 800;
                    font-size: 0.92rem;
                    width: fit-content;
                }
                .stat p { margin: 0; margin-top: auto; color: #d1d5db; font-size: 0.97rem; line-height: 1.55; }
                .links-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.4rem;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px;
                    padding: 1.3rem 1.4rem;
                    box-shadow: 0 18px 60px rgba(0,0,0,0.35);
                }
                .column-title {
                    font-size: 1rem;
                    font-weight: 700;
                    margin-bottom: 0.7rem;
                    color: #f8fafc;
                }
                .links-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: grid;
                    gap: 0.45rem;
                }
                .links-list a {
                    color: #cbd5e1;
                    text-decoration: none;
                    font-weight: 600;
                    transition: color 0.18s ease, transform 0.18s ease;
                }
                .links-list a:hover { color: #fff; transform: translateX(2px); }
                .follow {
                    display: grid;
                    gap: 0.6rem;
                }
                .social {
                    display: flex;
                    gap: 0.55rem;
                }
                .social a {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    background: rgba(255,255,255,0.05);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(255,255,255,0.08);
                    color: #e2e8f0;
                    transition: transform 0.18s ease, border 0.18s ease, background 0.18s ease;
                }
                .social a:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.16); transform: translateY(-1px); }
                .support {
                    display: grid;
                    gap: 0.45rem;
                }
                .contact-lines {
                    display: grid;
                    gap: 0.35rem;
                    color: #e5e7eb;
                    font-weight: 600;
                }
                .contact-lines span { color: #a5b4fc; font-weight: 700; }
                .support-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.72rem 1rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.06);
                    color: #e5e7eb;
                    font-weight: 800;
                    cursor: pointer;
                    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
                    width: fit-content;
                }
                .support-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(99,102,241,0.28); background: rgba(255,255,255,0.1); }
                .bottom {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    margin-top: 2.3rem;
                    padding: 0 0.5rem;
                    color: #94a3b8;
                    font-size: 0.94rem;
                }
                .badge-row {
                    display: flex;
                    gap: 0.6rem;
                    flex-wrap: wrap;
                }
                .mini-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.45rem 0.7rem;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(255,255,255,0.04);
                    color: #cbd5e1;
                    font-weight: 600;
                    font-size: 0.87rem;
                }
            </style>
            <div class="frame">
                <div class="hero-card">
                    <div class="hero-left footer-about">
                        <div class="cta-row">
                            <a class="btn primary" href="/products.html">Zenrix</a>
                            <a class="btn ghost" href="/contact.html">Talk to us</a>
                        </div>
                    </div>
                    <div class="hero-stats">
                        <div class="stat"><span>48h</span><strong>Support reply</strong><p>Average response SLA</p></div>
                        <div class="stat"><span>4.8★</span><strong>Product score</strong><p>Across top categories</p></div>
                        <div class="stat"><span>2k+</span><strong>Items stocked</strong><p>Curated, ready to ship</p></div>
                    </div>
                </div>

                <div class="links-grid">
                    <div class="follow">
                        <div class="column-title">Stay close</div>
                        <p class="lede" style="max-width: 320px; margin: 0;">New drops, back-in-stock notes, and launches without the noise.</p>
                        <div class="social">
                            <a href="#" aria-label="Facebook">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 8h-2c-.6 0-1 .4-1 1v2h3l-.4 3H12v7H9v-7H7V11h2V9.2C9 7 10.2 5 13 5h2v3Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </a>
                            <a href="#" aria-label="Twitter">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 5.5a6.9 6.9 0 0 1-2 .55 3.47 3.47 0 0 0 1.52-1.92 6.9 6.9 0 0 1-2.2.84A3.44 3.44 0 0 0 12 7.9a9.77 9.77 0 0 1-7.1-3.6 3.44 3.44 0 0 0 1.07 4.6 3.4 3.4 0 0 1-1.56-.43v.04a3.45 3.45 0 0 0 2.76 3.37 3.43 3.43 0 0 1-1.55.06 3.45 3.45 0 0 0 3.22 2.4A6.9 6.9 0 0 1 3 16.54 9.74 9.74 0 0 0 8.29 18c6.29 0 9.73-5.21 9.73-9.73 0-.15 0-.29-.01-.44A6.95 6.95 0 0 0 21 5.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </a>
                            <a href="#" aria-label="Instagram">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="7" r="0.6" fill="currentColor"/></svg>
                            </a>
                            <a href="#" aria-label="YouTube">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 7.2c-.2-.9-.9-1.6-1.8-1.8C17.2 5 12 5 12 5s-5.2 0-6.7.4c-.9.2-1.6.9-1.8 1.8C3 8.8 3 12 3 12s0 3.2.5 4.8c.2.9.9 1.6 1.8 1.8C6.8 19 12 19 12 19s5.2 0 6.7-.4c.9-.2 1.6-.9 1.8-1.8.5-1.6.5-4.8.5-4.8s0-3.2-.5-4.8Z" stroke="currentColor" stroke-width="1.4"/><path d="m10 9.75 4.5 2.25L10 14.25V9.75Z" fill="currentColor"/></svg>
                            </a>
                        </div>
                    </div>
                    <div>
                        <div class="column-title">Shop</div>
                        <ul class="links-list">
                            <li><a href="/products.html">All Products</a></li>
                            <li><a href="/products.html?category=electronics">Electronics</a></li>
                            <li><a href="/products.html?category=fashion">Fashion</a></li>
                            <li><a href="/products.html?category=home">Home & Kitchen</a></li>
                            <li><a href="/products.html?category=beauty">Beauty</a></li>
                        </ul>
                    </div>
                    <div>
                        <div class="column-title">Company</div>
                        <ul class="links-list">
                            <li><a href="/about.html">About</a></li>
                            <li><a href="/careers.html">Careers</a></li>
                            <li><a href="/blog.html">Blog</a></li>
                            <li><a href="/privacy.html">Privacy</a></li>
                            <li><a href="/terms.html">Terms</a></li>
                        </ul>
                    </div>
                    <div class="support">
                        <div class="column-title">Support</div>
                        <div class="contact-lines">
                            <div><span>Email</span> support@zenrix.com</div>
                            <div><span>Phone</span> +1 (800) 123-4567</div>
                            <div><span>Chat</span> Live chat 9am-9pm</div>
                        </div>
                        <a href="/support.html" class="support-btn" style="text-decoration: none;">Open support</a>
                    </div>
                </div>

                <div class="bottom">
                    <span>&copy; ${new Date().getFullYear()} Zenrix. Built for modern shoppers.</span>
                    <div class="badge-row">
                        <span class="mini-badge">Secure checkout</span>
                        <span class="mini-badge">48h support</span>
                        <span class="mini-badge">Tracked shipping</span>
                    </div>
                </div>
            </div>
        `;

        // Replace footer HTML from CMS if available
        (async () => {
            try {
                const API = window.API_URL || (location.origin + '/api');
                const res = await fetch(`${API}/components/slug/footer`);
                const json = await res.json();
                if (json.success && json.data && json.data.html) {
                    // Merge provided footer html, but keep only the CTA row to avoid showing logo/tagline
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(json.data.html, 'text/html');
                    const container = this.shadowRoot.querySelector('.footer-about');
                    const ctaRow = container?.querySelector('.cta-row');
                    if (container && ctaRow) {
                        container.innerHTML = '';
                        container.appendChild(ctaRow);
                    }
                }
            } catch (e) {
                // ignore - fallback to built-in footer
            }
        })();
    }
}

customElements.define('custom-footer', CustomFooter);