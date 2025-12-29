# OAuth Setup Guide

## 🔐 Social Login Configuration

The application now supports Google and Facebook OAuth authentication. To enable these features, you need to obtain API credentials from each provider.

---

## 🟦 Google OAuth Setup

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Zenrix Store") → Click "Create"

### 2. Enable Google+ API
1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 3. Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in application name: "Zenrix"
   - Add your email
   - Skip optional fields → Save
4. Back to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: "Zenrix Web Client"
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
   - Click "Create"
5. Copy the **Client ID** and **Client Secret**

### 4. Add to .env file
```env
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## 🔵 Facebook OAuth Setup

### 1. Create a Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" → Click "Next"
4. Enter app name (e.g., "Zenrix Store")
5. Enter app contact email
6. Click "Create App"

### 2. Add Facebook Login Product
1. In your app dashboard, find "Add a Product"
2. Click "Set Up" on **Facebook Login**
3. Choose "Web" platform
4. Enter Site URL: `http://localhost:3000`
5. Click "Save" → "Continue"

### 3. Configure Facebook Login Settings
1. In the left sidebar, go to "Facebook Login" → "Settings"
2. Add to "Valid OAuth Redirect URIs":
   ```
   http://localhost:3000/api/auth/facebook/callback
   ```
3. Click "Save Changes"

### 4. Get App Credentials
1. Go to "Settings" → "Basic"
2. Copy the **App ID** and **App Secret** (click "Show" to reveal)

### 5. Add to .env file
```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback
```

---

## 🚀 Testing OAuth

1. Restart your server after adding credentials to `.env`
2. Visit `http://localhost:3000/login.html` or `http://localhost:3000/register.html`
3. Click "Google" or "Facebook" button
4. Authorize the application
5. You'll be redirected back and automatically logged in!

---

## 🔒 Security Notes

### For Production:
1. **Update callback URLs** to your production domain:
   - Google: `https://yourdomain.com/api/auth/google/callback`
   - Facebook: `https://yourdomain.com/api/auth/facebook/callback`

2. **Enable HTTPS** - OAuth requires secure connections in production

3. **Update session cookie settings** in server.js:
   ```javascript
   cookie: { 
     secure: true,  // Requires HTTPS
     httpOnly: true,
     sameSite: 'strict'
   }
   ```

4. **Set strong secrets** in production .env file

5. **Review OAuth scopes** - Only request necessary permissions

---

## ❓ Troubleshooting

### "Redirect URI mismatch" error
- Ensure callback URLs in Google/Facebook console exactly match your .env file
- Check for trailing slashes
- Verify http vs https

### "App not verified" warning (Google)
- Normal for development
- For production, submit app for verification

### Users not being created
- Check MongoDB connection
- Verify User model has correct schema
- Check server console for errors

---

## 📝 How It Works

1. User clicks "Google" or "Facebook" button
2. Redirected to provider's login page
3. User authorizes the app
4. Provider redirects back to callback URL with authorization code
5. Backend exchanges code for user profile data
6. Backend creates or finds user in database
7. JWT token generated and stored in localStorage
8. User redirected to profile page

---

## ⚠️ Development Mode

Without setting up OAuth credentials, the buttons will redirect but fail authentication. The app will still work with email/password authentication.

To use social login:
1. Set up credentials as described above
2. Add to `.env` file
3. Restart server
4. Test login flow
