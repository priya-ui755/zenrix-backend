const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Basic env checks
if (!process.env.MONGODB_URI) {
  console.warn('⚠️  WARNING: MONGODB_URI is not set. Set it in .env or environment variables to connect to a database.');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  Note: ADMIN_PASSWORD not set. Default password will be used for admin login (not recommended for production).');
}
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  Note: JWT_SECRET not set. Using default secret (not recommended for production).');
}

const Product = require('./models/Product');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const helmet = require('helmet');
// Configure CSP to allow CDN scripts for development and E2E tests (tailwind, quill)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.quilljs.com", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.quilljs.com", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"]
    }
  }
}));

// Basic rate limiting
const rateLimit = require('express-rate-limit');
app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 100 }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch(err => console.log('❌ Error:', err));

// ========== ADD SAMPLE PRODUCTS ==========
async function addSampleProducts() {
  try {
    // Import Product model
    const Product = require('./models/Product');
    
    // Check if database is empty
    const productCount = await Product.countDocuments();
    
    if (productCount === 0) {
      console.log('📦 Adding sample products to Zenrix database...');
      
      // Sample products for your e-commerce
      const sampleProducts = [
        {
          name: "Wireless Bluetooth Headphones",
          price: 99.99,
          description: "Premium wireless headphones with active noise cancellation. Perfect for music lovers and travelers.",
          image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
          category: "electronics",
          stock: 50,
          featured: true,
          rating: 4.5
        },
        {
          name: "Smart Watch Series 5",
          price: 199.99,
          description: "Advanced smartwatch with health monitoring, GPS, and 2-day battery life.",
          image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
          category: "electronics",
          stock: 30,
          featured: true,
          rating: 4.7
        },
        {
          name: "Premium Cotton T-Shirt",
          price: 24.99,
          description: "100% cotton premium t-shirt. Comfortable and durable for everyday wear.",
          image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
          category: "fashion",
          stock: 100,
          featured: false,
          rating: 4.3
        },
        {
          name: "Stainless Steel Water Bottle",
          price: 29.99,
          description: "Insulated stainless steel water bottle. Keeps drinks cold for 24 hours.",
          image: "https://images.unsplash.com/photo-1523362628745-0c100150b504",
          category: "home",
          stock: 75,
          featured: false,
          rating: 4.8
        }
      ];
      
      // Insert into database
      await Product.insertMany(sampleProducts);
      
      console.log('✅ Successfully added 4 sample products:');
      console.log('  1. Wireless Headphones - $99.99 (Electronics)');
      console.log('  2. Smart Watch - $199.99 (Electronics)');
      console.log('  3. T-Shirt - $24.99 (Fashion)');
      console.log('  4. Water Bottle - $29.99 (Home)');
      console.log('');
      
    } else {
      console.log(`✅ Database already has ${productCount} products`);
    }
    
  } catch (error) {
    console.log('⚠️  Note: ' + error.message);
  }
}

// Call the function
addSampleProducts();

// ========== ADD SAMPLE PAGES (CMS) ==========
async function addSamplePages() {
  try {
    const Page = require('./models/Page');
    const pageCount = await Page.countDocuments();
    if (pageCount === 0) {
      console.log('📄 Adding sample CMS pages...');
      const samplePages = [
        { slug: 'index', title: 'Home', content: '<h1>Welcome to Zenrix</h1><p>Manage homepage content from the Admin Dashboard.</p>', published: true, meta: { description: 'Home' } },
        { slug: 'about', title: 'About Us', content: '<h1>About Us</h1><p>Zenrix is a sample store managed from the Admin Dashboard.</p>', published: true, meta: { description: 'About Zenrix' } },
        { slug: 'contact', title: 'Contact Us', content: '<h1>Contact Us</h1><p>Please reach out at <a href="mailto:support@zenrix.com.np">support@zenrix.com.np</a></p>', published: true, meta: { description: 'Contact Zenrix' } },
        { slug: 'terms', title: 'Terms & Conditions', content: '<h1>Terms & Conditions</h1><p>Standard terms for the site. Edit from admin.</p>', published: true, meta: { description: 'Terms and conditions' } },
        { slug: 'privacy', title: 'Privacy Policy', content: '<h1>Privacy Policy</h1><p>Privacy information placeholder. Edit from admin.</p>', published: true, meta: { description: 'Privacy policy' } },
        { slug: 'careers', title: 'Careers', content: '<h1>Careers</h1><p>Open positions and opportunities. Edit from admin.</p>', published: true, meta: { description: 'Careers at Zenrix' } },
        { slug: 'products', title: 'Products', content: '<h1>Our Products</h1><p>Discover items across categories. This header is managed from the Admin Dashboard.</p>', published: true, meta: { description: 'Shop our products' } },
        { slug: 'product', title: 'Product', content: '<h1>Product</h1><p>Product marketing content. Keep product details dynamic, but manage this marketing block in the CMS.</p>', published: true, meta: { description: 'Product page' } },
        { slug: 'blog', title: 'Blog', content: '<h1>Blog</h1><p>Company news, guides, and updates. Edit from admin.</p>', published: true, meta: { description: 'Zenrix Blog' } },
        { slug: 'wishlist', title: 'Wishlist', content: '<h1>Wishlist</h1><p>Your saved items. Managed from admin.</p>', published: true, meta: { description: 'Wishlist' } },
        { slug: 'settings', title: 'Settings', content: '<h1>Settings</h1><p>Account settings and preferences. Edit from admin.</p>', published: true, meta: { description: 'Account settings' } },
        { slug: 'profile', title: 'Profile', content: '<h1>Profile</h1><p>User profile page managed by the CMS.</p>', published: true, meta: { description: 'User profile' } }
      ];
      await Page.insertMany(samplePages);
      console.log('✅ Sample pages created');
    } else {
      console.log(`✅ Database already has ${pageCount} pages`);
    }
  } catch (err) {
    console.warn('⚠️ Could not seed pages:', err.message);
  }
}
addSamplePages();

// ========== ADD SAMPLE COMPONENTS ==========
async function addSampleComponents() {
  try {
    const Component = require('./models/Component');
    const count = await Component.countDocuments();
    if (count === 0) {
      console.log('🧩 Adding sample components...');
      const samples = [
        { slug: 'navbar', name: 'Main Navbar', html: `<div class="nav-links"><a href="/">Home</a><a href="/products.html">Products</a><a href="/account.html">Account</a><a href="/contact.html">Contact</a></div>`, published: true },
        { slug: 'footer', name: 'Main Footer', html: `<div class="footer-about"><a href="/" class="footer-logo">Zenrix</a><p>One place for all your needs. High quality products at affordable prices.</p></div>`, published: true }
      ];
      await Component.insertMany(samples);
      console.log('✅ Sample components created');
    } else {
      console.log(`✅ Database already has ${count} components`);
    }
  } catch (err) {
    console.warn('⚠️ Could not seed components:', err.message);
  }
}
addSampleComponents();
// ========== END SAMPLE COMPONENTS ==========

const path = require('path');
// Mount route modules
const productRoutes = require('./routes/ProductRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const pageRoutes = require('./routes/PageRoutes');
const componentRoutes = require('./routes/ComponentRoutes');
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/components', componentRoutes);

// API info route
app.get('/api', (req, res) => {
  res.json({ 
    message: '🚀 Zenrix Backend is Running!',
    endpoints: {
      getProducts: 'GET /api/products',
      createProduct: 'POST /api/products (protected)',
      updateProduct: 'PUT /api/products/:id (protected)',
      deleteProduct: 'DELETE /api/products/:id (protected)',
      adminLogin: 'POST /api/admin/login',
      test: 'GET /api/test'
    }
  });
});

// Serve frontend static files (index.html at root, other HTML files accessible)
app.use('/', express.static(path.join(__dirname, 'Frontend')));

app.get('/api/test', (req, res) => {
  res.json({ 
    app: 'Zenrix Digital Marketplace',
    status: 'Working Perfectly!',
    database: 'MongoDB Connected'
  });
});

// Note: product routes are already mounted above

// Start server (only when run directly)
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('=================================');
    console.log('✅ Zenrix Server Started!');
    console.log(`📡 http://localhost:${PORT}`);
    console.log('=================================');
  });
}

// Export app for tests
module.exports = app;