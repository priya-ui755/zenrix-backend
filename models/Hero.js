const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema({
  title: { type: String, default: 'Welcome to Zenrix' },
  subtitle: { type: String, default: 'Your one-stop digital marketplace for innovative products' },
  ctaText: { type: String, default: 'Shop Now' },
  ctaLink: { type: String, default: '/products.html' },
  backgroundImage: { type: String, default: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=1200' },
  enabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

heroSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Hero', heroSchema);
