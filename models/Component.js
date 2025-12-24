const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String },
  html: { type: String, default: '' },
  data: { type: Object, default: {} },
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

componentSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Component', componentSchema);
