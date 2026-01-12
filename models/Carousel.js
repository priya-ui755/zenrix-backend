const mongoose = require('mongoose');

const carouselSlideSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  badgeText: { type: String, default: '' },
  buttonText: { type: String, default: '' },
  link: { type: String, default: '' },
  image: { type: String, default: '' },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const carouselSchema = new mongoose.Schema({
  slides: { type: [carouselSlideSchema], default: [] },
  seededDefaults: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

carouselSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Carousel', carouselSchema);
