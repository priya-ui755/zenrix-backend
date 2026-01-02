const express = require('express');
const router = express.Router();
const Hero = require('../models/Hero');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage for hero assets
const heroStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const dest = path.join(__dirname, '..', 'uploads', 'hero');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `hero-${unique}${ext}`);
  }
});

const heroUpload = multer({
  storage: heroStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only JPEG, PNG, WEBP allowed'));
  }
});

// GET hero settings (public)
router.get('/', async (req, res) => {
  try {
    let hero = await Hero.findOne();
    if (!hero) {
      // Create default hero if none exists
      hero = new Hero();
      await hero.save();
    }
    res.json({ success: true, data: hero });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE hero settings (protected)
router.put('/', requireAdmin, async (req, res) => {
  try {
    let hero = await Hero.findOne();
    if (!hero) {
      hero = new Hero(normalizePayload(req.body));
    } else {
      Object.assign(hero, normalizePayload(req.body));
    }
    await hero.save();
    res.json({ success: true, data: hero });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

function normalizePayload(body = {}) {
  const normalized = { ...body };

  // Normalize spotlight items from textarea/newline into an array
  if (typeof body.spotlightItems === 'string') {
    normalized.spotlightItems = body.spotlightItems
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  if (Array.isArray(body.spotlightItems)) {
    normalized.spotlightItems = body.spotlightItems.filter(Boolean).map(String);
  }

  // Ensure numeric price
  if (body.spotlightPrice !== undefined) {
    const price = Number(body.spotlightPrice);
    normalized.spotlightPrice = Number.isFinite(price) ? price : 0;
  }

  return normalized;
}

module.exports = router;

// Upload hero asset (background or spotlight image)
router.post('/upload', requireAdmin, heroUpload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const url = `/uploads/hero/${req.file.filename}`;
    return res.json({ success: true, url });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});
