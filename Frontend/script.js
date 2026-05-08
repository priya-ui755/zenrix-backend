// Ensure logout is always available globally
window.logout = logout;
// Simple HTML sanitizer to prevent XSS
function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Remove script and style tags
    const scripts = temp.querySelectorAll('script, style');
    scripts.forEach(el => el.remove());
    // Remove event handlers
    const all = temp.querySelectorAll('*');
    all.forEach(el => {
        for (let attr of el.attributes) {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        }
    });
    return temp.innerHTML;
}
// ==================== LOGOUT (GLOBAL) ====================
function logout() {
    try {
        // Remove both modern and legacy keys to ensure user is fully logged out
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
    } catch (e) {}
    window.location.href = 'index.html';
}
window.logout = logout;
// ==================== ZENRIX E-COMMERCE ====================
// Backend API URL (auto-detect current origin with localhost fallback)
const DEFAULT_API_URL = 'http://localhost:3000/api';
const API_URL = (() => {
    try {
        if (typeof window !== 'undefined' && window.location?.origin) {
            const origin = window.location.origin.replace(/\/$/, '');
            return `${origin}/api`;
        }
    } catch (err) {
        console.warn('Falling back to default API URL:', err.message);
    }
    return DEFAULT_API_URL;
})();

// Allows Admin-edited pages/components to override the support email used by the Contact form.
window.ZENRIX_SUPPORT_EMAIL = window.ZENRIX_SUPPORT_EMAIL || 'support@zenrix.com';
const CART_STORAGE_KEY = 'zenrix_cart';

function normalizeCartItems(items = []) {
    return items.map(item => ({
        ...item,
        key: item.key || `${item.id}__${item.color || 'default'}`
    }));
}

let cart = normalizeCartItems(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]'));
let currentProduct = null;
const productState = {
    quantity: 1,
    selectedColor: null,
    selectedImage: null
};
const saleCountdownRegistry = new Map();
let productCountdownTimer = null;

let heroConfig = null;
let carouselConfig = null;
let heroCarouselIndex = 0;
let heroCarouselTimer = null;

const catalogFilters = {
    products: [],
    container: null,
    category: null,
    sort: 'popular',
    maxPrice: null,
    initialized: false,
    loaded: false,
    userAdjustedPrice: false,
    featuredOnly: false
};

const FALLBACK_PRODUCTS = [
    {
        _id: 'demo-headphones',
        name: 'Studio Wireless ANC',
        price: 18999,
        description: 'Adaptive noise cancellation with 30-hour battery life.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        category: 'electronics',
        featured: true,
        stock: 12,
        rating: 4.8
    },
    {
        _id: 'demo-backpack',
        name: 'Urban Explorer Backpack',
        price: 8899,
        description: 'Weatherproof carry with padded laptop sleeve.',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
        category: 'fashion',
        featured: true,
        stock: 18,
        rating: 4.7
    },
    {
        _id: 'demo-lamp',
        name: 'Minimal Desk Lamp',
        price: 7299,
        description: 'Aluminum lamp with wireless charging base.',
        image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
        category: 'home',
        featured: true,
        stock: 20,
        rating: 4.6
    }
];

const COLOR_LIBRARY = {
    black: '#0f172a',
    midnight: '#0b1120',
    graphite: '#1f2937',
    cobalt: '#2563eb',
    glacier: '#d4d4d8',
    cloud: '#e2e8f0',
    sand: '#f5d0a9',
    emerald: '#10b981',
    lavender: '#c084fc',
    crimson: '#ef4444'
};

const NPR_NUMBER_FORMATTER = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

// ==================== THEME ====================
const THEME_STORAGE_KEY = 'zenrix_theme';

function resolvePreferredTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    // Default to light theme when no stored preference (dark is secondary)
    return 'light';
}

function applyTheme(theme) {
    const next = theme === 'light' ? 'theme-light' : 'theme-dark';
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(next);
    localStorage.setItem(THEME_STORAGE_KEY, theme === 'light' ? 'light' : 'dark');
    try {
        window.dispatchEvent(new CustomEvent('zenrix-theme-changed', { detail: { theme: theme === 'light' ? 'light' : 'dark' } }));
    } catch (err) {
        console.warn('Theme change event failed', err);
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.contains('theme-light');
    applyTheme(isLight ? 'dark' : 'light');
}

// Apply theme ASAP on script load
applyTheme(resolvePreferredTheme());

function formatNpr(amount = 0) {
    const value = Number(amount) || 0;
    return `रु ${NPR_NUMBER_FORMATTER.format(value)}`;
}

function getAuthToken() {
    return localStorage.getItem('userToken');
}

function isLoggedIn() {
    return Boolean(getAuthToken());
}

function readCartFromStorage() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
        cart = normalizeCartItems(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
        console.warn('Failed to parse cart storage', err);
        cart = [];
    }
    return cart;
}

function writeCartToStorage(items) {
    cart = normalizeCartItems(items);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCount();
    try {
        window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
        console.warn('cartUpdated event failed', err);
    }
}

function clearCartStorage() {
    writeCartToStorage([]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Attach logout event handler for CSP compliance
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && typeof logout === 'function') {
        logoutBtn.addEventListener('click', logout);
    }
    readCartFromStorage();
    updateCartCount();
    initProductListingControls();
    
    // Load products based on current page
    if (document.getElementById('productsGrid') || document.getElementById('featuredProducts')) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        catalogFilters.category = category;
        loadProducts(category);
    }
    
    // Load product details if on product page
    if (window.location.pathname.includes('product.html')) {
        loadProductDetails();
    }

    // Load CMS page content if there is a placeholder
    loadPageContent();
    loadHeroContent();

    // When admin updates footer data, ensure Contact page UI reflects it immediately
    const applyFooterDataToContact = (data) => {
        try {
            if (!data) return;
            const phone = (data.supportPhone || '').trim();
            const email = (data.supportEmail || '').trim();

            const heroPhoneLink = document.getElementById('contactHeroPhoneLink');
            if (heroPhoneLink && phone) heroPhoneLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;

            const contactPhoneValue = document.getElementById('contactPhoneValue');
            if (contactPhoneValue && phone) contactPhoneValue.textContent = phone;

            const contactPhoneLink = document.getElementById('contactPhoneLink');
            if (contactPhoneLink && phone) contactPhoneLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;

            const contactHeroPhoneLink = document.getElementById('contactHeroPhoneLink');
            if (contactHeroPhoneLink && phone) contactHeroPhoneLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;

            const contactEmailValue = document.getElementById('contactEmailValue');
            if (contactEmailValue && email) contactEmailValue.textContent = email;

            const contactEmailLink = document.getElementById('contactEmailLink');
            if (contactEmailLink && email) contactEmailLink.href = '#contactMailtoForm';

        } catch (e) { /* ignore */ }
    };

    // Listen for admin-side footer updates
    window.addEventListener('footerDataUpdated', (e) => {
        try { applyFooterDataToContact(e.detail && e.detail.data ? e.detail.data : {}); } catch (e) {}
    });

    window.addEventListener('componentUpdated', (e) => {
        try {
            if (!e.detail || e.detail.slug !== 'footer') return;
            const data = e.detail.data && e.detail.data.data ? e.detail.data.data : {};
            applyFooterDataToContact(data);
        } catch (e) {}
    });

    // Site settings (global) updates should also update contact UI and hero/footer shortcuts
    window.addEventListener('siteSettingsUpdated', (e) => {
        try {
            const s = e.detail || (localStorage.getItem('siteSettings') ? JSON.parse(localStorage.getItem('siteSettings')) : null);
            if (!s) return;
            // Make support email available to other modules
            try { window.ZENRIX_SUPPORT_EMAIL = s.supportEmail || window.ZENRIX_SUPPORT_EMAIL; } catch(e) {}
            // Update contact page items
            try {
                const phone = (s.supportPhone || '').trim();
                const email = (s.supportEmail || '').trim();
                const heroPhoneLink = document.getElementById('contactHeroPhoneLink'); if (heroPhoneLink && phone) heroPhoneLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
                const contactPhoneValue = document.getElementById('contactPhoneValue'); if (contactPhoneValue && phone) contactPhoneValue.textContent = phone;
                const contactPhoneLink = document.getElementById('contactPhoneLink'); if (contactPhoneLink && phone) contactPhoneLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
                const contactEmailValue = document.getElementById('contactEmailValue'); if (contactEmailValue && email) contactEmailValue.textContent = email;
                const contactEmailLink = document.getElementById('contactEmailLink'); if (contactEmailLink && email) contactEmailLink.href = '#contactMailtoForm';
            } catch (ee) { /* ignore */ }
            // Update footer map embed if present
            try { if (s.mapEmbedUrl) { localStorage.setItem('footerMapEmbed', s.mapEmbedUrl); window.dispatchEvent(new CustomEvent('footerMapUpdated', { detail: { mapEmbed: s.mapEmbedUrl } })); } } catch(e) {}
        } catch (e) {}
    });

    window.addEventListener('storage', (e) => {
        try {
            if (!e || !e.key) return;
            if (e.key === 'footerData' && e.newValue) {
                const parsed = JSON.parse(e.newValue);
                applyFooterDataToContact(parsed);
            }
        } catch (e) { /* ignore */ }
    });

    // Apply any existing footerData saved in localStorage (for immediate effect)
    try {
        const existing = localStorage.getItem('footerData');
        if (existing) {
            applyFooterDataToContact(JSON.parse(existing));
        } else {
            // Fallback: fetch current footer component and apply
            (async () => {
                try {
                    const res = await fetch((window.API_URL || '/api') + '/components/slug/footer');
                    const j = await res.json();
                    if (j && j.success && j.data && j.data.data) applyFooterDataToContact(j.data.data);
                } catch (e) { /* ignore */ }
            })();
        }

        // Also load site settings (support email/phone/map/socials) so pages can render dynamic data
        (async () => {
            try {
                const r = await fetch((window.API_URL || '/api') + '/site-settings');
                const sj = await r.json();
                if (sj && sj.success && sj.data) {
                    try { localStorage.setItem('siteSettings', JSON.stringify(sj.data)); } catch(e){}
                    try { window.ZENRIX_SUPPORT_EMAIL = sj.data.supportEmail || window.ZENRIX_SUPPORT_EMAIL; } catch(e){}
                    try { window.dispatchEvent(new CustomEvent('siteSettingsUpdated', { detail: sj.data })); } catch(e){}
                }
            } catch (e) { /* ignore */ }
        })();

    } catch (e) { /* ignore */ }

    // Live updates: listen to server-sent events to receive componentUpdated broadcasts
    (function(){
        try {
            if (typeof EventSource === 'undefined') return;
            const es = new EventSource('/api/updates/stream');
            es.addEventListener('componentUpdated', function(evt){
                try {
                    const payload = JSON.parse(evt.data || '{}');
                    // write structured data to localStorage for other tabs and trigger event
                    try { if (payload && payload.data && payload.data.data) localStorage.setItem('footerData', JSON.stringify(payload.data.data)); } catch(e){}
                    try { window.dispatchEvent(new CustomEvent('componentUpdated', { detail: payload })); } catch(e){}
                } catch(e) { console.warn('SSE parse error', e); }
            });

            // Listen to site settings broadcasts (if admin updates them)
            es.addEventListener('siteSettingsUpdated', function(evt){
                try {
                    const payload = JSON.parse(evt.data || '{}');
                    const s = payload && payload.data ? payload.data : null;
                    if (s) {
                        try { localStorage.setItem('siteSettings', JSON.stringify(s)); } catch(e){}
                        try { window.ZENRIX_SUPPORT_EMAIL = s.supportEmail || window.ZENRIX_SUPPORT_EMAIL; } catch(e){}
                        try { window.dispatchEvent(new CustomEvent('siteSettingsUpdated', { detail: s })); } catch(e){}
                    }
                } catch(e) { console.warn('SSE parse error', e); }
            });
            es.addEventListener('error', function(e){ /* EventSource handles reconnect automatically */ });
        } catch (e) {}
    })();
    
    if (window.location.pathname.includes('cart.html')) {
        initCartPage();
    }

    if (window.location.pathname.includes('checkout.html')) {
        initCheckoutPage();
    }

    // Contact page: clicking the email links should open the on-page form (no mailto app prompt)
    try {
        const form = document.getElementById('contactMailtoForm');
        if (form) {
            const focusTarget = () => {
                const first = document.getElementById('contactName') || document.getElementById('contactSubject');
                if (first && typeof first.focus === 'function') first.focus();
            };
            const scrollToForm = () => {
                try {
                    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (e) {
                    form.scrollIntoView();
                }
                setTimeout(focusTarget, 150);
            };

            const heroEmailLink = document.getElementById('contactHeroEmailLink');
            if (heroEmailLink) {
                heroEmailLink.addEventListener('click', (ev) => {
                    // allow normal anchor behavior too, but ensure smooth scroll + focus
                    ev.preventDefault();
                    scrollToForm();
                    try { window.location.hash = 'contactMailtoForm'; } catch (e) {}
                });
            }

            const contactEmailLink = document.getElementById('contactEmailLink');
            if (contactEmailLink) {
                contactEmailLink.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    scrollToForm();
                    try { window.location.hash = 'contactMailtoForm'; } catch (e) {}
                });
            }
        }
    } catch (e) {}

    // Contact page mailto form (avoid inline onsubmit attribute for CSP)
    const contactMailtoForm = document.getElementById('contactMailtoForm');
    if (contactMailtoForm) {
        const submitBtn = document.getElementById('contactSubmitBtn');
        const statusEl = document.getElementById('contactNoteStatus');

        const setStatus = (msg, type) => {
            if (!statusEl) return;
            statusEl.textContent = msg || '';
            statusEl.classList.remove('hidden', 'text-emerald-200', 'text-rose-200');
            statusEl.classList.add(type === 'success' ? 'text-emerald-200' : 'text-rose-200');
        };

        const clearStatus = () => {
            if (!statusEl) return;
            statusEl.textContent = '';
            statusEl.classList.add('hidden');
            statusEl.classList.remove('text-emerald-200', 'text-rose-200');
        };

        contactMailtoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearStatus();

            const fd = new FormData(contactMailtoForm);
            const name = String(fd.get('name') || '').trim();
            const email = String(fd.get('email') || '').trim();
            const subject = String(fd.get('subject') || '').trim();
            const message = String(fd.get('message') || '').trim();

            if (!subject || !message) {
                setStatus('Please fill in subject and message.', 'error');
                return;
            }

            const token = (() => {
                try { return localStorage.getItem('userToken'); } catch (err) { return null; }
            })();
            const hasAuth = !!token;

            const endpoint = hasAuth ? `${API_URL}/tickets` : `${API_URL}/tickets/guest`;
            const payload = hasAuth
                ? { subject, description: message, category: 'other', priority: 'medium', source: 'api' }
                : { name, email, subject, description: message, category: 'other', priority: 'medium', source: 'api' };

            if (!hasAuth && (!name || !email)) {
                setStatus('Please fill in your name and email.', 'error');
                return;
            }

            const previousBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }

            try {
                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(hasAuth ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(payload)
                });

                let result = null;
                try { result = await resp.json(); } catch (err) { /* ignore */ }

                if (!resp.ok || !result || result.success !== true) {
                    const msg = (result && (result.error || result.message)) || `Failed to submit. (${resp.status})`;
                    setStatus(msg, 'error');
                    return;
                }

                contactMailtoForm.reset();
                setStatus('Thanks! Your message was sent to support as a ticket.', 'success');
            } catch (err) {
                setStatus('Network error. Please try again.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = previousBtnText || 'Send note';
                }
            }
        });
    }

    window.addEventListener('zenrix-theme-toggle', (e) => {
        const desired = e?.detail?.theme;
        if (desired === 'light' || desired === 'dark') {
            applyTheme(desired);
        } else {
            toggleTheme();
        }
    });

    // Star-button click animation: toggle .active briefly so click triggers same visual as hover
    (function bindStarButtons(){
        try {
            document.addEventListener('click', (ev) => {
                const btn = ev.target instanceof Element ? ev.target.closest('.star-btn') : null;
                if (!btn) return;
                // replay animation
                btn.classList.remove('active');
                // force reflow to allow restart
                // eslint-disable-next-line no-unused-expressions
                btn.offsetWidth;
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 700);
            }, { capture: true });
        } catch (err) {
            console.warn('Star button binding failed', err && err.message);
        }
    })();

    // Auto-open chat when URL hash is #chat (contact links point to /index.html#chat)
    try {
        if (window && window.location && window.location.hash === '#chat') {
            setTimeout(() => {
                const toggle = document.querySelector('#chatbot-toggle, #chatbotToggle, .chat-toggle');
                const windowEl = document.querySelector('#chatbot-window, #chatbotWindow, .chat-window');
                if (toggle && windowEl) {
                    try { toggle.click(); } catch (e) { /* ignore */ }
                } else {
                    // If current page doesn't host the chat widget, redirect to index which does
                    const path = window.location.pathname || '';
                    if (!path.endsWith('/index.html') && !path.endsWith('/') && !path.endsWith('/index')) {
                        window.location.href = '/index.html#chat';
                    } else if (!toggle) {
                        // If widget may load later, try again after a delay
                        setTimeout(() => {
                            const t = document.querySelector('#chatbot-toggle, #chatbotToggle, .chat-toggle');
                            if (t) try { t.click(); } catch (e) {}
                        }, 700);
                    }
                }
            }, 200);
        }
    } catch (e) { /* ignore */ }
});

// ==================== PRODUCT FUNCTIONS ====================

// Load products from backend
async function loadProducts(category = null) {
    try {
        const container = document.getElementById('productsGrid') || document.getElementById('featuredProducts');
        if (!container) return;

        catalogFilters.container = container;
        catalogFilters.featuredOnly = container?.id === 'featuredProducts';
        if (category) {
            catalogFilters.category = category;
        }

        const response = await fetch(`${API_URL}/products`);
        const result = await response.json();
        const apiProducts = (result.success && Array.isArray(result.data)) ? result.data : [];
        const dataSource = apiProducts.length ? apiProducts : FALLBACK_PRODUCTS;
        if (!apiProducts.length) {
            console.warn('Product API returned no data. Showing fallback catalog.');
        }

        catalogFilters.products = dataSource;
        catalogFilters.loaded = true;
        syncPriceFilterBounds(dataSource);
        hydrateHeroSpotlight(dataSource);
        applyProductFilters();
    } catch (error) {
        console.log('Using fallback data', error);
        catalogFilters.products = FALLBACK_PRODUCTS;
        catalogFilters.loaded = true;
        hydrateHeroSpotlight(FALLBACK_PRODUCTS);
        applyProductFilters();
    }
}

function initProductListingControls() {
    if (catalogFilters.initialized) return;
    catalogFilters.initialized = true;

    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        catalogFilters.sort = sortSelect.value || catalogFilters.sort;
        sortSelect.addEventListener('change', event => {
            catalogFilters.sort = event.target.value;
            applyProductFilters();
        });
    }

    const priceInput = document.getElementById('priceFilter');
    if (priceInput) {
        const initialValue = Number(priceInput.value);
        if (Number.isFinite(initialValue)) {
            catalogFilters.maxPrice = initialValue;
            updatePriceFilterLabel(initialValue);
        }
        priceInput.addEventListener('input', event => {
            const selected = Number(event.target.value);
            catalogFilters.userAdjustedPrice = true;
            catalogFilters.maxPrice = Number.isFinite(selected) ? selected : null;
            updatePriceFilterLabel(selected);
            applyProductFilters();
        });
    }
}

function syncPriceFilterBounds(products) {
    const priceInput = document.getElementById('priceFilter');
    if (!priceInput || !Array.isArray(products) || !products.length) return;

    const highestPrice = Math.max(...products.map(product => getEffectivePrice(product)));
    if (!Number.isFinite(highestPrice) || highestPrice <= 0) {
        updatePriceFilterLabel(priceInput.value);
        return;
    }

    const defaultMax = Number(priceInput.dataset.defaultMax || priceInput.max) || 1000;
    const paddedMax = Math.ceil(highestPrice / 500) * 500;
    const resolvedMax = Math.max(defaultMax, paddedMax);

    priceInput.max = resolvedMax;
    if (!catalogFilters.userAdjustedPrice) {
        catalogFilters.maxPrice = resolvedMax;
        priceInput.value = resolvedMax;
    } else if (!Number.isFinite(catalogFilters.maxPrice) || catalogFilters.maxPrice > resolvedMax) {
        catalogFilters.maxPrice = resolvedMax;
        priceInput.value = resolvedMax;
    } else {
        priceInput.value = catalogFilters.maxPrice;
    }

    updatePriceFilterLabel(catalogFilters.maxPrice);
}

function updatePriceFilterLabel(value) {
    const label = document.getElementById('priceFilterValue');
    if (!label) return;
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
    label.textContent = formatNpr(safeValue);
}

function applyProductFilters() {
    const container = catalogFilters.container;
    if (!container || !catalogFilters.loaded) return;

    let products = Array.isArray(catalogFilters.products) ? [...catalogFilters.products] : [];

    if (catalogFilters.category) {
        const targetCategory = catalogFilters.category.toLowerCase();
        if (targetCategory === 'sale') {
            products = products.filter(isSaleActive);
        } else {
            products = products.filter(product => (product.category || '').toLowerCase() === targetCategory);
        }
    }

    if (catalogFilters.featuredOnly) {
        products = products.filter(product => product.featured);
    }

    if (Number.isFinite(catalogFilters.maxPrice)) {
        products = products.filter(product => getEffectivePrice(product) <= catalogFilters.maxPrice);
    }

    products = sortCatalogProducts(products, catalogFilters.sort);

    if (!products.length) {
        const fallbackMsg = catalogFilters.featuredOnly
            ? 'No featured products are live right now. Visit the Products page to browse everything.'
            : 'No products match the selected filters.';
        showProductFallback(container, fallbackMsg);
        return;
    }

    displayProducts(products, container);
}

function sortCatalogProducts(products, sortKey = 'popular') {
    switch (sortKey) {
        case 'price-low':
            return [...products].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        case 'price-high':
            return [...products].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        case 'rating':
            return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'newest': {
            return [...products].sort((a, b) => {
                const newer = new Date(b.createdAt || 0).getTime();
                const older = new Date(a.createdAt || 0).getTime();
                return newer - older;
            });
        }
        default:
            return products;
    }
}

function getNumericPrice(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function isSaleActive(product) {
    const sale = getNumericPrice(product?.salePrice);
    return Boolean(product?.onSale) && sale > 0;
}

function getEffectivePrice(product) {
    const sale = getNumericPrice(product?.salePrice);
    if (isSaleActive(product)) return sale;
    return getNumericPrice(product?.price);
}

function showProductFallback(container, message) {
    if (!container) return;
    container.innerHTML = `
        <div class="col-span-full bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
            ${message}
        </div>
    `;
}

function hydrateHeroSpotlight(products = []) {
    const container = document.getElementById('heroProductShowcase');
    if (!container) return;
    const featuredList = Array.isArray(products) ? products.filter(product => product.featured) : [];
    const shortlistSource = featuredList.length ? featuredList : products;
    const shortlist = (Array.isArray(shortlistSource) ? shortlistSource : []).slice(0, 3);
    if (!shortlist.length) {
        container.innerHTML = `
            <div class="rounded-2xl bg-white/10 p-4 border border-white/20">
                <p class="text-sm text-white/70">Add products from the admin dashboard to highlight them here.</p>
            </div>
        `;
        hydrateSpotlightBundle([]);
        return;
    }

    container.innerHTML = shortlist.map(product => {
        const image = product.image || '/assets/placeholder.svg';
        const saleActive = isSaleActive(product);
        const effectivePrice = getEffectivePrice(product);
        const priceTag = saleActive
            ? `<span class="text-sm text-emerald-200 flex items-center gap-2">${formatNpr(effectivePrice)}<span class="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-100 border border-rose-500/30">${product.saleLabel || 'On Sale'}</span></span>`
            : `<span class="text-sm text-emerald-200">${formatNpr(effectivePrice)}</span>`;
        return `
            <article class="rounded-2xl bg-white/10 border border-white/20 p-4 flex items-center gap-4">
                <div class="w-16 h-16 rounded-xl overflow-hidden bg-white/20 flex-shrink-0">
                    <img src="${image}" alt="${product.name}" class="w-full h-full object-cover" loading="lazy">
                </div>
                <div class="flex-1">
                    <p class="text-xs uppercase tracking-wide text-white/60">Featured pick</p>
                    <h3 class="text-white font-semibold">${product.name}</h3>
                    ${priceTag}
                </div>
                <a href="product.html?id=${product._id || ''}" class="text-sm font-semibold text-indigo-100 hover:text-white">View</a>
            </article>
        `;
    }).join('');

    hydrateSpotlightBundle(products);
}

function hydrateSpotlightBundle(products = []) {
    const listEl = document.getElementById('spotlightBundleList');
    if (!listEl) return;

    const priceEl = document.getElementById('spotlightBundlePrice');
    const metaEl = document.getElementById('spotlightBundleMeta');
    const titleEl = document.getElementById('spotlightBundleTitle');
    const copyEl = document.getElementById('spotlightBundleCopy');
    const ctaEl = document.getElementById('spotlightBundleCta');

    const hero = typeof heroConfig === 'object' ? heroConfig : null;
    if (hero) {
        if (hero.spotlightTitle && titleEl) titleEl.textContent = hero.spotlightTitle;
        if (hero.spotlightCopy && copyEl) copyEl.textContent = hero.spotlightCopy;
        if (hero.spotlightMeta && metaEl) metaEl.textContent = hero.spotlightMeta;
        if (Number.isFinite(Number(hero.spotlightPrice)) && priceEl) priceEl.textContent = formatNpr(Number(hero.spotlightPrice));
        if (hero.spotlightCtaText && ctaEl) ctaEl.textContent = hero.spotlightCtaText;
        if (hero.spotlightCtaLink && ctaEl) ctaEl.href = hero.spotlightCtaLink;
    }

    const pool = Array.isArray(products) ? products : [];
    const featured = pool.filter(product => product.featured);
    const bundleItems = (featured.length ? featured : pool).slice(0, 3);

    const configuredItems = Array.isArray(hero?.spotlightItems) ? hero.spotlightItems.filter(Boolean) : [];
    if (configuredItems.length) {
        listEl.innerHTML = configuredItems.map(formatSpotlightLine).join('');
        if (priceEl && Number.isFinite(Number(hero?.spotlightPrice))) {
            priceEl.textContent = formatNpr(Number(hero.spotlightPrice));
        }
        if (metaEl && hero?.spotlightMeta) {
            metaEl.textContent = hero.spotlightMeta;
        }
        return;
    }

    if (!bundleItems.length) {
        listEl.innerHTML = `
            <li class="flex items-center gap-3 p-3">
                <div class="w-12 h-12 rounded-2xl bg-gray-100"></div>
                <div>
                    <p class="text-sm font-semibold text-gray-600">No bundle yet</p>
                    <p class="text-xs text-gray-500">Add products from admin to spotlight picks.</p>
                </div>
            </li>
        `;
        if (priceEl) priceEl.textContent = formatNpr(0);
        if (metaEl) metaEl.textContent = 'Waiting for featured products';
        if (titleEl) titleEl.textContent = 'Spotlight bundle';
        if (copyEl) copyEl.textContent = 'Publish at least one featured product to see it here.';
        if (ctaEl) {
            ctaEl.href = 'products.html';
            ctaEl.textContent = 'Browse catalog';
        }
        return;
    }

    const categoryLabels = [...new Set(bundleItems.map(item => (item.category || 'Essentials').toLowerCase()))]
        .map(label => label.charAt(0).toUpperCase() + label.slice(1));
    const categorySummary = categoryLabels.slice(0, 2).join(' • ');

    listEl.innerHTML = bundleItems.map(item => {
        const image = item.image || '/assets/placeholder.svg';
        const category = (item.category || 'Essentials').replace(/\b\w/g, char => char.toUpperCase());
        return `
            <li class="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
                <div class="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src="${image}" alt="${item.name}" class="w-full h-full object-cover" loading="lazy">
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-900 line-clamp-1">${item.name}</p>
                    <p class="text-xs text-gray-500">${formatNpr(item.price)} • ${category}</p>
                </div>
            </li>
        `;
    }).join('');

    const total = bundleItems.reduce((sum, item) => sum + getNumericPrice(item.price), 0);
    if (priceEl) priceEl.textContent = formatNpr(total);
    if (metaEl) metaEl.textContent = `Includes ${bundleItems.length} picks${categorySummary ? ` • ${categorySummary}` : ''}`;
    if (titleEl) titleEl.textContent = bundleItems.length >= 3 ? 'Spotlight Weekend Bundle' : 'Spotlight Picks';
    if (copyEl) copyEl.textContent = `Hand matched ${categorySummary || 'everyday'} essentials built to layer together.`;
    if (ctaEl) {
        const first = bundleItems[0];
        if (first && first._id) {
            ctaEl.href = `product.html?id=${first._id}`;
        } else {
            ctaEl.href = 'products.html';
        }
        ctaEl.textContent = 'Shop bundle';
    }
}

function formatSpotlightLine(raw = '') {
    const text = String(raw).trim();
    const parts = text.split(/—|-/).map(p => p.trim()).filter(Boolean);
    const hasMeta = parts.length >= 3;
    const [section, name, price] = hasMeta ? parts : [null, text, null];
    const sectionLabel = section || 'Bundle pick';
    const priceLabel = price ? price : '';

    return `
        <li class="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
            <div class="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0"></div>
            <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900 line-clamp-1">${name || text}</p>
                <p class="text-xs text-gray-500">${sectionLabel}${priceLabel ? ` • ${priceLabel}` : ''}</p>
            </div>
        </li>
    `;
}

function renderSpotlightImage(hero) {
    const spotlightImgEl = document.getElementById('spotlightBundleImage');
    if (!spotlightImgEl) return;
    if (hero?.spotlightImage) {
        spotlightImgEl.classList.remove('hidden');
        spotlightImgEl.style.backgroundImage = `url(${hero.spotlightImage})`;
    } else {
        spotlightImgEl.classList.add('hidden');
        spotlightImgEl.style.backgroundImage = '';
    }
}
// Display products
function displayProducts(products, container) {
    container.innerHTML = products.map(product => {
        const saleActive = isSaleActive(product);
        const effectivePrice = getEffectivePrice(product);
        const imageSrc = product.image || (Array.isArray(product.images) && product.images[0]) || '/assets/placeholder.svg';
        const saleEndTs = product?.saleEnd ? new Date(product.saleEnd).getTime() : null;
        const showCountdown = saleActive && saleEndTs && saleEndTs > Date.now();
        const badge = saleActive
            ? `<span class="pill pill-rose">${product.saleLabel || 'On Sale'}</span>`
            : (product.featured ? '<span class="pill">Featured</span>' : '');
        const priceBlock = saleActive ? `
            <div class="price-stack">
                <span class="product-price">${formatNpr(effectivePrice)}</span>
                <span class="product-price-old">${formatNpr(product.price)}</span>
            </div>
        ` : `<span class="product-price">${formatNpr(effectivePrice)}</span>`;

        return `
        <article class="product-card">
            <a href="product.html?id=${product._id}" class="block h-full">
                <div class="product-media">
                    <img src="${imageSrc}" alt="${product.name}" loading="lazy">
                    <div class="product-media-glow"></div>
                    ${badge ? `<div class="product-badge">${badge}</div>` : ''}
                </div>
                <div class="product-body">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <p class="product-kicker">${(product.category || 'Curated').toUpperCase()}</p>
                            <h3 class="product-title">${product.name}</h3>
                        </div>
                        <div class="product-rating">${getStarRating(product.rating)}</div>
                    </div>
                    <p class="product-desc">${(product.description || '').slice(0, 96)}${(product.description || '').length > 96 ? '…' : ''}</p>
                    ${showCountdown ? `<p class="text-xs text-emerald-400 mt-2" data-sale-countdown="${product._id}">⏱️ Loading...</p>` : ''}
                    <div class="pt-2">
                        ${priceBlock}
                    </div>
                    <span class="pill ghost">${product.stock > 0 ? 'In stock' : 'Back soon'}</span>
                </div>
            </a>
        </article>
        `;
    }).join('');
    startSaleCountdowns(products);
}

function startSaleCountdowns(products = []) {
    if (saleCountdownRegistry.size > 0) {
        saleCountdownRegistry.clear();
    }
    if (productCountdownTimer) {
        clearInterval(productCountdownTimer);
        productCountdownTimer = null;
    }

    const lookup = {};
    products.forEach(p => {
        const key = p?._id;
        const endDate = p?.saleEnd ? new Date(p.saleEnd).getTime() : null;
        if (key && endDate && !isNaN(endDate) && endDate > Date.now()) {
            lookup[key] = endDate;
            saleCountdownRegistry.set(key, endDate);
        }
    });

    const elements = Array.from(document.querySelectorAll('[data-sale-countdown]'));
    if (!elements.length) return;

    const render = () => {
        elements.forEach(el => {
            const id = el.getAttribute('data-sale-countdown');
            const end = lookup[id];
            if (!end) {
                el.textContent = '';
                return;
            }
            const diff = end - Date.now();
            if (diff <= 0) {
                el.textContent = '⏱️ Sale ended';
                el.classList.add('text-rose-400');
                return;
            }
            const totalSeconds = Math.floor(diff / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const dayPrefix = days > 0 ? `${days}d ` : '';
            el.textContent = `⏱️ Sale ends in ${dayPrefix}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        });
    };

    render();
    productCountdownTimer = setInterval(render, 1000);
}

// Load single product details
async function loadProductDetails() {
    const productId = new URLSearchParams(window.location.search).get('id');
    let product = null;

    if (productId) {
        product = await fetchProductById(productId);
    } else {
        console.warn('No product id supplied, falling back to featured item');
        product = await fetchFeaturedProduct();
    }

    if (!product) {
        console.warn('Falling back to demo product data');
        product = getDemoProduct();
    }

    hydrateProduct(product);
}

async function fetchProductById(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.log('Error fetching product by id:', error);
        return null;
    }
}

async function fetchFeaturedProduct() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const result = await response.json();
        if (result.success && Array.isArray(result.data) && result.data.length) {
            return result.data[0];
        }
    } catch (error) {
        console.log('Error loading featured product:', error);
    }
    return null;
}

function hydrateProduct(product) {
    if (!product) return;
    currentProduct = product;
    const name = product.name || 'Zenrix Product';
    const priceValue = getNumericPrice(product.price) || 99.99;
    const saleActive = isSaleActive(product);
    const effectivePrice = getEffectivePrice(product) || priceValue;

    document.title = `${name} | Zenrix`;

    const titleEl = document.getElementById('productTitle');
    if (titleEl) titleEl.textContent = name;

    const priceEl = document.getElementById('productPrice');
    if (priceEl) {
        const saleEndTs = product?.saleEnd ? new Date(product.saleEnd).getTime() : null;
        const showCountdown = saleActive && saleEndTs && saleEndTs > Date.now();
        if (saleActive) {
            priceEl.innerHTML = `
                <div class="flex items-center gap-3 flex-wrap">
                    <span class="text-4xl font-semibold text-white tracking-tight">${formatNpr(effectivePrice)}</span>
                    <span class="text-lg line-through text-slate-500">${formatNpr(priceValue)}</span>
                    <span class="sale-pill">${product.saleLabel || 'On Sale'}</span>
                </div>
                ${showCountdown ? `<p class="text-sm text-emerald-400 mt-3" data-sale-countdown="${product._id}">⏱️ Loading...</p>` : ''}
            `;
        } else {
            priceEl.textContent = formatNpr(effectivePrice);
        }
    }

    setProductRating(product.rating || 4.8, product.reviewCount || 42);
    if (saleActive && product.saleEnd) {
        startSaleCountdowns([product]);
    }
    renderProductGallery(product);
    renderColorOptions(product);
    setupQuantityControls(product);
    hydrateHighlights(product);
    bindPurchaseButtons(product);
    updateStockBadge(product);
}

function getDemoProduct() {
    return {
        _id: 'demo-product',
        name: 'Zenrix Studio Headphones',
        price: 129.99,
        description: 'Signature adaptive sound, obsidian acoustic mesh, and sculpted memory-foam cushions built for marathon listening sessions.',
        stock: 12,
        rating: 4.9,
        reviewCount: 64,
        image: 'https://images.unsplash.com/photo-1518443757220-aee51611a37e?auto=format&fit=crop&w=1200&q=80',
        images: [
            'https://images.unsplash.com/photo-1518443757220-aee51611a37e?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=800&q=80'
        ],
        colors: ['Onyx', 'Cobalt', 'Cloud']
    };
}

function renderProductGallery(product) {
    const mainImage = document.getElementById('mainProductImage');
    const thumbContainer = document.getElementById('productThumbnails');
    if (!mainImage || !thumbContainer) return;

    const sources = getGallerySources(product);
    productState.selectedImage = sources[0];
    mainImage.src = productState.selectedImage;

    thumbContainer.innerHTML = sources.map((src, index) => `
        <button type="button" class="gallery-thumb ${src === productState.selectedImage ? 'is-active' : ''}" data-image="${src}" aria-label="Show image ${index + 1}">
            <img src="${src}" alt="Product thumbnail ${index + 1}" class="h-20 w-full object-cover rounded-2xl" />
        </button>
    `).join('');

    thumbContainer.querySelectorAll('button[data-image]').forEach(button => {
        button.addEventListener('click', () => {
            productState.selectedImage = button.getAttribute('data-image');
            mainImage.src = productState.selectedImage;
            thumbContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('is-active'));
            button.classList.add('is-active');
        });
    });
}

function getGallerySources(product) {
    const gallery = Array.isArray(product.images) ? product.images : [];
    const baseImage = product.image ? [product.image] : [];
    const combined = [...baseImage, ...gallery].filter(Boolean);
    if (!combined.length) {
        combined.push('/assets/placeholder.svg');
    }
    return [...new Set(combined)];
}

function renderColorOptions(product) {
    const container = document.getElementById('colorOptions');
    if (!container) return;
    const paletteSource = Array.isArray(product.colors) && product.colors.length
        ? product.colors
        : (Array.isArray(product.colorOptions) && product.colorOptions.length ? product.colorOptions : ['Onyx', 'Glacier', 'Cobalt']);
    const colors = paletteSource
        .map(color => (typeof color === 'string' ? color : color?.label))
        .filter(Boolean);
    const selections = colors.length ? colors : ['Onyx', 'Glacier', 'Cobalt'];
    productState.selectedColor = selections[0];

    container.innerHTML = selections.map(color => {
        const normalized = color.toLowerCase();
        const swatch = COLOR_LIBRARY[normalized] || COLOR_LIBRARY.black;
        return `
            <button type="button" class="color-swatch ${color === productState.selectedColor ? 'is-active' : ''}" data-color="${color}" aria-label="Select ${color}" style="--swatch:${swatch};">
                <span>${color}</span>
            </button>
        `;
    }).join('');

    container.querySelectorAll('.color-swatch').forEach(button => {
        button.addEventListener('click', () => {
            productState.selectedColor = button.getAttribute('data-color');
            container.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('is-active'));
            button.classList.add('is-active');
        });
    });
}

function setupQuantityControls(product) {
    productState.quantity = 1;
    const qtyValue = document.getElementById('qtyValue');
    const decBtn = document.getElementById('qtyDecrease');
    const incBtn = document.getElementById('qtyIncrease');
    if (!qtyValue || !decBtn || !incBtn) return;
    const maxStock = typeof product.stock === 'number' && product.stock > 0 ? product.stock : 99;

    const syncQty = () => {
        qtyValue.textContent = productState.quantity;
    };

    decBtn.onclick = () => {
        if (productState.quantity > 1) {
            productState.quantity -= 1;
            syncQty();
        }
    };

    incBtn.onclick = () => {
        if (productState.quantity < maxStock) {
            productState.quantity += 1;
            syncQty();
        }
    };

    syncQty();
}

function bindPurchaseButtons(product) {
    const addBtn = document.getElementById('addToCart');
    const buyBtn = document.getElementById('buyNow');
    if (addBtn) {
        addBtn.onclick = () => handleCartAction(product, productState.quantity);
    }
    if (buyBtn) {
        buyBtn.onclick = () => {
            handleCartAction(product, productState.quantity);
            window.location.href = 'cart.html';
        };
    }
}

function handleCartAction(product, quantity) {
    if (!product) return;
    const productId = product._id || product.id || 'demo-product';
    const fallbackImage = getGallerySources(product)[0];
    const effectivePrice = getEffectivePrice(product) || 0;
    addToCart({
        id: productId,
        name: product.name || 'Zenrix Product',
        price: effectivePrice || 99.99,
        image: productState.selectedImage || product.image || fallbackImage,
        color: productState.selectedColor
    }, quantity);
}

function hydrateHighlights(product) {
    const list = document.getElementById('productHighlights');
    if (!list) return;
    const sourceText = product.description || product.longDescription || '';
    let sentences = sourceText
        .split(/\.|\n/)
        .map(text => text.trim())
        .filter(Boolean)
        .slice(0, 3);
    if (!sentences.length) {
        sentences = [
            'Adaptive noise architecture isolates every detail.',
            'Ultra-soft memory foam cushions stay cool for marathon sessions.',
            'Seamless dual-device pairing keeps you in flow.'
        ];
    }
    const accent = ['#34d399', '#38bdf8', '#f472b6'];
    if (sentences.length) {
        list.innerHTML = sentences.map((text, index) => `
            <li class="flex items-start gap-3">
                <span class="mt-1 h-2 w-2 rounded-full" style="background:${accent[index % accent.length]};"></span>
                ${text}${text.endsWith('.') ? '' : '.'}
            </li>
        `).join('');
    }
}

function setProductRating(rating = 4.5, reviewCount = 0) {
    const ratingContainer = document.getElementById('ratingStars');
    const reviewEl = document.getElementById('reviewCount');
    if (ratingContainer) {
        ratingContainer.innerHTML = getStarRating(rating);
    }
    if (reviewEl) {
        reviewEl.textContent = `${reviewCount} review${reviewCount === 1 ? '' : 's'}`;
    }
}

function updateStockBadge(product) {
    const badge = document.getElementById('stockBadge');
    if (!badge) return;
    if (product.stock <= 0) {
        badge.textContent = 'Out of stock';
        badge.classList.add('text-red-400');
    } else if (product.stock < 5) {
        badge.textContent = `Only ${product.stock} left`;
        badge.classList.add('text-amber-300');
    } else {
        badge.textContent = 'In stock';
        badge.classList.remove('text-red-400', 'text-amber-300');
    }
}

// Load CMS page content (generic)
async function loadPageContent() {
    let slug = '';
    try {
        const container = document.getElementById('pageContent');
        if (!container) return; // not a CMS page

        // derive slug from URL (e.g., about.html -> about)
        slug = window.location.pathname.split('/').pop() || '';
        slug = slug.replace('.html','') || 'index';

        // Home page uses the Hero section; avoid rendering CMS page content here.
        if (slug === 'index') {
            container.remove();
            return;
        }

        // Product listing page is not a CMS page; remove the placeholder without calling the CMS API.
        if (slug === 'products') {
            container.remove();
            return;
        }

        const res = await fetch(`${API_URL}/pages/slug/${slug}`);
        const json = await res.json();
        if (json.success && json.data) {
            const page = json.data;
            document.title = `${page.title} | Zenrix`;

            const sanitized = sanitizeHtml(page.content) || '';
            container.innerHTML = sanitized || '<p class="text-gray-600">No content yet.</p>';

            // If this is the Contact page, derive support email from CMS content so updates reflect
            // in the mailto form helper + submit behavior, and also update the visible
            // Contact sections (email/phone/address) on contact.html.
            if (slug === 'contact') {
                try {
                    const temp = document.createElement('div');
                    temp.innerHTML = sanitized;

                    // If the CMS content includes mailto: links, rewrite them to jump to the
                    // on-page "Send a note" form (avoids OS email-app chooser prompts).
                    try {
                        const mailtoLinks = container.querySelectorAll('a[href^="mailto:"]');
                        mailtoLinks.forEach(a => a.setAttribute('href', '#contactMailtoForm'));
                    } catch (e) {}

                    const mailto = temp.querySelector('a[href^="mailto:"]');
                    let email = '';
                    if (mailto) {
                        const href = mailto.getAttribute('href') || '';
                        email = href.replace(/^mailto:/i, '').split('?')[0].trim();
                    }

                    if (!email) {
                        const text = (temp.textContent || '').trim();
                        const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}\b/i);
                        email = match ? match[0] : '';
                    }

                    if (email) {
                        email = String(email).trim().replace(/[),.;:!?]+$/g, '');
                    }

                    if (email) {
                        window.ZENRIX_SUPPORT_EMAIL = email;
                        const emailTextEl = document.getElementById('supportEmailText');
                        if (emailTextEl) emailTextEl.textContent = email;

                        const heroEmailLink = document.getElementById('contactHeroEmailLink');
                        if (heroEmailLink) heroEmailLink.href = '#contactMailtoForm';

                        const contactEmailValue = document.getElementById('contactEmailValue');
                        if (contactEmailValue) contactEmailValue.textContent = email;

                        const contactEmailLink = document.getElementById('contactEmailLink');
                        if (contactEmailLink) contactEmailLink.href = '#contactMailtoForm';
                    }

                    // Phone (prefer explicit tel: links)
                    let phoneDisplay = '';
                    let phoneTel = '';
                    const telLink = temp.querySelector('a[href^="tel:"]');
                    if (telLink) {
                        const href = (telLink.getAttribute('href') || '').trim();
                        phoneTel = href.replace(/^tel:/i, '').trim();
                        phoneDisplay = phoneTel;
                    }
                    if (!phoneTel) {
                        const text = (temp.textContent || '').replace(/\s+/g, ' ').trim();
                        // Match common phone patterns including country code.
                        const match = text.match(/\+?\d[\d\s().-]{7,}\d/);
                        if (match) {
                            phoneDisplay = match[0].trim();
                            phoneTel = phoneDisplay.replace(/[^+\d]/g, '');
                        }
                    }

                    if (phoneTel) {
                        const heroPhoneLink = document.getElementById('contactHeroPhoneLink');
                        if (heroPhoneLink) heroPhoneLink.href = `tel:${phoneTel}`;

                        const contactPhoneValue = document.getElementById('contactPhoneValue');
                        if (contactPhoneValue) contactPhoneValue.textContent = phoneDisplay || phoneTel;

                        const contactPhoneLink = document.getElementById('contactPhoneLink');
                        if (contactPhoneLink) contactPhoneLink.href = `tel:${phoneTel}`;
                    }

                    // Address (prefer a dedicated element; fallback to "Address:" label in text)
                    let address = '';
                    const addressEl = temp.querySelector('[data-contact-address], .contact-address');
                    if (addressEl) {
                        address = (addressEl.textContent || '').trim();
                    }
                    if (!address) {
                        const text = (temp.textContent || '').replace(/\s+/g, ' ').trim();
                        const match = text.match(/Address\s*:\s*(.+)$/i);
                        if (match) address = (match[1] || '').trim();
                    }

                    if (address) {
                        const contactAddressValue = document.getElementById('contactAddressValue');
                        if (contactAddressValue) contactAddressValue.textContent = address;

                        const contactAddressLink = document.getElementById('contactAddressLink');
                        if (contactAddressLink) {
                            // If CMS provides a maps link, use it; otherwise build a query.
                            const mapsLink = temp.querySelector('a[href*="maps.google"], a[href*="google.com/maps"]');
                            if (mapsLink) {
                                contactAddressLink.href = mapsLink.getAttribute('href') || contactAddressLink.href;
                            } else {
                                contactAddressLink.href = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
                            }
                        }
                    }

                    // If admin set a dedicated map embed in page meta, prefer that for footer and contact link
                    try {
                        const mapEmbed = page.meta && page.meta.mapEmbed ? page.meta.mapEmbed : '';
                        if (mapEmbed) {
                            const contactAddressLink = document.getElementById('contactAddressLink');
                            if (contactAddressLink) {
                                let mapsHref = mapEmbed;
                                // Normalize embed URL to a clickable maps URL
                                if (mapEmbed.includes('output=embed')) {
                                    mapsHref = mapEmbed.replace(/&?output=embed\b/, '');
                                } else if (mapEmbed.includes('/maps/embed')) {
                                    mapsHref = mapEmbed.replace('/maps/embed', '/maps').replace('/embed?', '/?');
                                }
                                // If it's still an embed-like URL with ?q=, remove output=embed if present
                                contactAddressLink.href = mapsHref;
                            }
                            try {
                                localStorage.setItem('footerMapEmbed', mapEmbed);
                                window.dispatchEvent(new CustomEvent('footerMapUpdated', { detail: { mapEmbed } }));
                            } catch (e) { /* ignore */ }
                        }
                    } catch (e) {}

                    // Prefer the footer's map URL when available in localStorage (ensures contact link opens same map)
                    try {
                        const footerMap = localStorage.getItem('footerMapEmbed');
                        if (footerMap) {
                            const contactAddressLink = document.getElementById('contactAddressLink');
                            if (contactAddressLink) {
                                let mapsHref = footerMap;
                                if (footerMap.includes('output=embed')) mapsHref = footerMap.replace(/&?output=embed\b/, '');
                                else if (footerMap.includes('/maps/embed')) mapsHref = footerMap.replace('/maps/embed', '/maps').replace('/embed?', '/?');
                                contactAddressLink.href = mapsHref;
                            }
                        }
                    } catch (e) { /* ignore */ }

                } catch (e) {
                    // ignore
                }
            }
            return;
        }
        if (slug === 'index') {
            container.remove();
        } else {
            container.innerHTML = '<p class="text-gray-600">Content not found. Please add this page from the Admin Dashboard.</p>';
        }
    } catch (err) {
        const container = document.getElementById('pageContent');
        if (!container) return;
        if (slug === 'index') {
            container.remove();
        } else {
            container.innerHTML = `<p class="text-red-600">Failed to load page: ${err.message}</p>`;
        }
    }
}

async function loadHeroContent() {
    const heroSectionEl = document.getElementById('heroSection');
    const carouselSectionEl = document.getElementById('heroCarouselSection');
    const heroTitleEl = document.getElementById('heroTitle');
    const heroSubtitleEl = document.getElementById('heroSubtitle');
    const heroCtaEl = document.getElementById('heroPrimaryCta');
    const heroBgEl = document.getElementById('heroBackgroundImage');
    const heroBadgeEl = document.getElementById('heroBadgeText');
    const spotlightImgEl = document.getElementById('spotlightBundleImage');
    if (!heroSectionEl && !carouselSectionEl && !heroTitleEl && !heroSubtitleEl && !heroCtaEl && !heroBgEl) return;

    try {
        const response = await fetch(`${API_URL}/hero`);
        const result = await response.json();
        if (!result.success || !result.data) return;

        const hero = result.data;
        heroConfig = hero;

        const heroEnabled = hero && hero.enabled !== false;
        console.log('🎬 Hero Config:', { heroEnabled, enabled: hero.enabled });
        if (heroSectionEl) {
            heroSectionEl.classList.toggle('hidden', !heroEnabled);
            console.log('👁️ Hero Section visibility toggled:', heroSectionEl.classList.contains('hidden') ? 'hidden' : 'visible');
        }
        if (carouselSectionEl) {
            carouselSectionEl.classList.toggle('carousel-hidden', heroEnabled);
            if (!heroEnabled) {
                carouselSectionEl.style.display = 'block';
                carouselSectionEl.style.visibility = 'visible';
                carouselSectionEl.style.opacity = '1';
                carouselSectionEl.classList.remove('hidden');
            }
            console.log('🎠 Carousel Section:', {
                visible: !carouselSectionEl.classList.contains('carousel-hidden'),
                classList: carouselSectionEl.className,
                display: carouselSectionEl.style.display,
                computed: window.getComputedStyle(carouselSectionEl).display
            });
        }
        if (hero.title && heroTitleEl) {
            heroTitleEl.textContent = hero.title;
        }
        if (hero.subtitle && heroSubtitleEl) {
            heroSubtitleEl.textContent = hero.subtitle;
        }
        if (hero.badgeText && heroBadgeEl) {
            heroBadgeEl.textContent = hero.badgeText;
        }
        if (hero.ctaText && heroCtaEl) {
            heroCtaEl.textContent = hero.ctaText;
        }
        if (hero.ctaLink && heroCtaEl) {
            heroCtaEl.href = hero.ctaLink;
        }
        if (hero.backgroundImage && heroBgEl) {
            heroBgEl.style.backgroundImage = `linear-gradient(120deg, rgba(15,23,42,0.8), rgba(49,46,129,0.6)), url(${hero.backgroundImage})`;
            heroBgEl.classList.remove('hidden');
        } else if (heroBgEl) {
            heroBgEl.style.backgroundImage = '';
            heroBgEl.classList.add('hidden');
        }

        if (spotlightImgEl) {
            renderSpotlightImage(hero);
        }

        // Apply spotlight overrides if provided
        hydrateSpotlightBundle();

        // If hero is disabled, render the fallback carousel.
        if (!heroEnabled) {
            await loadHeroCarouselContent();
        }
    } catch (error) {
        console.warn('Failed to load hero content', error);
    }
}

async function loadHeroCarouselContent() {
    const carouselSectionEl = document.getElementById('heroCarouselSection');
    const slidesEl = document.getElementById('heroCarouselSlides');
    if (!carouselSectionEl || !slidesEl) return;

    try {
        const response = await fetch(`${API_URL}/carousel`);
        const result = await response.json();
        if (!result.success || !result.data) return;

        const carousel = result.data;
        carouselConfig = carousel;
        renderHeroCarousel(carousel);
    } catch (error) {
        console.warn('Failed to load carousel content', error);
    }
}

function renderHeroCarousel(carousel) {
    const slidesRoot = document.getElementById('heroCarouselSlides');
    const dotsRoot = document.getElementById('heroCarouselDots');
    const prevBtn = document.getElementById('heroCarouselPrev');
    const nextBtn = document.getElementById('heroCarouselNext');
    if (!slidesRoot || !dotsRoot) return;
    console.log('renderHeroCarousel: slidesRoot, prevBtn, nextBtn present?', !!slidesRoot, !!prevBtn, !!nextBtn);

    const slides = Array.isArray(carousel?.slides) ? carousel.slides.filter(s => s && s.enabled !== false) : [];
    console.log('renderHeroCarousel: slides.length =', slides.length);
    if (!slides.length) {
        slidesRoot.innerHTML = `
            <div class="h-full grid place-items-center px-8">
              <div class="max-w-2xl text-center">
                <p class="text-sm uppercase tracking-[0.4em] text-white/60">Zenrix</p>
                <h2 class="text-3xl lg:text-4xl font-black mt-3">Hero is disabled</h2>
                <p class="text-white/75 mt-3">Add slides from the Admin Dashboard to show a modern carousel here.</p>
                <a href="products.html" class="inline-flex items-center justify-center mt-6 px-7 py-3 rounded-2xl bg-white text-slate-900 font-semibold shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 transition">Browse products</a>
              </div>
            </div>
        `;
        dotsRoot.innerHTML = '';
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        return;
    }

    heroCarouselIndex = Math.min(Math.max(0, heroCarouselIndex), slides.length - 1);

    function render() {
        const slide = slides[heroCarouselIndex];
        const previous = slidesRoot.firstElementChild;

        const wrapper = document.createElement('div');
        wrapper.className = 'absolute inset-0';
        wrapper.style.opacity = '0';
        wrapper.style.transform = 'translateX(18px) scale(1.01)';
        wrapper.style.transition = 'opacity 420ms ease, transform 420ms ease';

        // Use a semantic picture/img for better performance and responsive sources
        const bgWrap = document.createElement('div');
        bgWrap.className = 'absolute inset-0 bg-cover bg-center';
        bgWrap.setAttribute('aria-hidden', 'true');

        if (slide.image) {
            const picture = document.createElement('picture');
            // If the slide provides variants, use them. Otherwise fall back to single image.
            // Admin may provide `imageSrcSet` with comma-separated srcset entries.
            if (slide.imageSrcSet) {
                const srcsetArr = String(slide.imageSrcSet).split(',').map(s => s.trim());
                // create a webp source first when possible
                const webp = document.createElement('source');
                webp.type = 'image/webp';
                webp.srcset = srcsetArr.join(', ');
                picture.appendChild(webp);
            }

            const img = document.createElement('img');
            img.className = 'w-full h-full object-cover';
            img.loading = 'lazy';
            img.alt = slide.alt || '';
            img.decoding = 'async';
            img.src = slide.image;
            if (slide.imageSrcSet) img.srcset = slide.imageSrcSet;
            picture.appendChild(img);
            bgWrap.appendChild(picture);
        } else {
            // Fallback gradient overlay if no image
            bgWrap.style.backgroundImage = 'linear-gradient(135deg, rgba(30,41,59,0.85), rgba(49,46,129,0.75))';
        }

        const content = document.createElement('div');
        content.className = 'relative h-full grid items-center px-8 lg:px-14';

        const inner = document.createElement('div');
        inner.className = 'max-w-3xl space-y-6';

        if (slide.badgeText) {
            const badge = document.createElement('div');
            badge.className = 'inline-flex items-center gap-2 px-5 py-2 border border-white/20 rounded-full bg-white/5 backdrop-blur';
            const dot = document.createElement('span');
            dot.className = 'w-2 h-2 rounded-full bg-emerald-300';
            const text = document.createElement('span');
            text.className = 'text-sm font-semibold tracking-wide text-white';
            text.textContent = slide.badgeText;
            badge.appendChild(dot);
            badge.appendChild(text);
            inner.appendChild(badge);
        }

        const title = document.createElement('h2');
        title.className = 'hero-title text-white';
        title.textContent = slide.title || 'Zenrix';
        inner.appendChild(title);

        if (slide.subtitle) {
            const sub = document.createElement('p');
            sub.className = 'text-lg text-white/85 max-w-2xl';
            sub.textContent = slide.subtitle;
            inner.appendChild(sub);
        }

        if (slide.buttonText) {
            const ctaWrap = document.createElement('div');
            ctaWrap.className = 'flex flex-wrap gap-3';
            const a = document.createElement('a');
            a.className = 'px-7 py-3 rounded-2xl bg-white text-slate-900 font-semibold shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 transition';
            a.textContent = slide.buttonText;
            a.href = slide.link || 'products.html';
            ctaWrap.appendChild(a);
            inner.appendChild(ctaWrap);
        }

        content.appendChild(inner);
        wrapper.appendChild(bgWrap);
        wrapper.appendChild(content);

        // Subtle fade in
        wrapper.style.opacity = '0';
        wrapper.style.transition = 'opacity 220ms ease';
        // Remove the static fallback only after we successfully create a slide
        const fallbackEl = document.getElementById('heroCarouselFallback');
        if (fallbackEl) fallbackEl.remove();
        slidesRoot.appendChild(wrapper);
        requestAnimationFrame(() => {
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateX(0) scale(1)';
        });
        if (previous) {
            previous.style.transition = 'opacity 360ms ease, transform 360ms ease';
            previous.style.opacity = '0';
            previous.style.transform = 'translateX(-12px) scale(0.995)';
            setTimeout(() => {
                if (previous.parentNode === slidesRoot) previous.remove();
            }, 420);
        }

        // Dots
        dotsRoot.innerHTML = '';
        slides.forEach((_, idx) => {
            const dotBtn = document.createElement('button');
            dotBtn.type = 'button';
            dotBtn.className = `w-2.5 h-2.5 rounded-full border border-white/30 transition ${idx === heroCarouselIndex ? 'bg-white' : 'bg-white/20 hover:bg-white/35'}`;
            dotBtn.setAttribute('aria-label', `Go to slide ${idx + 1}`);
            dotBtn.addEventListener('click', () => {
                heroCarouselIndex = idx;
                render();
            });
            dotsRoot.appendChild(dotBtn);
        });

        if (prevBtn) prevBtn.classList.toggle('hidden', slides.length < 2);
        if (nextBtn) nextBtn.classList.toggle('hidden', slides.length < 2);
    }

    // Wire nav buttons (idempotent)
    if (prevBtn && !prevBtn.dataset.bound) {
        prevBtn.dataset.bound = '1';
        prevBtn.addEventListener('click', () => {
            heroCarouselIndex = (heroCarouselIndex - 1 + slides.length) % slides.length;
            render();
        });
    }
    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = '1';
        nextBtn.addEventListener('click', () => {
            heroCarouselIndex = (heroCarouselIndex + 1) % slides.length;
            render();
        });
    }

    // Autoplay with reset on interaction
    if (heroCarouselTimer) {
        clearInterval(heroCarouselTimer);
        heroCarouselTimer = null;
    }

    // Autoplay with respect for prefers-reduced-motion and pause on interaction
    const shouldAutoplay = slides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (heroCarouselTimer) {
        clearInterval(heroCarouselTimer);
        heroCarouselTimer = null;
    }
    if (shouldAutoplay) {
        heroCarouselTimer = setInterval(() => {
            heroCarouselIndex = (heroCarouselIndex + 1) % slides.length;
            render();
        }, 4000);
    }

    // Pause autoplay on hover/focus to improve accessibility
    [slidesRoot, prevBtn, nextBtn, dotsRoot].forEach(el => {
        if (!el) return;
        el.addEventListener('mouseenter', () => { if (heroCarouselTimer) clearInterval(heroCarouselTimer); });
        el.addEventListener('mouseleave', () => {
            if (!shouldAutoplay) return;
            if (heroCarouselTimer) clearInterval(heroCarouselTimer);
            heroCarouselTimer = setInterval(() => {
                heroCarouselIndex = (heroCarouselIndex + 1) % slides.length;
                render();
            }, 4000);
        });
        el.addEventListener('focusin', () => { if (heroCarouselTimer) clearInterval(heroCarouselTimer); });
        el.addEventListener('focusout', () => {
            if (!shouldAutoplay) return;
            if (heroCarouselTimer) clearInterval(heroCarouselTimer);
            heroCarouselTimer = setInterval(() => {
                heroCarouselIndex = (heroCarouselIndex + 1) % slides.length;
                render();
            }, 4000);
        });
    });

    render();
}

// Star rating helper
function getStarRating(rating) {
    const r = rating || 0;
    const fullStars = Math.floor(r);
    const hasHalf = r - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalf) stars += '★';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    return `<span class="star-display">${stars}</span>`;
}

// ==================== CART FUNCTIONS ====================

// Simple toast helper for store pages
function showToast(message, timeout = 3000) {
    let container = document.getElementById('site-toast');
    if (!container) {
        container = document.createElement('div');
        container.id = 'site-toast';
        container.style.position = 'fixed';
        container.style.bottom = '16px';
        container.style.right = '16px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.style.background = '#111827';
    t.style.color = 'white';
    t.style.padding = '10px 14px';
    t.style.marginTop = '8px';
    t.style.borderRadius = '6px';
    t.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), timeout);
}

function addToCart(product, quantity = 1) {
    const normalizedQuantity = Math.max(1, quantity);
    const key = product.key || `${product.id}__${product.color || 'default'}`;
    const currentCart = readCartFromStorage();
    const existing = currentCart.find(item => item.key === key);
    if (existing) {
        existing.quantity += normalizedQuantity;
    } else {
        currentCart.push({ ...product, key, quantity: normalizedQuantity });
    }
    writeCartToStorage(currentCart);
    showToast(`Added ${normalizedQuantity} × ${product.name} to cart`);
}

function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = total;
        cartCount.style.display = total > 0 ? 'flex' : 'none';
        // add a short visual highlight
        cartCount.classList.add('pop');
        setTimeout(() => cartCount.classList.remove('pop'), 300);
    }
    // Notify other components (e.g., navbar in shadow DOM) that cart changed
    try { window.dispatchEvent(new Event('cartUpdated')); } catch (e) {}

    // Update global live region for screen readers if present
    try {
        const live = document.getElementById('zenrix-cart-live');
        if (live) live.textContent = total > 0 ? `Cart has ${total} item${total === 1 ? '' : 's'}` : 'Cart is empty';
    } catch (e) {}
}

function initCartPage() {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('cartContent');
    const notLogged = document.getElementById('notLoggedInState');

    loading?.classList.add('hidden');
    if (!isLoggedIn()) {
        notLogged?.classList.remove('hidden');
    } else {
        notLogged?.classList.add('hidden');
    }

    const items = readCartFromStorage();
    renderCartPage(items);
    content?.classList.remove('hidden');

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (!readCartFromStorage().length) {
                showToast('Cart is empty');
                return;
            }
            if (!isLoggedIn()) {
                window.location.href = 'login.html';
                return;
            }
            window.location.href = 'checkout.html';
        });
    }

    window.addEventListener('cartUpdated', () => {
        renderCartPage(readCartFromStorage());
    });
}

function renderCartPage(items) {
    const container = document.getElementById('cartItems');
    if (!container) return;

    if (!items.length) {
        container.innerHTML = `
            <div class="bg-white/5 border border-white/10 rounded-2xl shadow p-6 text-center text-slate-300">
                <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-indigo-100">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <p class="font-semibold text-white">Your cart is empty</p>
                <p class="text-sm text-slate-400 mt-1">Add items to see them here.</p>
                <a href="products.html" class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-semibold hover:-translate-y-0.5 transition">
                    Browse products
                </a>
            </div>`;
        renderCartSummary([]);
        return;
    }

    container.innerHTML = items.map(item => {
        const key = item.key || `${item.id || 'item'}__${item.color || 'default'}`;
        const encodedKey = encodeURIComponent(key);
        const img = item.image || '/assets/placeholder.svg';
        const price = item.price || 0;
        const qty = item.quantity || 1;
        const subtotal = price * qty;
        const title = item.name || 'Item';
        const decDisabled = qty <= 1 ? 'disabled' : '';
        const decClasses = qty <= 1 ? 'px-3 py-2 text-slate-500 cursor-not-allowed bg-white/5' : 'px-3 py-2 text-white hover:bg-white/10';
        return `
            <article class="bg-white/5 border border-white/10 rounded-2xl shadow p-4 flex gap-4">
                <div class="w-24 h-24 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                    <img src="${img}" alt="${title}" class="object-cover w-full h-full">
                </div>
                <div class="flex-1 space-y-3">
                    <div class="flex items-start justify-between gap-3">
                        <div class="space-y-1">
                            <p class="font-semibold text-white">${title}</p>
                            <p class="text-sm text-slate-300">Unit: ${formatNpr(price)}</p>
                            ${item.color ? `<p class="text-xs text-slate-400">Color: ${item.color}</p>` : ''}
                        </div>
                        <button class="text-slate-400 hover:text-rose-300" aria-label="Remove" data-remove="${encodedKey}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="inline-flex items-center bg-white/10 border border-white/15 rounded-xl overflow-hidden">
                            <button class="${decClasses}" ${decDisabled} data-decrement="${encodedKey}">-</button>
                            <span class="px-4 py-2 text-white font-semibold">${qty}</span>
                            <button class="px-3 py-2 text-white hover:bg-white/10" data-increment="${encodedKey}">+</button>
                        </div>
                        <p class="text-lg font-bold text-white">${formatNpr(subtotal)}</p>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    renderCartSummary(items);

    container.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => removeCartItem(btn.getAttribute('data-remove')));
    });
    container.querySelectorAll('[data-increment]').forEach(btn => {
        btn.addEventListener('click', () => changeCartQuantity(btn.getAttribute('data-increment'), 1));
    });
    container.querySelectorAll('[data-decrement]').forEach(btn => {
        btn.addEventListener('click', () => changeCartQuantity(btn.getAttribute('data-decrement'), -1));
    });
}

function renderCartSummary(items) {
    const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const countEl = document.getElementById('summaryCount');
    const subtotalEl = document.getElementById('summarySubtotal');
    const totalEl = document.getElementById('summaryTotal');
    const heroCountEl = document.getElementById('heroItemCount');
    const heroTotalEl = document.getElementById('heroTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    const countLabel = count === 1 ? '1 item' : `${count} items`;

    if (countEl) countEl.textContent = countLabel;
    if (subtotalEl) subtotalEl.textContent = formatNpr(subtotal);
    if (totalEl) totalEl.textContent = formatNpr(subtotal);
    if (heroCountEl) heroCountEl.textContent = countLabel;
    if (heroTotalEl) heroTotalEl.textContent = formatNpr(subtotal);
    if (checkoutBtn) checkoutBtn.disabled = items.length === 0;
}

function changeCartQuantity(encodedKey, delta) {
    const key = decodeURIComponent(encodedKey);
    const items = readCartFromStorage();
    const target = items.find(item => item.key === key);
    if (!target) return;
    target.quantity = Math.max(1, (target.quantity || 1) + delta);
    writeCartToStorage(items);
    renderCartPage(items);
}

function removeCartItem(encodedKey) {
    const key = decodeURIComponent(encodedKey);
    const items = readCartFromStorage().filter(item => item.key !== key);
    writeCartToStorage(items);
    renderCartPage(items);
}

async function fetchPaymentSettings() {
    const res = await fetch(`${API_URL}/payment-settings`);
    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || 'Unable to load payment settings');
    }
    return data.data;
}

async function uploadPaymentProofFile(file) {
    if (!file) return '';
    const statusEl = document.getElementById('paymentProofStatus');
    if (statusEl) {
        statusEl.textContent = 'Uploading screenshot...';
    }
    const formData = new FormData();
    formData.append('proof', file);

    const res = await fetch(`${API_URL}/users/orders/upload-proof`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
    });
    const data = await res.json();
    if (!data.success || !data.url) {
        if (statusEl && statusEl.dataset?.defaultText) {
            statusEl.textContent = statusEl.dataset.defaultText;
        }
        throw new Error(data.error || 'Unable to upload payment screenshot');
    }
    if (statusEl) {
        statusEl.textContent = 'Screenshot attached ✅';
    }
    return data.url;
}

let checkoutItemsCache = [];
let paymentSettingsCache = null;

function initCheckoutPage() {
    const container = document.getElementById('checkoutFormContainer');
    if (!container) return;

    const loginState = document.getElementById('checkoutLoginState');
    const emptyState = document.getElementById('checkoutEmptyState');
    const successState = document.getElementById('checkoutSuccessState');
    const statusEl = document.getElementById('checkoutStatus');

    successState?.classList.add('hidden');
    statusEl && (statusEl.textContent = '');

    if (!isLoggedIn()) {
        loginState?.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    loginState?.classList.add('hidden');

    const items = readCartFromStorage();
    checkoutItemsCache = items;
    if (!items.length) {
        emptyState?.classList.remove('hidden');
        container.classList.add('hidden');
        document.getElementById('checkoutSummaryList')?.classList.add('hidden');
        return;
    }

    emptyState?.classList.add('hidden');
    container.classList.remove('hidden');
    document.getElementById('checkoutSummaryList')?.classList.remove('hidden');
    updateCheckoutSummary(items);

    fetchPaymentSettings()
        .then(settings => {
            paymentSettingsCache = settings;
            renderPaymentMethods(settings);
        })
        .catch(err => {
            console.error(err);
            statusEl && (statusEl.textContent = 'Unable to load payment methods. Please refresh.');
        });

    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', submitCheckoutOrder);
    }

    const proofInput = document.getElementById('paymentProof');
    const proofStatus = document.getElementById('paymentProofStatus');
    if (proofStatus && !proofStatus.dataset.defaultText) {
        proofStatus.dataset.defaultText = proofStatus.textContent || '';
    }
    if (proofInput && proofStatus) {
        proofInput.addEventListener('change', () => {
            const file = proofInput.files?.[0];
            if (file) {
                const sizeKb = Math.round(file.size / 1024);
                proofStatus.textContent = `${file.name} · ${sizeKb} KB ready to upload`;
            } else {
                proofStatus.textContent = proofStatus.dataset.defaultText || '';
            }
        });
    }

    window.addEventListener('cartUpdated', () => {
        checkoutItemsCache = readCartFromStorage();
        updateCheckoutSummary(checkoutItemsCache);
    });
}

function renderPaymentMethods(settings) {
    const methodsWrapper = document.getElementById('paymentMethods');
    if (!methodsWrapper) return;
    const methods = [];

    if (settings.codEnabled) {
        methods.push({
            id: 'cod',
            title: 'Cash on Delivery',
            subtitle: 'Pay when your package arrives',
            accent: 'bg-amber-500'
        });
    }
    if (settings.bankEnabled) {
        methods.push({
            id: 'bank-transfer',
            title: 'Bank Transfer',
            subtitle: settings.bankDetails?.bankName || 'Nepal Bank Transfer',
            accent: 'bg-indigo-500'
        });
    }
    if (settings.nepaliWallets?.esewa?.enabled) {
        methods.push({
            id: 'esewa',
            title: 'eSewa',
            subtitle: settings.nepaliWallets.esewa.walletNumber || 'Wallet',
            accent: 'bg-emerald-500'
        });
    }
    if (settings.nepaliWallets?.khalti?.enabled) {
        methods.push({
            id: 'khalti',
            title: 'Khalti',
            subtitle: settings.nepaliWallets.khalti.walletNumber || 'Wallet',
            accent: 'bg-fuchsia-500'
        });
    }
    if (settings.nepaliWallets?.imepay?.enabled) {
        methods.push({
            id: 'imepay',
            title: 'IME Pay',
            subtitle: settings.nepaliWallets.imepay.walletNumber || 'Wallet',
            accent: 'bg-amber-500'
        });
    }

    if (!methods.length) {
        methodsWrapper.innerHTML = '<p class="text-sm text-red-500">No payment methods enabled. Please contact support.</p>';
        return;
    }

    methodsWrapper.innerHTML = methods.map((method, index) => `
        <label class="flex items-center space-x-4 border border-gray-200 rounded-2xl px-4 py-3 cursor-pointer hover:border-indigo-400 transition">
            <input type="radio" name="paymentMethod" value="${method.id}" class="form-radio" ${index === 0 ? 'checked' : ''}>
            <div class="flex-1">
                <p class="font-semibold text-gray-900">${method.title}</p>
                <p class="text-sm text-gray-500">${method.subtitle}</p>
            </div>
            <span class="${method.accent} text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">${method.id}</span>
        </label>
    `).join('');

    document.querySelectorAll('input[name="paymentMethod"]').forEach(input => {
        input.addEventListener('change', () => handlePaymentMethodChange(input.value));
    });

    handlePaymentMethodChange(methods[0].id);
}

function handlePaymentMethodChange(method) {
    const details = document.getElementById('paymentMethodDetails');
    const extras = document.getElementById('paymentExtras');
    const refInput = document.getElementById('paymentReference');
    const proofInput = document.getElementById('paymentProof');
    const proofStatus = document.getElementById('paymentProofStatus');
    const instructionsAck = document.getElementById('instructionsAck');

    if (!paymentSettingsCache || !details) return;
    let content = '';

    if (method === 'cod') {
        content = '<p class="text-sm text-gray-600">Pay in cash when the courier delivers your parcel. Please have the exact amount ready.</p>';
    } else if (method === 'bank-transfer') {
        const bank = paymentSettingsCache.bankDetails || {};
        content = `
            <p class="text-sm text-gray-600 mb-2">Transfer to:</p>
            <div class="text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
                <p><span class="text-gray-500">Bank:</span> ${bank.bankName || 'N/A'}</p>
                <p><span class="text-gray-500">Account Name:</span> ${bank.accountName || 'N/A'}</p>
                <p><span class="text-gray-500">Account No:</span> ${bank.accountNumber || 'N/A'}</p>
                <p><span class="text-gray-500">Branch:</span> ${bank.branch || 'N/A'}</p>
                <p><span class="text-gray-500">SWIFT:</span> ${bank.swiftCode || 'N/A'}</p>
            </div>
        `;
    } else if (method === 'esewa' || method === 'khalti' || method === 'imepay') {
        const wallet = paymentSettingsCache.nepaliWallets?.[method] || {};
        content = `
            <p class="text-sm text-gray-600 mb-2">Send to wallet:</p>
            <div class="text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
                <p><span class="text-gray-500">Wallet:</span> ${wallet.walletNumber || 'N/A'}</p>
                <p><span class="text-gray-500">Notes:</span> ${wallet.instructions || 'Add order reference in remarks'}</p>
            </div>
        `;
    }

    let qrImage = '';
    if (method === 'bank-transfer') {
        qrImage = paymentSettingsCache.qrImageUrl || '';
    } else if (method === 'esewa' || method === 'khalti' || method === 'imepay') {
        const wallet = paymentSettingsCache.nepaliWallets?.[method] || {};
        qrImage = wallet.qrImageUrl || paymentSettingsCache.qrImageUrl || '';
    }

    if (qrImage) {
        content += `
            <div class="mt-4 bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p class="text-sm font-semibold text-gray-800">Scan & pay (QR)</p>
                <img src="${qrImage}" alt="Payment QR" class="mx-auto mt-3 max-h-56 rounded-lg shadow-sm border border-gray-100" loading="lazy">
            </div>
        `;
    }

    if (paymentSettingsCache.instructions) {
        content += `<p class="text-xs text-gray-500 mt-2">${paymentSettingsCache.instructions}</p>`;
    }

    details.innerHTML = sanitizeHtml(content);

    if (method === 'cod') {
        extras?.classList.add('hidden');
        refInput && (refInput.required = false, refInput.value = '');
        if (proofInput) {
            proofInput.value = '';
        }
        if (proofStatus) {
            proofStatus.textContent = proofStatus.dataset?.defaultText || '';
        }
        if (instructionsAck) {
            instructionsAck.checked = true;
            instructionsAck.required = false;
        }
    } else {
        extras?.classList.remove('hidden');
        refInput && (refInput.required = true);
        if (instructionsAck) {
            instructionsAck.required = true;
        }
    }
}

function updateCheckoutSummary(items) {
    const listEl = document.getElementById('checkoutSummaryList');
    const countEl = document.getElementById('checkoutSummaryCount');
    const subtotalEl = document.getElementById('checkoutSummarySubtotal');
    const totalEl = document.getElementById('checkoutSummaryTotal');

    if (!listEl) return;

    if (!items.length) {
        listEl.innerHTML = '<p class="text-gray-500 text-sm">No items in cart.</p>';
    } else {
        listEl.innerHTML = items.map(item => {
            const title = item.name || 'Item';
            const qty = item.quantity || 1;
            const price = item.price || 0;
            return `
                <div class="flex items-center justify-between text-sm">
                    <div>
                        <p class="font-semibold text-gray-900">${title}</p>
                        <p class="text-gray-500">${qty} × ${formatNpr(price)}</p>
                    </div>
                    <p class="font-semibold text-gray-900">${formatNpr(price * qty)}</p>
                </div>
            `;
        }).join('');
    }

    const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    countEl && (countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'}`);
    subtotalEl && (subtotalEl.textContent = formatNpr(subtotal));
    totalEl && (totalEl.textContent = formatNpr(subtotal));
}

async function submitCheckoutOrder(event) {
    event.preventDefault();
    const form = event.target;
    const statusEl = document.getElementById('checkoutStatus');
    const submitBtn = document.getElementById('orderSubmitBtn');
    statusEl && (statusEl.textContent = '');

    if (!checkoutItemsCache.length) {
        statusEl && (statusEl.textContent = 'Your cart is empty.');
        return;
    }

    const shipping = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        address1: form.address1.value.trim(),
        address2: form.address2.value.trim(),
        city: form.city.value.trim(),
        province: form.province.value.trim(),
        postalCode: form.postalCode.value.trim(),
        notes: form.notes.value.trim()
    };

    const requiredFields = ['fullName', 'phone', 'address1', 'city'];
    const missing = requiredFields.filter(field => !shipping[field]);
    if (missing.length) {
        statusEl && (statusEl.textContent = `Please complete: ${missing.join(', ')}`);
        return;
    }

    const methodInput = form.querySelector('input[name="paymentMethod"]:checked');
    if (!methodInput) {
        statusEl && (statusEl.textContent = 'Select a payment method.');
        return;
    }
    const method = methodInput.value;
    const referenceId = form.paymentReference?.value.trim() || '';
    const instructionsAckValue = form.instructionsAck?.checked ?? false;

    if (method !== 'cod' && !referenceId) {
        statusEl && (statusEl.textContent = 'Add the transaction reference for non-COD payments.');
        return;
    }

    if (method !== 'cod' && !instructionsAckValue) {
        statusEl && (statusEl.textContent = 'Please confirm you have followed the payment instructions.');
        return;
    }

    try {
        submitBtn && (submitBtn.disabled = true, submitBtn.textContent = 'Processing...');

        let proofUrl = '';
        const proofFile = form.paymentProof?.files?.[0];
        if (proofFile) {
            proofUrl = await uploadPaymentProofFile(proofFile);
        }

        const payment = {
            method,
            referenceId,
            proofUrl,
            instructionsAck: instructionsAckValue
        };

        const cartItems = checkoutItemsCache.map(item => {
            const productId = item.id || item.productId;
            if (!productId) {
                throw new Error('One of the products is missing an id');
            }
            return {
                productId,
                quantity: item.quantity || 1,
                color: item.color || '',
                size: item.size || '',
                variantNotes: item.variantNotes || ''
            };
        });

        const payload = { cartItems, shipping, payment };

        const res = await fetch(`${API_URL}/users/orders/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to place order');
        }

        clearCartStorage();
        checkoutItemsCache = [];
        updateCheckoutSummary([]);
        document.getElementById('checkoutFormContainer')?.classList.add('hidden');
        document.getElementById('checkoutSuccessState')?.classList.remove('hidden');
        statusEl && (statusEl.textContent = 'Order placed! We will confirm payment shortly.');
    } catch (err) {
        console.error('Checkout failed', err);
        statusEl && (statusEl.textContent = err.message);
    } finally {
        submitBtn && (submitBtn.disabled = false, submitBtn.textContent = 'Place Order');
    }
}

// Make functions available globally
window.addToCart = addToCart;