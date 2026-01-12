const express = require('express');
const Staff = require('../models/Staff');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'team');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${unique}${ext}`);
  }
});

// helper: generate thumbnail (if sharp is available)
async function generateThumbnail(srcPath, destName) {
  try {
    const sharp = require('sharp');
    const destDir = path.join(uploadDir, 'thumbs');
    fs.mkdirSync(destDir, { recursive: true });
    const outPath = path.join(destDir, destName);
    await sharp(srcPath).resize(150, 150, { fit: 'cover' }).toFile(outPath);
    return `/uploads/team/thumbs/${destName}`;
  } catch (err) {
    // sharp not installed or failed; ignore gracefully
    console.warn('Thumbnail generation skipped:', err && err.message);
    return '';
  }
}

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed (jpeg, png, webp, gif)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// GET all staff (public)
router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find({ active: true }).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single staff
router.get('/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE staff (admin)
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, position, bio, email, linkedin, order, active, imageData } = req.body;
    if (!name || !position || !bio) return res.status(400).json({ success: false, error: 'Name, position and bio are required' });

    const staffData = {
      name: String(name).trim(),
      position: String(position).trim(),
      bio: String(bio).trim(),
      email: email ? String(email).trim() : undefined,
      linkedin: linkedin ? String(linkedin).trim() : undefined,
      order: typeof order !== 'undefined' ? Number(order) : 0,
      active: active === 'on' || active === true || active === 'true'
    };

    // File upload takes precedence
    if (req.file) {
      staffData.image = `/uploads/team/${req.file.filename}`;
      // generate thumbnail
      const thumbName = `thumb-${req.file.filename}`;
      const thumbUrl = await generateThumbnail(path.join(uploadDir, req.file.filename), thumbName);
      if (thumbUrl) staffData.thumbnail = thumbUrl;
    } else if (imageData) {
      // imageData is expected to be a base64 data URL or raw base64
      const match = String(imageData).match(/data:(image\/[a-zA-Z]+);base64,(.*)$/);
      let buf;
      let ext = '.jpg';
      if (match) {
        ext = match[1].split('/')[1];
        buf = Buffer.from(match[2], 'base64');
      } else {
        // assume raw base64 jpeg
        buf = Buffer.from(String(imageData), 'base64');
      }
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + ext;
      const savePath = path.join(uploadDir, filename);
      fs.writeFileSync(savePath, buf);
      staffData.image = `/uploads/team/${filename}`;
      const thumbName = `thumb-${filename}`;
      const thumbUrl = await generateThumbnail(savePath, thumbName);
      if (thumbUrl) staffData.thumbnail = thumbUrl;
    } else if (req.body.image) {
      staffData.image = String(req.body.image).trim();
    }

    const staff = new Staff(staffData);
    await staff.save();
    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// UPDATE staff (admin)
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const existing = await Staff.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Staff not found' });

    const updates = {};
    ['name', 'position', 'bio', 'email', 'linkedin'].forEach(k => { if (typeof req.body[k] !== 'undefined') updates[k] = String(req.body[k]).trim(); });
    if (typeof req.body.order !== 'undefined') updates.order = Number(req.body.order);
    if (typeof req.body.active !== 'undefined') updates.active = req.body.active === 'on' || req.body.active === 'true' || req.body.active === true;

    // Keep track of previous local files to delete after successful update
    const prevImage = existing.image || '';
    const prevThumb = existing.thumbnail || '';

    // Handle image upload or image data (base64/image URL)
    if (req.file) {
      updates.image = `/uploads/team/${req.file.filename}`;
      const thumbName = `thumb-${req.file.filename}`;
      const thumbUrl = await generateThumbnail(path.join(uploadDir, req.file.filename), thumbName);
      if (thumbUrl) updates.thumbnail = thumbUrl;
    } else if (req.body.imageData) {
      // imageData may be a data URL or raw base64
      const match = String(req.body.imageData).match(/data:(image\/[a-zA-Z]+);base64,(.*)$/);
      let buf;
      let ext = 'jpg';
      if (match) {
        ext = match[1].split('/')[1];
        buf = Buffer.from(match[2], 'base64');
      } else {
        buf = Buffer.from(String(req.body.imageData), 'base64');
      }
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + ext;
      const savePath = path.join(uploadDir, filename);
      fs.writeFileSync(savePath, buf);
      updates.image = `/uploads/team/${filename}`;
      const thumbName = `thumb-${filename}`;
      const thumbUrl = await generateThumbnail(savePath, thumbName);
      if (thumbUrl) updates.thumbnail = thumbUrl;
    } else if (typeof req.body.image !== 'undefined') {
      updates.image = String(req.body.image).trim();
    }

    const staff = await Staff.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });

    // Cleanup old files if they were local uploads and replaced
    try {
      if (updates.image && prevImage && prevImage.startsWith('/uploads/team/') && prevImage !== updates.image) {
        const prevPath = path.join(__dirname, '..', prevImage.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
      }
      if (updates.thumbnail && prevThumb && prevThumb.startsWith('/uploads/team/thumbs/') && prevThumb !== updates.thumbnail) {
        const prevThumbPath = path.join(__dirname, '..', prevThumb.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(prevThumbPath)) fs.unlinkSync(prevThumbPath);
      }
    } catch (cleanupErr) {
      console.warn('Failed to clean up previous images:', cleanupErr && cleanupErr.message);
    }

    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE staff (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });

    // Remove local image and thumbnail files if they are stored under /uploads/team/
    try {
      if (staff.image && staff.image.startsWith('/uploads/team/')) {
        const imgPath = path.join(__dirname, '..', staff.image.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
      if (staff.thumbnail && staff.thumbnail.startsWith('/uploads/team/thumbs/')) {
        const thumbPath = path.join(__dirname, '..', staff.thumbnail.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }
    } catch (cleanupErr) {
      console.warn('Failed to remove staff files on delete:', cleanupErr && cleanupErr.message);
    }

    await Staff.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Staff deleted', deletedId: staff._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;