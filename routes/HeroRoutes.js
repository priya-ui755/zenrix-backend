const express = require('express');
const router = express.Router();
const Hero = require('../models/Hero');
const { requireAdmin } = require('../middleware/auth');

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
      hero = new Hero(req.body);
    } else {
      Object.assign(hero, req.body);
    }
    await hero.save();
    res.json({ success: true, data: hero });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
