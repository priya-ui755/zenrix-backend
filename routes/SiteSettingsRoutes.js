const express = require('express');
const router = express.Router();
const SiteSettings = require('../models/SiteSettings');
const { requireAdmin } = require('../middleware/auth');
const sse = require('../server/sse');

// Public get
router.get('/', async (_req, res) => {
  try {
    const settings = await SiteSettings.getOrCreate();
    // Only expose public-safe fields by default
    const out = {
      siteTitle: settings.siteTitle,
      companyName: settings.companyName,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      supportChatLink: settings.supportChatLink,
      supportHours: settings.supportHours,
      legalEmail: settings.legalEmail,
      address: settings.address,
      mapEmbedUrl: settings.mapEmbedUrl,
      socialLinks: settings.socialLinks,
      footerHtml: settings.footerHtml,
      footerBottomText: settings.footerBottomText,
      heroTextOverrides: settings.heroTextOverrides
    };
    res.json({ success: true, data: out });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update - admin only
router.put('/', requireAdmin, async (req, res) => {
  try {
    const settings = await SiteSettings.getOrCreate();
    const body = req.body || {};
    // Allow updating the core fields - keep it permissive but safe
    const allowed = ['siteTitle','companyName','supportEmail','supportPhone','supportChatLink','supportHours','legalEmail','address','mapEmbedUrl','socialLinks','footerHtml','footerBottomText','heroTextOverrides','updatedBy'];
    let changed = false;
    for (const k of allowed) {
      if (typeof body[k] !== 'undefined') {
        settings[k] = body[k];
        changed = true;
      }
    }
    if (changed) {
      settings.updatedBy = body.updatedBy || settings.updatedBy || 'Administrator';
      await settings.save();
      // Broadcast site settings update to connected clients
      try { sse.broadcast('siteSettingsUpdated', { data: settings }); } catch (e) {}
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
