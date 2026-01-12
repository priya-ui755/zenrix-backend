const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Subscriber = require('../models/Subscriber');

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Escape double quotes; wrap in quotes if it contains special chars.
  const needsQuotes = /[",\r\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}

// Public subscribe
router.post('/', async (req, res) => {
  try {
    const { email, consent = true, source = 'homepage' } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Already subscribed' });
    }

    const sub = new Subscriber({ email, consent, source });
    await sub.save();
    res.status(201).json({ success: true, data: sub });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Admin: list subscribers
router.get('/admin/all', requireAdmin, async (_req, res) => {
  try {
    const subs = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ success: true, count: subs.length, data: subs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: delete subscriber
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Subscriber.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Subscriber not found' });
    res.json({ success: true, message: 'Subscriber deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: export subscribers (CSV; opens in Excel)
router.get('/export/excel', requireAdmin, async (_req, res) => {
  try {
    const subs = await Subscriber.find().sort({ createdAt: -1 }).lean();

    const header = ['#', 'Email', 'Source', 'Consent', 'Subscribed Date'];
    const rows = subs.map((sub, index) => ([
      index + 1,
      sub.email,
      sub.source || 'homepage',
      sub.consent ? 'Yes' : 'No',
      new Date(sub.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    ]));

    const csv = toCsv([header, ...rows]);

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="subscribers_${date}.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    // UTF-8 BOM improves Excel compatibility for non-ASCII content.
    res.send('\ufeff' + csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
