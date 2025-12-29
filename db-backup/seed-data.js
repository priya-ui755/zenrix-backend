/**
 * Zenrix Database Seed Script
 * 
 * This script populates the MongoDB database with initial data
 * including users, products, pages, components, and sample orders.
 * 
 * Usage: node db-backup/seed-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import all models
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Page = require('../models/Page');
const Component = require('../models/Component');
const Hero = require('../models/Hero');
const Career = require('../models/Career');
const Subscriber = require('../models/Subscriber');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenrix';

console.log('🔌 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    return seedDatabase();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function seedDatabase() {
  try {
    console.log('\n🌱 Starting database seeding...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Page.deleteMany({}),
      Component.deleteMany({}),
      Hero.deleteMany({}),
      Career.deleteMany({}),
      Subscriber.deleteMany({})
    ]);
    console.log('✅ Cleared existing data\n');

    // ========== USERS ==========
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = await User.insertMany([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: hashedPassword,
        phone: '+1234567890',
        membershipTier: 'Gold',
        addresses: [
          {
            type: 'Home',
            addressLine1: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: true
          }
        ]
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: hashedPassword,
        phone: '+1234567891',
        membershipTier: 'Silver'
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@zenrix.com',
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
        phone: '+1234567892',
        membershipTier: 'Platinum'
      }
    ]);
    console.log(`✅ Created ${users.length} users\n`);

    // ========== PRODUCTS ==========
    console.log('📦 Creating products...');
    const products = await Product.insertMany([
      {
        name: 'Wireless Bluetooth Headphones',
        price: 99.99,
        description: 'Premium wireless headphones with active noise cancellation. Perfect for music lovers and travelers with 30-hour battery life.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        category: 'electronics',
        stock: 50,
        featured: true,
        rating: 4.5
      },
      {
        name: 'Smart Watch Series 5',
        price: 199.99,
        description: 'Advanced smartwatch with health monitoring, GPS, and 2-day battery life. Track your fitness goals with style.',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
        category: 'electronics',
        stock: 30,
        featured: true,
        rating: 4.7
      },
      {
        name: 'Premium Cotton T-Shirt',
        price: 24.99,
        description: '100% organic cotton premium t-shirt. Comfortable, breathable, and durable for everyday wear.',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
        category: 'fashion',
        stock: 100,
        featured: false,
        rating: 4.3
      },
      {
        name: 'Stainless Steel Water Bottle',
        price: 29.99,
        description: 'Insulated stainless steel water bottle. Keeps drinks cold for 24 hours and hot for 12 hours.',
        image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504',
        category: 'home',
        stock: 75,
        featured: false,
        rating: 4.8
      },
      {
        name: 'Leather Laptop Bag',
        price: 79.99,
        description: 'Genuine leather laptop bag with multiple compartments. Fits up to 15.6" laptops.',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
        category: 'fashion',
        stock: 40,
        featured: true,
        rating: 4.6
      }
    ]);
    console.log(`✅ Created ${products.length} products\n`);

    // ========== SAMPLE ORDERS ==========
    console.log('📋 Creating sample orders...');
    const orders = await Order.insertMany([
      {
        user: users[0]._id,
        items: [
          { product: products[0]._id, name: products[0].name, price: products[0].price, quantity: 1 },
          { product: products[2]._id, name: products[2].name, price: products[2].price, quantity: 2 }
        ],
        total: 149.97,
        status: 'Completed'
      },
      {
        user: users[0]._id,
        items: [
          { product: products[1]._id, name: products[1].name, price: products[1].price, quantity: 1 }
        ],
        total: 199.99,
        status: 'Pending'
      },
      {
        user: users[1]._id,
        items: [
          { product: products[3]._id, name: products[3].name, price: products[3].price, quantity: 2 }
        ],
        total: 59.98,
        status: 'Completed'
      }
    ]);
    console.log(`✅ Created ${orders.length} sample orders\n`);

    // ========== PAGES (CMS) ==========
    console.log('📄 Creating CMS pages...');
    const pages = await Page.insertMany([
      { slug: 'index', title: 'Home', content: '<h1>Welcome to Zenrix</h1><p>Your one-stop shop for quality products at affordable prices.</p>', published: true, meta: { description: 'Zenrix - Quality products at great prices' } },
      { slug: 'about', title: 'About Us', content: '<h1>About Zenrix</h1><p>We are committed to providing the best shopping experience with quality products and excellent customer service.</p>', published: true, meta: { description: 'About Zenrix' } },
      { slug: 'contact', title: 'Contact Us', content: '<h1>Contact Us</h1><p>Email: support@zenrix.com<br>Phone: +1 (800) 123-4567<br>Address: 123 Commerce St, New York, NY 10001</p>', published: true, meta: { description: 'Contact Zenrix' } },
      { slug: 'terms', title: 'Terms & Conditions', content: '<h1>Terms & Conditions</h1><p>By accessing this website, you agree to be bound by these terms and conditions.</p>', published: true, meta: { description: 'Terms and conditions' } },
      { slug: 'privacy', title: 'Privacy Policy', content: '<h1>Privacy Policy</h1><p>We respect your privacy and are committed to protecting your personal information.</p>', published: true, meta: { description: 'Privacy policy' } },
      { slug: 'careers', title: 'Careers', content: '<h1>Join Our Team</h1><p>We are always looking for talented individuals to join the Zenrix family.</p>', published: true, meta: { description: 'Careers at Zenrix' } },
      { slug: 'blog', title: 'Blog', content: '<h1>Blog</h1><p>Stay updated with the latest news, trends, and insights from Zenrix.</p>', published: true, meta: { description: 'Zenrix Blog' } }
    ]);
    console.log(`✅ Created ${pages.length} CMS pages\n`);

    // ========== COMPONENTS ==========
    console.log('🧩 Creating components...');
    const components = await Component.insertMany([
      {
        slug: 'navbar',
        name: 'Main Navbar',
        html: `<div class="nav-links">
          <a href="/">Home</a>
          <a href="/products.html">Products</a>
          <a href="/account.html">Account</a>
          <a href="/contact.html">Contact</a>
        </div>`,
        published: true
      },
      {
        slug: 'footer',
        name: 'Main Footer',
        html: `<div class="footer-about">
          <a href="/" class="footer-logo">Zenrix</a>
          <p>Your one-stop shop for quality products at affordable prices.</p>
        </div>`,
        published: true
      }
    ]);
    console.log(`✅ Created ${components.length} components\n`);

    // ========== HERO SECTIONS ==========
    console.log('🎨 Creating hero sections...');
    const heroes = await Hero.insertMany([
      {
        page: 'home',
        title: 'Welcome to Zenrix',
        subtitle: 'Quality Products, Unbeatable Prices',
        ctaText: 'Shop Now',
        ctaLink: '/products.html',
        backgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        active: true
      }
    ]);
    console.log(`✅ Created ${heroes.length} hero sections\n`);

    // ========== CAREERS ==========
    console.log('💼 Creating career listings...');
    const careers = await Career.insertMany([
      {
        title: 'Full Stack Developer',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-time',
        description: 'We are looking for a talented full stack developer to join our team.',
        requirements: ['3+ years experience', 'Node.js & React', 'MongoDB'],
        salary: '$80,000 - $120,000',
        active: true
      },
      {
        title: 'Marketing Manager',
        department: 'Marketing',
        location: 'New York, NY',
        type: 'Full-time',
        description: 'Lead our marketing efforts and grow our brand.',
        requirements: ['5+ years experience', 'Digital marketing', 'Team leadership'],
        salary: '$90,000 - $130,000',
        active: true
      }
    ]);
    console.log(`✅ Created ${careers.length} career listings\n`);

    // ========== SUBSCRIBERS ==========
    console.log('📧 Creating sample subscribers...');
    const subscribers = await Subscriber.insertMany([
      { email: 'subscriber1@example.com', subscribed: true },
      { email: 'subscriber2@example.com', subscribed: true }
    ]);
    console.log(`✅ Created ${subscribers.length} subscribers\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${users.length} users`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${orders.length} orders`);
    console.log(`   - ${pages.length} pages`);
    console.log(`   - ${components.length} components`);
    console.log(`   - ${heroes.length} hero sections`);
    console.log(`   - ${careers.length} career listings`);
    console.log(`   - ${subscribers.length} subscribers\n`);

    console.log('🔐 Test User Credentials:');
    console.log('   Email: john@example.com');
    console.log('   Password: password123\n');

    console.log('   Email: admin@zenrix.com');
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}
