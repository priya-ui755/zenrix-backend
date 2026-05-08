const express = require('express');
const router = express.Router();
const Carousel = require('../models/Carousel');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const carouselStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const dest = path.join(__dirname, '..', 'uploads', 'carousel');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `carousel-${unique}${ext}`);
  }
});

const carouselUpload = multer({
  storage: carouselStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only JPEG, PNG, WEBP allowed'));
  }
});

function normalizeSlides(slides) {
  if (!Array.isArray(slides)) return [];
  return slides
    .map((raw) => {
      const slide = raw && typeof raw === 'object' ? raw : {};
      return {
        title: typeof slide.title === 'string' ? slide.title : '',
        subtitle: typeof slide.subtitle === 'string' ? slide.subtitle : '',
        badgeText: typeof slide.badgeText === 'string' ? slide.badgeText : '',
        buttonText: typeof slide.buttonText === 'string' ? slide.buttonText : '',
        link: typeof slide.link === 'string' ? slide.link : '',
        image: typeof slide.image === 'string' ? slide.image : '',
        enabled: slide.enabled !== false
      };
    })
    .filter(s => s.title || s.subtitle || s.image || s.badgeText || s.buttonText || s.link);
}

function defaultSlides() {
  return [
    {
      badgeText: 'Limited-time offers',
      title: 'Fresh drops, without the bundle.',
      subtitle: 'Browse trending collections while our spotlight bundle is offline.',
      buttonText: 'Shop products',
      link: '/products.html',
      image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80',
      enabled: true
    },
    {
      badgeText: 'New arrivals',
      title: 'Tech, fashion, and home—ready now.',
      subtitle: 'Explore what’s trending today and get fast delivery across Nepal.',
      buttonText: 'Browse collections',
      link: '/products.html',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80',
      enabled: true
    },
    {
      badgeText: 'Editor’s picks',
      title: 'Build your own bundle vibe.',
      subtitle: 'Pick 2–3 favorites and create a look that feels curated—no formal bundle required.',
      buttonText: 'See featured',
      link: '/products.html?featured=true',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80',
      enabled: true
    }
  ];
}

function slideKey(slide) {
  const title = (slide?.title || '').trim().toLowerCase();
  const image = (slide?.image || '').trim().toLowerCase();
  return `${title}::${image}`;
}

function ensureDefaultSlides(carousel) {
  const existing = Array.isArray(carousel?.slides) ? carousel.slides : [];
  const seen = new Set(existing.map(slideKey));
  const toAdd = defaultSlides().filter(s => !seen.has(slideKey(s)));
  if (!toAdd.length) return false;
  carousel.slides = existing.concat(toAdd);
  return true;
}

async function getOrCreateCarousel() {
  let carousel = await Carousel.findOne();
  if (!carousel) {
    carousel = new Carousel({ slides: defaultSlides(), seededDefaults: true });
    await carousel.save();
    return carousel;
  }

  // Idempotent merge: always ensure defaults exist (deduped).
  // This allows adding defaults even if the carousel was previously saved.
  const changed = ensureDefaultSlides(carousel);
  if (changed || !carousel.seededDefaults) {
    carousel.seededDefaults = true;
    await carousel.save();
  }

  return carousel;
}

// GET carousel (public)
router.get('/', async (_req, res) => {
  try {
    const carousel = await getOrCreateCarousel();
    res.json({ success: true, data: carousel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE carousel (protected)
router.put('/', requireAdmin, async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const nextSlides = normalizeSlides(payload.slides);

    let carousel = await Carousel.findOne();
    if (!carousel) {
      carousel = new Carousel({ slides: nextSlides, seededDefaults: true });
    } else {
      carousel.slides = nextSlides;
      // Admin explicitly saved the carousel; don't auto-seed again.
      carousel.seededDefaults = true;
    }

    await carousel.save();
    res.json({ success: true, data: carousel });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Upload carousel image (protected)
router.post('/upload', requireAdmin, carouselUpload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const url = `/uploads/carousel/${req.file.filename}`;
    return res.json({ success: true, url });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
