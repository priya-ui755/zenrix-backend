const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Order = require('../models/Order');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Simple admin login - returns a short-lived JWT
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, error: 'Password required' });

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
  const JWT_SECRET = process.env.JWT_SECRET || 'zenrix-secret';

  // Timing-safe compare to reduce password oracle leakage.
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(ADMIN_PASSWORD));
  const sameLen = a.length === b.length;
  const ok = sameLen && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token });
});

router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status, paymentStatus, limit } = req.query;
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      filters['payment.status'] = paymentStatus;
    }
    const max = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
    const orders = await Order.find(filters)
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(max)
      .lean();
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/orders/:orderId', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name price image images');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update order status / payment status with audit trail
router.put('/orders/:orderId/status', requireAdmin, async (req, res) => {
  try {
    const { status, paymentStatus, note, adminName } = req.body || {};
    const VALID_ORDER_STATUS = ['Pending', 'Completed', 'Canceled'];
    const VALID_PAYMENT_STATUS = ['pending', 'submitted', 'verified', 'failed'];

    if (!status && !paymentStatus && !note) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    if (status && !VALID_ORDER_STATUS.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid order status' });
    }
    if (paymentStatus && !VALID_PAYMENT_STATUS.includes(paymentStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid payment status' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let changed = false;
    if (status && status !== order.status) {
      order.status = status;
      changed = true;
    }
    if (paymentStatus && paymentStatus !== (order.payment && order.payment.status)) {
      order.payment = order.payment || {};
      order.payment.status = paymentStatus;
      order.payment.reviewedBy = adminName || 'Admin Dashboard';
      order.payment.reviewedAt = new Date();
      order.payment.reviewNote = note || order.payment.reviewNote;
      changed = true;
    }

    if (note) {
      order.adminNotes = order.adminNotes || [];
      order.adminNotes.push({ note, admin: adminName || 'Admin Dashboard' });
    }

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: status || order.status,
      paymentStatus: paymentStatus || order.payment?.status || '',
      note: note || '',
      admin: adminName || 'Admin Dashboard',
      createdAt: new Date()
    });

    if (!changed && !note) {
      return res.status(400).json({ success: false, error: 'No changes detected' });
    }

    console.info('Admin order update', { orderId: order._id, admin: adminName || 'Admin Dashboard', changed });

    await order.save();
    await order.populate('user', 'firstName lastName email phone');
    await order.populate('items.product', 'name price image images');

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;