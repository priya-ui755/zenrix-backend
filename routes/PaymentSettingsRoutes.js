const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const PaymentSettings = require('../models/PaymentSettings');
const { requireAdmin } = require('../middleware/auth');

const paymentsDir = path.join(__dirname, '..', 'uploads', 'payments');
fs.mkdirSync(paymentsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, paymentsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

router.get('/', async (req, res) => {
  try {
    const settings = await PaymentSettings.getOrCreate();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', requireAdmin, async (req, res) => {
  try {
    const settings = await PaymentSettings.getOrCreate();
    const {
      codEnabled,
      bankEnabled,
      bankDetails,
      qrImageUrl,
      instructions,
      nepaliWallets,
      updatedBy
    } = req.body;

    if (typeof codEnabled === 'boolean') settings.codEnabled = codEnabled;
    if (typeof bankEnabled === 'boolean') settings.bankEnabled = bankEnabled;
    if (bankDetails && typeof bankDetails === 'object') {
      const existingBankDetails = settings.bankDetails?.toObject ? settings.bankDetails.toObject() : (settings.bankDetails || {});
      settings.bankDetails = { ...existingBankDetails, ...bankDetails };
      settings.markModified('bankDetails');
    }
    if (typeof qrImageUrl === 'string') settings.qrImageUrl = qrImageUrl;
    if (typeof instructions === 'string') settings.instructions = instructions;
    if (nepaliWallets && typeof nepaliWallets === 'object') {
      if (!settings.nepaliWallets || typeof settings.nepaliWallets !== 'object') {
        settings.nepaliWallets = { esewa: {}, khalti: {}, imepay: {} };
      }

      ['esewa', 'khalti', 'imepay'].forEach(key => {
        if (nepaliWallets[key]) {
          const current = settings.nepaliWallets[key] || {};
          const normalized = current.toObject ? current.toObject() : current;
          settings.nepaliWallets[key] = { ...normalized, ...nepaliWallets[key] };
        }
      });
      settings.markModified('nepaliWallets');
    }

    settings.updatedBy = updatedBy || 'Administrator';
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/upload', requireAdmin, (req, res, next) => {
  upload.single('qr')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    try {
      const url = `/uploads/payments/${req.file.filename}`.replace(/\\/g, '/');
      res.json({ success: true, url, filename: req.file.filename });
    } catch (error) {
      next(error);
    }
  });
});

module.exports = router;
