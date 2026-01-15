const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const { requireAdmin } = require('../middleware/auth');

// GET all
router.get('/', async (req, res) => {
  try {
    const components = await Component.find();
    res.json({ success: true, count: components.length, data: components });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const comp = await Component.findOne({ slug: req.params.slug });
    if (!comp) return res.status(404).json({ success: false, error: 'Component not found' });
    // Robust sanitization: remove anchors that link to /about.html specifically
    // when they appear inside the element with id="aboutDropdown".
    try {
      const safe = comp.toObject();
      if (safe.html && typeof safe.html === 'string') {
        safe.html = safe.html.replace(/(<div[^>]*id=["']aboutDropdown["'][^>]*>)([\s\S]*?)(<\/div>)/i,
          (m, open, inner, close) => {
            const cleanedInner = inner.replace(/<a[^>]*href=(['"])\/about.html\1[^>]*>.*?<\/a>\s*/ig, '');
            return open + cleanedInner + close;
          }
        );
      }
      return res.json({ success: true, data: safe });
    } catch (e) {
      return res.json({ success: true, data: comp });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE (protected)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const comp = new Component(req.body);
    await comp.save();
    res.status(201).json({ success: true, data: comp });
  } catch (err) {
    console.error('CREATE COMPONENT ERROR:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// UPDATE (protected)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const comp = await Component.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!comp) return res.status(404).json({ success: false, error: 'Component not found' });
    res.json({ success: true, data: comp });
    // Broadcast to connected clients that this component changed so public pages can update live
    try {
      const sse = require('../server/sse');
      sse.broadcast('componentUpdated', { slug: comp.slug, data: comp });
    } catch (e) { /* non-fatal */ }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE (protected)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const comp = await Component.findByIdAndDelete(req.params.id);
    if (!comp) return res.status(404).json({ success: false, error: 'Component not found' });
    res.json({ success: true, message: 'Component deleted', deletedId: comp._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
