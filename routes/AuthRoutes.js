const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Google OAuth Routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login.html?error=google-auth-failed' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '30d' });
    
    // Redirect to a page that will set the token in localStorage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <script>
          localStorage.setItem('userToken', '${token}');
          localStorage.setItem('userData', '${JSON.stringify({
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            membershipTier: req.user.membershipTier,
            avatar: req.user.avatar
          })}');
          window.location.href = '/profile.html';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
      </html>
    `);
  }
);

// Facebook OAuth Routes
router.get('/facebook', passport.authenticate('facebook', {
  scope: ['email']
}));

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login.html?error=facebook-auth-failed' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '30d' });
    
    // Redirect to a page that will set the token in localStorage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <script>
          localStorage.setItem('userToken', '${token}');
          localStorage.setItem('userData', '${JSON.stringify({
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            membershipTier: req.user.membershipTier,
            avatar: req.user.avatar
          })}');
          window.location.href = '/profile.html';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
      </html>
    `);
  }
);

module.exports = router;
