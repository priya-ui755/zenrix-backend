const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
require('dotenv').config();

const Product = require('./models/Product');

const app = express();
const FRONTEND_DIR = path.join(__dirname, 'Frontend');

// Warn when critical env values are missing in local development
if (!process.env.MONGODB_URI) {
  console.warn('⚠️  WARNING: MONGODB_URI is not set. Falling back to mongodb://127.0.0.1:27017/zenrix');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  Note: ADMIN_PASSWORD not set. Default admin password will be used (unsafe for production).');
}
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  Note: JWT_SECRET not set. Using a fallback secret (do not use in production).');
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zenrix';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on('error', err => console.error('❌ Mongoose error:', err.message));
mongoose.connection.once('open', async () => {
  try {
    await addSampleProducts();
    await addSamplePages();
    await addSampleComponents();
  } catch (error) {
    console.error('Error during seeding:', error);
  }
});

// Security middleware first
app.use(helmet({
  contentSecurityPolicy: false // Disable Helmet's CSP
}));

// Set minimal CSP that allows the required resources
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://cdn.jsdelivr.net; " +
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
    "frame-src 'self' https://www.google.com https://maps.google.com https://www.google.com/maps https://maps.app.goo.gl; " +
    "object-src 'none'"
  );
  next();
});
console.log('Minimal CSP set allowing jsdelivr');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to API routes only (not static assets).
// Use a higher limit in non-production to avoid hampering local admin UI/E2E checks.
const RATE_LIMIT_MAX = Number.parseInt(process.env.RATE_LIMIT_MAX || '', 10);
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.isFinite(RATE_LIMIT_MAX)
    ? RATE_LIMIT_MAX
    : (process.env.NODE_ENV === 'production' ? 100 : 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, try again later.' },
});
app.use('/api', apiLimiter);

require('./config/passport');
app.use(passport.initialize());

// Static assets
app.use(express.static(FRONTEND_DIR));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Avoid noisy 404s for browsers requesting /favicon.ico.
// Serve a tiny SVG favicon (works in modern browsers) instead of 404.
app.get('/favicon.ico', (_req, res) => {
  res.type('image/svg+xml');
  res.status(200).send(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
      "<rect width='32' height='32' rx='8' fill='#667eea'/>" +
      "<text x='16' y='22' text-anchor='middle' font-size='18' font-family='Arial, sans-serif' fill='white'>Z</text>" +
    "</svg>"
  );
});

// API routes
const adminRoutes = require('./routes/AdminRoutes');
const authRoutes = require('./routes/AuthRoutes');
const productRoutes = require('./routes/ProductRoutes');
const pageRoutes = require('./routes/PageRoutes');
const componentRoutes = require('./routes/ComponentRoutes');
const userRoutes = require('./routes/UserRoutes');
const subscriberRoutes = require('./routes/SubscriberRoutes');
const careerRoutes = require('./routes/CareerRoutes');
const heroRoutes = require('./routes/HeroRoutes');
const carouselRoutes = require('./routes/CarouselRoutes');
const paymentSettingsRoutes = require('./routes/PaymentSettingsRoutes');
const ticketRoutes = require('./routes/TicketRoutes');
const knowledgeRoutes = require('./routes/KnowledgeRoutes');
const staffRoutes = require('./routes/StaffRoutes');

// Temporary staff route
app.get('/api/employees', (req, res) => {
    res.end('OK');
});

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Debugging: log modifying requests to products to help diagnose admin UI issues
app.use('/api/products', (req, res, next) => {
  if (['PUT', 'DELETE', 'POST'].includes(req.method)) {
    try {
      console.log('[DEBUG] Product API request:', req.method, req.originalUrl, 'auth=', !!req.headers.authorization);
      if (req.body && Object.keys(req.body).length) {
        const preview = JSON.stringify(req.body).slice(0, 200);
        console.log('[DEBUG] Body preview:', preview);
      }
    } catch (e) {}
  }
  next();
});

app.use('/api/products', productRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/staff', staffRoutes);

// Temporary staff route
// app.get('/api/staff', (req, res) => {
//     res.json({ success: true, count: 0, data: [] });
// });

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: Date.now() });
});

// Serve the marketing site
app.get('/', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Return 404 for unknown API routes
app.use('/api', (req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Global error handler
const fs = require('fs');
app.use((err, req, res, _next) => {
  try {
    const entry = [`\n[${new Date().toISOString()}] Error: ${err.message}`, err.stack || 'no-stack'].join('\n') + '\n';
    fs.appendFileSync(path.join(__dirname, 'debug.log'), entry, 'utf8');
  } catch (logErr) {
    console.error('Failed to write to debug.log:', logErr.message);
  }

  console.error('❌ Error caught by global handler:', err.message);
  if (err.stack) console.error(err.stack);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
});

process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log('✅ Zenrix Server Started!');
  console.log(`📡 http://localhost:${PORT}`);
  console.log('=================================');
});

module.exports = app;

// ======== Seed helpers ========
async function addSampleProducts() {
  try {
    const sampleProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        price: 13299,
        description: 'Premium wireless headphones with active noise cancellation. Perfect for music lovers and travelers with 30-hour battery life.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
        category: 'electronics',
        stock: 50,
        featured: true,
        rating: 4.5
      },
      {
        name: 'Smart Watch Series 5',
        price: 26599,
        description: 'Advanced smartwatch with health monitoring, GPS, and 2-day battery life. Track your fitness goals with style.',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
        category: 'electronics',
        stock: 30,
        featured: true,
        rating: 4.7
      },
      {
        name: 'Premium Cotton T-Shirt',
        price: 3319,
        description: '100% organic cotton premium t-shirt. Comfortable, breathable, and durable for everyday wear.',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
        category: 'fashion',
        stock: 100,
        featured: false,
        rating: 4.3
      },
      {
        name: 'Stainless Steel Water Bottle',
        price: 3989,
        description: 'Insulated stainless steel water bottle. Keeps drinks cold for 24 hours and hot for 12 hours.',
        image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1200&q=80',
        category: 'home',
        stock: 75,
        featured: false,
        rating: 4.8
      },
      {
        name: 'Leather Laptop Bag',
        price: 10659,
        description: 'Genuine leather laptop bag with multiple compartments. Fits up to 15.6" laptops.',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80',
        category: 'fashion',
        stock: 40,
        featured: true,
        rating: 4.6
      },
      {
        name: 'Nordic Ceramic Pour-over Set',
        price: 5499,
        description: 'Matte ceramic pour-over coffee set with walnut accents and double-walled carafe.',
        image: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80',
        category: 'home',
        stock: 60,
        featured: false,
        rating: 4.4
      },
      {
        name: 'Minimal Desk Lamp',
        price: 7299,
        description: 'Aluminum desk lamp with wireless charging base and adjustable color temperature.',
        image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
        category: 'home',
        stock: 45,
        featured: true,
        rating: 4.6
      },
      {
        name: 'Urban Explorer Backpack',
        price: 8899,
        description: 'Weatherproof backpack with padded laptop sleeve and modular interior dividers.',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
        category: 'fashion',
        stock: 80,
        featured: true,
        rating: 4.8
      },
      {
        name: 'Studio Monitor Speakers',
        price: 32499,
        description: 'Pair of 5-inch studio monitors tuned for creators with Bluetooth input support.',
        image: 'https://images.unsplash.com/photo-1516308288102-48c63601a26b?auto=format&fit=crop&w=1200&q=80',
        category: 'electronics',
        stock: 25,
        featured: true,
        rating: 4.9
      },
      {
        name: 'Signature Scented Candle Trio',
        price: 2999,
        description: 'Hand-poured soy candles with cedar, bergamot, and jasmine blends.',
        image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80',
        category: 'home',
        stock: 120,
        featured: false,
        rating: 4.2
      },
      {
        name: 'Performance Running Sneakers',
        price: 15499,
        description: 'Lightweight running shoes with knit upper and adaptive cushioning.',
        image: 'https://images.unsplash.com/photo-1528701800489-20be3c16ef4a?auto=format&fit=crop&w=1200&q=80',
        category: 'fashion',
        stock: 70,
        featured: true,
        rating: 4.7
      },
      {
        name: 'Compact Action Camera',
        price: 42999,
        description: 'Waterproof 4K action camera with horizon lock and instant transfer.',
        image: 'https://images.unsplash.com/photo-1508896694512-b12267200c7e?auto=format&fit=crop&w=1200&q=80',
        category: 'electronics',
        stock: 35,
        featured: true,
        rating: 4.8
      }
    ];

    const sampleNames = sampleProducts.map(product => product.name);
    const existingSampleProducts = await Product.find({ name: { $in: sampleNames } }, 'name');
    const existingNames = new Set(existingSampleProducts.map(product => product.name));
    const missingProducts = sampleProducts.filter(product => !existingNames.has(product.name));

    if (missingProducts.length) {
      console.log(`📦 Adding ${missingProducts.length} sample product(s) to Zenrix database...`);
      await Product.insertMany(missingProducts);
      console.log(`✅ Added ${missingProducts.length} sample products (total now ${await Product.countDocuments()})`);
    } else {
      const productCount = await Product.countDocuments();
      console.log(`✅ Database already has ${productCount} products (sample catalog present)`);
    }
  } catch (error) {
    console.warn('⚠️ Could not seed products:', error.message);
  }
}

async function addSamplePages() {
  try {
    const Page = require('./models/Page');
    const pageCount = await Page.countDocuments();
    if (pageCount > 0) {
      console.log(`✅ Database already has ${pageCount} pages`);
      return;
    }

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
  } catch (error) {
    console.warn('⚠️ Could not seed pages:', error.message);
  }
}

async function addSampleComponents() {
  try {
    const Component = require('./models/Component');
    const count = await Component.countDocuments();
    if (count > 0) {
      console.log(`✅ Database already has ${count} components`);
      return;
    }

    console.log('🧩 Adding sample components...');
    const samples = [
      { slug: 'navbar', name: 'Main Navbar', html: '<div class="nav-links"><a href="/">Home</a><a href="/products.html">Products</a><a href="/profile.html">Account</a><a href="/contact.html">Contact</a></div>', published: true },
      { slug: 'footer', name: 'Main Footer', html: '<div class="footer-about"><a href="/" class="footer-logo">Zenrix</a><p>One place for all your needs. High quality products at affordable prices.</p></div>', published: true }
    ];

    await Component.insertMany(samples);
    console.log('✅ Sample components created');
  } catch (error) {
    console.warn('⚠️ Could not seed components:', error.message);
  }
}
