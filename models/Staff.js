const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Staff name is required'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true
  },
  bio: {
    type: String,
    required: [true, 'Bio is required']
  },
  image: {
    type: String,
    default: '/assets/placeholder.svg' 
  },
  thumbnail: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    trim: true
  },
  linkedin: {
    type: String,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

staffSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Staff', staffSchema);