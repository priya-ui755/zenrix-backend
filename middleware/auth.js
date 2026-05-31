const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware for regular user authentication
async function requireAuth(req, res, next) {
  // accept Authorization header or cookie
  const authHeader = req.headers.authorization;
  const cookieToken = (req.cookies && req.cookies.adminToken) ? req.cookies.adminToken : null;
  const raw = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : cookieToken;
  if (!raw) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  const token = raw;
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fashionhub-secret';
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
  // accept Authorization header or cookie (for server-side admin session)
  const auth = req.headers.authorization;
  const cookieToken = (req.cookies && (req.cookies.adminToken || req.cookies.adminTokenPublic)) ? (req.cookies.adminToken || req.cookies.adminTokenPublic) : null;
  const usedPublic = (req.cookies && req.cookies.adminTokenPublic) ? true : false;
  const headerToken = (auth && auth.startsWith('Bearer ')) ? auth.split(' ')[1] : null;
  // Prefer cookie-based admin session when available; stale localStorage/header tokens
  // should not override a valid HttpOnly cookie after reload.
  const raw = cookieToken || headerToken;
  try { console.debug('[auth] requireAdmin token source header=', !!auth, 'cookie=', !!cookieToken, 'publicCookieUsed=', usedPublic); } catch(e) {}
  if (!raw) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  const token = raw;
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fashionhub-secret';
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