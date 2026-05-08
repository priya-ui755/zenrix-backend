const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'zenrix-secret';

function safeJsonForInlineScript(value) {
  // Prevent breaking out of <script> context (e.g. via </script>)
  // and keep the payload valid JS.
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// Google OAuth Routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login.html?error=google-auth-failed' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '30d' });

    const userPayload = {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      membershipTier: req.user.membershipTier,
      avatar: req.user.avatar
    };
    
    // Redirect to a page that will set the token in localStorage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <script>
          localStorage.setItem('userToken', '${token}');
          const userData = ${safeJsonForInlineScript(userPayload)};
          localStorage.setItem('userData', JSON.stringify(userData));
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

    const userPayload = {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      membershipTier: req.user.membershipTier,
      avatar: req.user.avatar
    };
    
    // Redirect to a page that will set the token in localStorage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <script>
          localStorage.setItem('userToken', '${token}');
          const userData = ${safeJsonForInlineScript(userPayload)};
          localStorage.setItem('userData', JSON.stringify(userData));
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
