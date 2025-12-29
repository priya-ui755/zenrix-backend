const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Subscriber = require('../models/Subscriber');
const XLSX = require('xlsx');

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

// Admin: export subscribers to Excel
router.get('/export/excel', requireAdmin, async (_req, res) => {
  try {
    const subs = await Subscriber.find().sort({ createdAt: -1 }).lean();
    
    // Prepare data for Excel
    const excelData = subs.map((sub, index) => ({
      '#': index + 1,
      'Email': sub.email,
      'Source': sub.source || 'homepage',
      'Consent': sub.consent ? 'Yes' : 'No',
      'Subscribed Date': new Date(sub.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // #
      { wch: 30 }, // Email
      { wch: 12 }, // Source
      { wch: 10 }, // Consent
      { wch: 20 }  // Date
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Subscribers');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="subscribers_${date}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
