const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const Testimonial = require('../models/Testimonial');
const TestimonialAudit = require('../models/TestimonialAudit');
const nodemailer = require('nodemailer');

const router = express.Router();

// Setup a simple nodemailer transport if SMTP env vars are present
let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === '1' || false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Public: submit testimonial
router.post('/', async (req, res) => {
  try {
    const { name, review, rating = 5, email } = req.body;
    if (!name || !review) return res.status(400).json({ success: false, error: 'Name and review are required' });

    const testimonial = new Testimonial({ name, review, rating, email, status: 'pending', isActive: false });
    await testimonial.save();

    // Audit entry for creation (public submission)
    try {
      await TestimonialAudit.create({ testimonial: testimonial._id, action: 'create', previousStatus: null, newStatus: 'pending', note: 'Public submission' });
    } catch (e) { console.error('Failed to write testimonial audit (create):', e && e.message); }

    // Notify admin via email if configured
    if (process.env.ADMIN_EMAIL && mailer) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const subject = `New testimonial submitted by ${name}`;
        const url = (process.env.SITE_URL || '') + '/admin-dashboard.html';
        await mailer.sendMail({
          from: process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST}`,
          to: adminEmail,
          subject,
          text: `${name} submitted a testimonial (${rating}/5):\n\n${review}\n\nModerate at: ${url}`
        });
      } catch (e) { console.error('Failed to send testimonial notification email:', e && e.message); }
    }

    res.status(201).json({ success: true, message: 'Thank you for your review! It will be published after moderation.' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Public: get approved testimonials
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ status: 'approved', isActive: true }).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: get all testimonials
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, count: testimonials.length, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: create testimonial (admin can publish directly)
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const { name, review, rating = 5, status = 'approved', email } = req.body;
    if (!name || !review) return res.status(400).json({ success: false, error: 'Name and review are required' });

    const testimonial = new Testimonial({ name, review, rating, status, email, isActive: status === 'approved' });
    await testimonial.save();
    res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Admin: update testimonial
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { name, review, rating, status, isActive, adminName } = req.body;

    const before = await Testimonial.findById(req.params.id).lean();

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { name, review, rating, status, isActive, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!testimonial) return res.status(404).json({ success: false, error: 'Testimonial not found' });

    // Audit entry for status change
    try {
      if (before && before.status !== testimonial.status) {
        await TestimonialAudit.create({ testimonial: testimonial._id, action: 'status_change', adminName: adminName || 'Admin Dashboard', previousStatus: before.status, newStatus: testimonial.status });
      }
      // Generic update audit
      await TestimonialAudit.create({ testimonial: testimonial._id, action: 'update', adminName: adminName || 'Admin Dashboard', previousStatus: before ? before.status : null, newStatus: testimonial.status });
    } catch (e) { console.error('Failed to write testimonial audit (update):', e && e.message); }

    res.json({ success: true, data: testimonial });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Admin: delete testimonial
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Testimonial.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Testimonial not found' });
    try { await TestimonialAudit.create({ testimonial: deleted._id, action: 'delete', adminName: 'Admin Dashboard', previousStatus: deleted.status, newStatus: null }); } catch (e) { console.error('Failed to write testimonial audit (delete):', e && e.message); }
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: get audits for a testimonial
router.get('/admin/:id/audits', requireAdmin, async (req, res) => {
  try {
    const audits = await TestimonialAudit.find({ testimonial: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: audits.length, data: audits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;