const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  meta: {
    description: { type: String, default: '' },
    keywords: { type: String, default: '' },
    mapEmbed: { type: String, default: '' }
  },
  published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

pageSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Page', pageSchema);
