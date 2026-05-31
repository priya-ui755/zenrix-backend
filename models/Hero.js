const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema({
  title: { type: String, default: 'Welcome to Fashion Hub' },
  subtitle: { type: String, default: 'Your one-stop digital marketplace for innovative products' },
  ctaText: { type: String, default: 'Shop Now' },
  ctaLink: { type: String, default: '/products.html' },
  backgroundImage: { type: String, default: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=1200' },
  spotlightImage: { type: String, default: '' },
  badgeText: { type: String, default: 'Fashion Hub Spotlight • Weekend' },
  spotlightTitle: { type: String, default: 'Curated Weekend Bundle' },
  spotlightCopy: { type: String, default: 'Desk-ready audio, wearable, and carry picks — matched to look and perform together.' },
  spotlightMeta: { type: String, default: 'Bundle & save • Ships free' },
  spotlightPrice: { type: Number, default: 32999 },
  spotlightCtaText: { type: String, default: 'Shop bundle' },
  spotlightCtaLink: { type: String, default: '/products.html' },
  spotlightItems: { type: [String], default: [] },
  enabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

heroSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Hero', heroSchema);
