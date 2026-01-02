const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware for regular user authentication
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  const token = auth.split(' ')[1];
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'zenrix-secret';
    const payload = jwt.verify(token, JWT_SECRET);
    
    if (!payload || !payload.userId) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Fetch user from database
    const user = await User.findById(payload.userId).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  const token = auth.split(' ')[1];
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'zenrix-secret';
    const payload = jwt.verify(token, JWT_SECRET);
    // simple check: token is valid and includes isAdmin flag
    if (!payload || !payload.isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    req.admin = true;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

module.exports = { requireAuth, requireAdmin };