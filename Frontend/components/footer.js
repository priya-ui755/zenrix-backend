class CustomFooter extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: #1f2937;
                    color: #f3f4f6;
                    padding: 3rem 0;
                    margin-top: 4rem;
                }
                .footer-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 2rem;
                }
                .footer-logo {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 1rem;
                    display: block;
                }
                .footer-links h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: white;
                }
                .footer-links ul {
                    list-style: none;
                    padding: 0;
                }
                .footer-links li {
                    margin-bottom: 0.5rem;
                }
                .footer-links a {
                    color: #d1d5db;
                    text-decoration: none;
                    transition: color 0.3s ease;
                }
                .footer-links a:hover {
                    color: white;
                }
                .social-links {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                .social-links a {
                    color: white;
                    font-size: 1.25rem;
                }
                .copyright {
                    text-align: center;
                    margin-top: 3rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #374151;
                    color: #9ca3af;
                }
            </style>
            <div class="footer-container">
                <div class="footer-about">
                    <a href="/" class="footer-logo">Zenrix</a>
                    <p>One place for all your needs. High quality products at affordable prices.</p>
<div class="social-links">
                        <a href="#"><i class="fab fa-facebook"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="#"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
                <div class="footer-links">
                    <h3>Shop</h3>
                    <ul>
                        <li><a href="/products.html">All Products</a></li>
                        <li><a href="/products.html?category=electronics">Electronics</a></li>
                        <li><a href="/products.html?category=fashion">Fashion</a></li>
                        <li><a href="/products.html?category=home">Home & Kitchen</a></li>
                        <li><a href="/products.html?category=beauty">Beauty</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h3>Help</h3>
                    <ul>
                        <li><a href="/faq.html">FAQ</a></li>
                        <li><a href="/shipping.html">Shipping</a></li>
                        <li><a href="/returns.html">Returns</a></li>
                        <li><a href="/contact.html">Contact Us</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h3>Company</h3>
                    <ul>
                        <li><a href="/about.html">About Us</a></li>
                        <li><a href="/blog.html">Blog</a></li>
                        <li><a href="/careers.html">Careers</a></li>
                        <li><a href="/privacy.html">Privacy Policy</a></li>
                        <li><a href="/terms.html">Terms of Service</a></li>
                    </ul>
                </div>
</div>
            <div class="copyright">
                        &copy; ${new Date().getFullYear()} Zenrix. All rights reserved.
</div>
        `;

        // Replace footer HTML from CMS if available
        (async () => {
            try {
                const API = window.API_URL || (location.origin + '/api');
                const res = await fetch(`${API}/components/slug/footer`);
                const json = await res.json();
                if (json.success && json.data && json.data.html) {
                    // Merge provided footer html into the footer-about container
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(json.data.html, 'text/html');
                    const footerAbout = doc.body.innerHTML;
                    const container = this.shadowRoot.querySelector('.footer-about');
                    if (container) container.innerHTML = footerAbout;
                }
            } catch (e) {
                // ignore - fallback to built-in footer
            }
        })();
    }
}

customElements.define('custom-footer', CustomFooter);