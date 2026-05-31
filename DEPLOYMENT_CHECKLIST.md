# 📋 Fashion Hub Deployment Checklist

Use this to track your deployment progress. Check items off as you complete them.

## 🔧 Pre-Deployment Preparation

- [ ] **Read DEPLOYMENT.md** - Full deployment guide in this folder
- [ ] **Choose hosting platform:**
  - [ ] Railway.app (⭐ Recommended - easiest)
  - [ ] Render.com (Good free tier)
  - [ ] Heroku (Add-on based pricing)
  - [ ] Other: _________________
- [ ] **Create MongoDB Atlas account:**
  - [ ] Visit https://mongodb.com/cloud/atlas
  - [ ] Sign up (free)
  - [ ] Create free cluster (M0)
  - [ ] Create database user
  - [ ] Get connection string
  - [ ] Note: `mongodb+srv://username:password@cluster.mongodb.net/fashionhub?retryWrites=true&w=majority`

## 🚀 Railway.app Deployment (Recommended)

### Account Setup
- [ ] **Create Railway.app account** at https://railway.app
- [ ] **Choose sign-in method:**
  - [ ] GitHub
  - [ ] Email
- [ ] **Create account successfully**

### Repository Setup
- [ ] **GitHub account ready** (needed to connect repo)
- [ ] **Repository pushed to GitHub** with all code
- [ ] **Repository visibility:** Public or Private (both work)

### Railway Project Setup
- [ ] **New Project** → "Deploy from GitHub"
- [ ] **Connect GitHub** and authorize Railway
  - [ ] **Select this repository** (fashionhub-backend)
- [ ] **Select branch:** main (or your default branch)
- [ ] **Deploy:** Railway starts automatic deployment

### Environment Variables (Critical!)

Add these to Railway Dashboard → Variables:

- [ ] **MONGODB_URI** 
  ```
  mongodb+srv://fashionhub_user:YOUR_PASSWORD@cluster.mongodb.net/fashionhub?retryWrites=true&w=majority
  ```

- [ ] **JWT_SECRET** (generate random string)
  - Option: Use online generator or: `[Guid]::NewGuid().ToString() + [Guid]::NewGuid().ToString()`
  - Minimum 32 characters

- [ ] **SESSION_SECRET** (generate random string)
  - Different from JWT_SECRET
  - Minimum 32 characters

- [ ] **ADMIN_PASSWORD** 
  - [ ] NOT `admin123`
  - [ ] Secure password (mix of upper, lower, numbers)
  - [ ] NOTE: `admin` is username (always), this is the password

- [ ] **NODE_ENV**
  - [ ] Set value: `production`

- [ ] **PORT** (optional - Railway auto-assigns)
  - [ ] Set value: `3000`

- [ ] **HF_API_KEY** (from .env file)
  - [ ] Copy from your local .env

### Deploy Confirmation
- [ ] **Deployment status:** Green "Deployed" on Railway dashboard
- [ ] **Railway gives you a public URL:** `https://your-project-xxxxx.railway.app`
- [ ] **Railway shows domain:** Domain or Railway.app subdomain
- [ ] **Take note of URL:** You'll use this to share and test

---

## 🧪 Post-Deployment Testing

These tests verify your site works correctly on the public URL.

### Admin Panel Test
- [ ] **Visit:** `https://YOUR-RAILWAY-URL/admin-dashboard.html`
- [ ] **Login:**
  - Username: `admin`
  - Password: Whatever you set in ADMIN_PASSWORD
- [ ] **Login successful?** Can you see the dashboard?
- [ ] **Test Site Settings tab:**
  - [ ] See "Site Settings" in sidebar
  - [ ] Click it
  - [ ] Form loads with all fields
  - [ ] Color picker works
  - [ ] Click "Save Settings"
  - [ ] See success message

### Website Home Page
- [ ] **Visit:** `https://YOUR-RAILWAY-URL/index.html` (or just `https://YOUR-RAILWAY-URL/`)
- [ ] **Page loads fully?**
- [ ] **Theme toggle works?** (top right button)
- [ ] **Logo visible in both light and dark mode?**
- [ ] **Navigation (navbar) works?**
- [ ] **Footer appears?**

### Products Page
- [ ] **Visit:** `https://YOUR-RAILWAY-URL/products.html`
- [ ] **Products load from database?** (See product cards)
- [ ] **Page is responsive** (check on mobile if possible)

### Chatbot Test
- [ ] **Chatbot button visible** (bottom right corner)
- [ ] **Click chatbot** → Window opens
- [ ] **Type message:** "Hi"
- [ ] **Chatbot responds?**
- [ ] **Quick reply buttons appear?** (Track order, Return item, Payment, etc.)
- [ ] **Typing indicator shows** (three dots) while chatbot thinks
- [ ] **Send another message:** "How much is a laptop?"
- [ ] **Chatbot searches knowledge base** and responds about products
- [ ] **Rating buttons appear** (👍 Helpful / 👎 Not helpful)
- [ ] **Close chatbot** and reopen
- [ ] **Chat history shows** (previous messages visible) ✅ This verifies localStorage works

### API Test
- [ ] **Test Products API:** 
  - Visit: `https://YOUR-RAILWAY-URL/api/products`
  - Should see JSON array of products
  - Returns status 200?

- [ ] **Test Knowledge Base API:**
  - Visit: `https://YOUR-RAILWAY-URL/api/knowledge/query?q=laptop`
  - Should see relevant products
  - Returns status 200?

- [ ] **Test Site Settings API:**
  - Visit: `https://YOUR-RAILWAY-URL/api/site-settings`
  - Should see site configuration JSON
  - Returns status 200?

### Theme System Test
- [ ] **On products page, toggle theme:**
  - [ ] Click theme button (top right)
  - [ ] Page switches to light mode
  - [ ] Brand logo visible and colored
  - [ ] All text readable
  - [ ] Click again → Dark mode
  - [ ] Theme persists after refresh

---

## 🌐 Optional: Add Custom Domain

After confirming everything works:

- [ ] **Have a custom domain?** (e.g., fashionhub.com)
- [ ] **In Railway dashboard:** Settings → Domain
- [ ] **Add custom domain** → Point DNS to Railway
- [ ] **Wait 5-15 minutes** for DNS propagation
- [ ] **Test:** Visit `https://your-domain.com`

---

## 📤 Share With Users

When everything tests ✅:

- [ ] **Deployment URL ready** (the Railway URL or custom domain)
- [ ] **Share URL:** `https://YOUR-RAILWAY-URL` or your custom domain
- [ ] **Share instructions with users:**
  ```
  Welcome! Check out our new website:
  https://your-deployment-url
  
  Features:
  - Browse products
  - Chat with our AI chatbot (bottom right)
  - Create support tickets
  - Admin can customize everything
  - Light/Dark theme toggle
  ```

- [ ] **Send admin credentials SECURELY** to admin user:
  - [ ] Username: `admin`
  - [ ] Password: (the one you set)
  - [ ] URL: `https://your-deployment-url/admin-dashboard.html`
  - [ ] ⚠️ Send password in SECURE way (not plain text email)

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- [ ] Check MONGODB_URI is correct
- [ ] Verify password has no special characters (or is URL-encoded)
- [ ] In MongoDB Atlas, ensure IP is whitelisted or "Allow from anywhere"
- [ ] Connection string format: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`

### "Admin login fails"
- [ ] Check ADMIN_PASSWORD in Railway variables
- [ ] Ensure password doesn't have special characters that need escaping
- [ ] Verify you're using username: `admin` (case-sensitive)

### "Chatbot not working"
- [ ] Check HF_API_KEY is set in Railway variables
- [ ] Verify API key is correct (same as local .env)
- [ ] Hugging Face service might be down - check hf.co status

### "Port already in use"
- [ ] Don't hardcode 3000 - let Railway assign it
- [ ] Remove PORT=3000 from variables if Railway complains

### "White blank page"
- [ ] Check browser console (F12) for errors
- [ ] Check Railway logs for server errors
- [ ] Likely a missing environment variable

### "Styles look broken"
- [ ] Hard refresh browser: `Ctrl+Shift+R` (Windows)
- [ ] Check CSS files load (check Network tab in DevTools)
- [ ] Verify paths in HTML are relative (no hardcoded `localhost`)

---

## 📞 Support

Need help?

1. **Check DEPLOYMENT.md** - Has detailed setup for each platform
2. **Railway docs:** https://docs.railway.app
3. **MongoDB Atlas help:** https://docs.mongodb.com/cloud/atlas/
4. **Check your API:** Append `/api/products` to your URL to test backend

---

## ✨ Success Indicators

When you see these ✅, you've successfully deployed:

- ✅ Railway shows "Deployed" status (green)
- ✅ URL is publicly accessible (can visit from different device)
- ✅ Admin login works (username: `admin`, your password)
- ✅ Products page loads data from MongoDB Atlas
- ✅ Chatbot responds to messages
- ✅ Chat history persists after refresh
- ✅ Quick reply buttons appear
- ✅ Theme toggle switches light/dark mode
- ✅ API endpoints return JSON (test /api/products)
- ✅ Logo visible in both light and dark modes

---

**🎉 CONGRATULATIONS!** Your Fashion Hub website is now live and shareable! 🚀
