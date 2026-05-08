const express = require('express');
const router = express.Router();
const Page = require('../models/Page');
const Component = require('../models/Component');
const { requireAdmin } = require('../middleware/auth');

// GET all pages (ordered)
router.get('/', async (req, res) => {
  try {
    const pages = await Page.find().sort({ order: 1, title: 1 });
    res.json({ success: true, count: pages.length, data: pages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reorder pages (protected) - accepts { orders: [{ id, order }] }
router.post('/order', requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ success: false, error: 'Invalid payload: orders must be an array' });
    // Simple validation
    for (const o of orders) {
      if (!o || !o.id || typeof o.order !== 'number' || !Number.isFinite(o.order)) {
        return res.status(400).json({ success: false, error: 'Invalid orders array: each item must be { id, order:number }' });
      }
    }
    const ops = orders.map(o => ({ updateOne: { filter: { _id: o.id }, update: { order: o.order } } }));
    if (!ops.length) return res.json({ success: true });
    await Page.bulkWrite(ops);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET page by slug (only published pages)
router.get('/slug/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, published: true });
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Preview page by slug (admin only, returns unpublished pages too)
router.get('/preview/:slug', requireAdmin, async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET by id
router.get('/:id', async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE page (protected). If order not provided, append to end.
router.post('/', requireAdmin, async (req, res) => {
  try {
    // Basic slug validation and normalization
    if (!req.body.slug) return res.status(400).json({ success: false, error: 'Slug is required' });
    const slug = String(req.body.slug).trim().toLowerCase();
    if (!/^[a-z0-9\-]+$/.test(slug)) return res.status(400).json({ success: false, error: 'Slug must be lowercase alphanumeric and dashes only' });
    req.body.slug = slug;

    // ensure proper ordering
    if (typeof req.body.order === 'undefined') {
      const last = await Page.findOne().sort({ order: -1 }).select('order').lean();
      req.body.order = last && typeof last.order === 'number' ? last.order + 1 : 1;
    }
    const page = new Page(req.body);
    await page.save();
    res.status(201).json({ success: true, data: page });
  } catch (err) {
    console.error('CREATE PAGE ERROR:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// UPDATE page (protected)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const page = await Page.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });

    // After updating the contact page, attempt to sync common contact fields into the footer component so front-facing UI stays consistent
    if (page.slug === 'contact') {
      try {
        const content = page.content || '';
        const emailMatch = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        const phoneMatch = content.match(/(\+?\d[\d\-\s()]{6,}\d)/);
        const supportEmail = emailMatch ? emailMatch[0].trim() : null;
        const supportPhone = phoneMatch ? phoneMatch[0].trim() : null;
        if (supportEmail || supportPhone) {
          const footer = await Component.findOne({ slug: 'footer' });
          if (footer) {
            footer.data = footer.data || {};
            if (supportEmail) footer.data.supportEmail = supportEmail;
            if (supportPhone) footer.data.supportPhone = supportPhone;
            await footer.save();
            console.info('Synced contact page fields to footer component', { supportEmail, supportPhone });
          }
        }
      } catch (e) {
        console.error('Failed to sync contact page to footer component:', e);
      }
    }

    res.json({ success: true, data: page });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE page (protected)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    res.json({ success: true, message: 'Page deleted', deletedId: page._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
