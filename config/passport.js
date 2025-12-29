const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // User exists, return the user
        return done(null, user);
      }
      
      // Create new user
      const nameParts = profile.displayName.split(' ');
      user = new User({
        firstName: nameParts[0] || profile.displayName,
        lastName: nameParts.slice(1).join(' ') || '',
        email: profile.emails[0].value,
        password: 'oauth-' + Math.random().toString(36).substring(7), // Random password for OAuth users
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
      });
      
      await user.save();
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'your-facebook-app-id',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'your-facebook-app-secret',
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'photos']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // User exists, return the user
        return done(null, user);
      }
      
      // Create new user
      const nameParts = profile.displayName.split(' ');
      user = new User({
        firstName: nameParts[0] || profile.displayName,
        lastName: nameParts.slice(1).join(' ') || '',
        email: profile.emails[0].value,
        password: 'oauth-' + Math.random().toString(36).substring(7), // Random password for OAuth users
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
      });
      
      await user.save();
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));

module.exports = passport;
