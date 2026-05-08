const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  image: {
    type: String,
    default: '/assets/placeholder.svg' 
  },
  images: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['electronics', 'fashion', 'home', 'beauty', 'other']
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  featured: {
    type: Boolean,
    default: false
  },
  onSale: {
    type: Boolean,
    default: false
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price must be positive']
  },
  saleLabel: {
    type: String,
    default: 'On Sale'
  },
  saleEnd: {
    type: Date
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);