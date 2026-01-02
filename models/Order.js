const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  price: Number,
  variant: {
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  total: {
    type: Number,
    default: 0
  },
  shipping: {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address1: { type: String, default: '' },
    address2: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  payment: {
    method: {
      type: String,
      enum: ['cod', 'bank-transfer', 'esewa', 'khalti', 'imepay'],
      default: 'cod'
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'failed'],
      default: 'pending'
    },
    referenceId: { type: String, default: '' },
    proofUrl: { type: String, default: '' },
    instructionsAck: { type: Boolean, default: false },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Canceled'],
    default: 'Pending'
  },
  statusHistory: [{
    status: { type: String, default: 'Pending' },
    paymentStatus: { type: String, default: '' },
    note: { type: String, default: '' },
    admin: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now }
  }],
  adminNotes: [{
    note: { type: String, default: '' },
    admin: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
