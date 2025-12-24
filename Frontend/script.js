// ==================== ZENRIX E-COMMERCE ====================
// Backend API URL
const API_URL = 'http://localhost:3000/api';

// Cart System
let cart = JSON.parse(localStorage.getItem('zenrix_cart')) || [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
    
    // Load products based on current page
    if (document.getElementById('productsGrid') || document.getElementById('featuredProducts')) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        loadProducts(category);
    }
    
    // Load product details if on product page
    if (window.location.pathname.includes('product.html')) {
        loadProductDetails();
    }

    // Load CMS page content if there is a placeholder
    loadPageContent();
    
    // Load cart if on cart page
    if (window.location.pathname.includes('cart.html')) {
        loadCartPage();
    }
});

// ==================== PRODUCT FUNCTIONS ====================

// Load products from backend
async function loadProducts(category = null) {
    try {
        let url = `${API_URL}/products`;
        const container = document.getElementById('productsGrid') || document.getElementById('featuredProducts');
        
        if (!container) return;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            let products = result.data;
            
            // Filter by category
            if (category) {
                products = products.filter(p => p.category === category);
            }
            
            // Display products
            displayProducts(products, container);
        }
    } catch (error) {
        console.log('Using fallback data');
        // Fallback to your existing products
    }
}

// Display products
function displayProducts(products, container) {
    container.innerHTML = products.map(product => `
        <div class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
            <a href="product.html?id=${product._id}">
                <div class="h-48 bg-gray-100 flex items-center justify-center">
                    <img src="${product.image}" alt="${product.name}" class="h-full object-contain">
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-lg">${product.name}</h3>
                    <div class="flex items-center my-2">
                        ${getStarRating(product.rating)}
                    </div>
                    <p class="text-blue-600 font-bold">$${product.price.toFixed(2)}</p>
                </div>
            </a>
        </div>
    `).join('');
}

// Load single product details
async function loadProductDetails() {
    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        const result = await response.json();
        
        if (result.success) {
            const product = result.data;
            
            // Update page
            document.querySelector('h1').textContent = product.name;
            document.querySelector('.text-blue-600').textContent = `$${product.price.toFixed(2)}`;
            
            const mainImage = document.getElementById('mainProductImage');
            if (mainImage) mainImage.src = product.image;
            
            // Update add to cart button
            const addBtn = document.getElementById('addToCart');
            if (addBtn) {
                addBtn.onclick = () => addToCart({
                    id: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.image
                });
            }
        }
    } catch (error) {
        console.log('Error loading product:', error);
    }
}

// Load CMS page content (generic)
async function loadPageContent() {
    try {
        const container = document.getElementById('pageContent');
        if (!container) return; // not a CMS page

        // derive slug from URL (e.g., about.html -> about)
        let slug = window.location.pathname.split('/').pop() || '';
        slug = slug.replace('.html','') || 'home';

        const res = await fetch(`${API_URL}/pages/slug/${slug}`);
        const json = await res.json();
        if (json.success && json.data) {
            const page = json.data;
            document.title = `${page.title} | Zenrix`;
            container.innerHTML = page.content || '<p class="text-gray-600">No content yet.</p>';
            return;
        }
        container.innerHTML = '<p class="text-gray-600">Content not found. Please add this page from the Admin Dashboard.</p>';
    } catch (err) {
        const container = document.getElementById('pageContent');
        if (container) container.innerHTML = `<p class="text-red-600">Failed to load page: ${err.message}</p>`;
    }
}

// Star rating helper
function getStarRating(rating) {
    const full = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-yellow-400 inline-block mr-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.455a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.448 2.441c-.784.57-1.838-.197-1.539-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.568 9.382c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"/></svg>';
    const half = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-yellow-400 inline-block mr-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.455a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118L10 13.347V2.927z"/></svg>';
    const empty = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-yellow-300 inline-block mr-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.455a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.448 2.441c-.784.57-1.838-.197-1.539-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.568 9.382c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"/></svg>';
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += full;
        } else if (i - 0.5 <= rating) {
            stars += half;
        } else {
            stars += empty;
        }
    }
    return stars;
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

function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({...product, quantity: 1});
    }
    localStorage.setItem('zenrix_cart', JSON.stringify(cart));
    updateCartCount();
    showToast(`Added ${product.name} to cart!`);
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

function loadCartPage() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Your cart is empty</p>';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="flex items-center border-b py-4">
            <img src="${item.image}" class="w-20 h-20 object-contain mr-4">
            <div class="flex-grow">
                <h3 class="font-semibold">${item.name}</h3>
                <p>$${item.price.toFixed(2)} × ${item.quantity}</p>
            </div>
            <button onclick="removeFromCart('${item.id}')" class="text-red-500" aria-label="Remove item">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `).join('');
    
    // Update totals
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('zenrix_cart', JSON.stringify(cart));
    loadCartPage();
    updateCartCount();
}

// Make functions available globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;