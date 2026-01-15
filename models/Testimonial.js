const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  review: { type: String, required: true, trim: true },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  email: { type: String, trim: true, lowercase: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Testimonial', testimonialSchema);