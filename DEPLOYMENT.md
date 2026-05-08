# 🚀 Zenrix Public Deployment Guide

## Quick Links
- **Railway.app** (Recommended ⭐) - https://railway.app
- **Render.com** (Alternative) - https://render.com
- **MongoDB Atlas** (Database) - https://mongodb.com/cloud/atlas

---

## ✅ Step 1: Prepare MongoDB (Cloud Database)

> **Required:** Your app needs a cloud database because local MongoDB won't be accessible on deployment

### Create MongoDB Atlas (Free)

1. Visit: https://www.mongodb.com/cloud/atlas
2. Click "Sign Up" → Create account
3. Create Organization → Create Project
4. Click "Build a Cluster" → Select **M0 (Free)**
5. Choose nearest region to you
6. Click "Create Cluster" (takes ~3 minutes)
7. Click "Connect":
   - Username: `zenrix_user`
   - Password: Generate secure password
   - Add your IP (or "Allow from anywhere" for testing)
8. Copy connection string:
   ```
   mongodb+srv://zenrix_user:YOUR_PASSWORD@cluster.mongodb.net/zenrix?retryWrites=true&w=majority
   ```

**Save this connection string** - you'll need it next.

---

## ⚡ Option A: Deploy to Railway (EASIEST - 3 minutes)

### Setup Railway

1. **Sign Up:** https://railway.app (use GitHub, Google, or email)

2. **Add Project:**
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Connect your GitHub account → Select this repo

3. **Connect MongoDB:**
   - In Railway dashboard, click "New Service"
   - Select "Create New" → "MongoDB"
   - Railway creates MongoDB Atlas automatically

4. **Configure Environment:**
   - Go to "Variables" tab
   - Add these variables:
     ```
     MONGODB_URI=mongodb+srv://zenrix_user:PASSWORD@cluster.mongodb.net/zenrix?retryWrites=true&w=majority
     JWT_SECRET=generate-random-string-here-min-32-chars
     SESSION_SECRET=generate-another-random-string-here
     ADMIN_PASSWORD=change-from-admin123-to-something-secure
     NODE_ENV=production
     ```

5. **Deploy:**
   - Railway auto-deploys when you push to GitHub
   - Or click "Deploy" button manually
   - Get your public URL from Railway dashboard

**Your site is live!** Share the URL ✨

---

## 🎨 Option B: Deploy to Render (SIMPLE)

1. Visit: https://render.com/register
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect to your repo
5. Configure:
   - **Name:** zenrix-app
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
6. Under "Environment," add variables (same as Railway above)
7. Click "Create Web Service"
8. Get your Render URL

**Site is live!** 🎉

---

## 🔐 Security Checklist Before Sharing

- [ ] Changed `ADMIN_PASSWORD` from `admin123`
- [ ] Updated `JWT_SECRET` with random 32+ character string
- [ ] Updated `SESSION_SECRET` with random 32+ character string
- [ ] Using production MongoDB URI (MongoDB Atlas)
- [ ] `NODE_ENV=production` is set
- [ ] Never commit `.env` with real secrets to git

---

## 🧪 Test Your Deployment

After deploy succeeds:

1. **Check Admin:** `https://your-domain.com/admin-dashboard.html`
   - Login with username: `admin` / password: whatever you set
   - Verify Site Settings tab works
   - Test customization (colors, logo, etc.)

2. **Check Chatbot:** `https://your-domain.com/products.html`
   - Open chatbot
   - Ask "Hi" 
   - Should see quick reply buttons (Track order, Return item, etc.)
   - Test typing indicators and history

3. **Check Theme:** `https://your-domain.com/products.html`
   - Toggle light/dark mode
   - Logo should be visible in both
   - Colors should follow your Site Settings

4. **Check API:**
   - Products: `https://your-domain.com/api/products`
   - Knowledge: `https://your-domain.com/api/knowledge/query?q=laptop`
   - Should return JSON data

---

## 🔗 After Deployment: Update Callbacks

If you added Google/Facebook OAuth:

### Google OAuth Callback
1. Google Cloud Console → Your Project → Credentials
2. Update OAuth app redirect URI to: `https://your-domain.com/api/auth/google/callback`

### Facebook OAuth Callback
1. Facebook Developers → Your App → Settings
2. Update valid redirect URLs to: `https://your-domain.com/api/auth/facebook/callback`

---

## 📊 Monitoring & Logs

### Railway
- Dashboard → Logs tab shows real-time output
- Issues show in "Build" or "Deploy" logs

### Render
- Dashboard → Logs tab shows application output
- Failed deploys show error details

### Check Health
```bash
# Test if API is responsive
curl https://your-domain.com/api/products

# Should return JSON array of products
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Error: Cannot connect to MongoDB** | Check `MONGODB_URI` - ensure MongoDB Atlas allows your IP |
| **Admin login fails** | Check `ADMIN_PASSWORD` matches what you set in environment |
| **Chatbot not working** | Verify `HF_API_KEY` is valid in environment variables |
| **Port conflicts** | Platform auto-assigns port - don't hardcode PORT 3000 in code |
| **Blank pages** | Check browser console for errors - likely missing environment variable |

---

## 📈 Scale Later

If your site grows:
- **Railway:** Paid plans start at $5/month
- **Render:** Starter tier with auto-scaling available
- **DigitalOcean:** Droplets start at $4/month (full VPS control)

---

## 🎯 Your Deployment Checklist

- [ ] Created MongoDB Atlas account & cluster
- [ ] Copied MongoDB connection string
- [ ] Generated strong secrets (JWT, SESSION, ADMIN_PASSWORD)
- [ ] Chose hosting platform (Railway recommended)
- [ ] Added environment variables to platform dashboard
- [ ] Deployed successfully
- [ ] Tested admin panel, chatbot, theme switching
- [ ] Updated OAuth callbacks (if using social login)
- [ ] Shared URL with users
- [ ] Bookmarked deployment dashboard for future updates

---

## 💡 Pro Tips

1. **Keep Docs:** Save your deployment URL + admin credentials somewhere safe
2. **Monitor:** Check logs weekly if you have active users
3. **Backups:** MongoDB Atlas auto-backs up free tier
4. **Custom Domain:** After deploy, point your domain DNS to platform

---

**Questions? Common issues?**
- Railway docs: https://docs.railway.app
- Render docs: https://render.com/docs
- MongoDB docs: https://docs.mongodb.com/manual

**Next steps?** Tell me:
- Which platform you prefer (Railway / Render / other)
- Your MongoDB Atlas connection string is ready
- Your desired strong password for admin
