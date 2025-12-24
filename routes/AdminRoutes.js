const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Simple admin login - returns a short-lived JWT
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, error: 'Password required' });

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
  const JWT_SECRET = process.env.JWT_SECRET || 'zenrix-secret';

  if (password !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token });
});

module.exports = router;