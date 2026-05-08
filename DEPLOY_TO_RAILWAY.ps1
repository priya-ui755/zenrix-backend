#!/usr/bin/env pwsh
# Railway.app Quick Deploy Script for Windows PowerShell

Write-Host "🚀 Zenrix Deployment to Railway.app" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Green

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git from https://git-scm.com/download/win" -ForegroundColor Red
    exit
}

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install from https://nodejs.org" -ForegroundColor Red
    exit
}

Write-Host "✅ Git and Node.js detected`n" -ForegroundColor Green

# Step 1: Ensure is a git repository
Write-Host "Step 1️⃣: Initialize Git repository..." -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "Initial commit for Zenrix deployment"
    Write-Host "✅ Git repository initialized`n" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository already exists`n" -ForegroundColor Green
}

# Step 2: Check .gitignore
Write-Host "Step 2️⃣: Verify .gitignore (protecting .env)..." -ForegroundColor Cyan
if (-not (Test-Path ".gitignore")) {
    @"
node_modules/
.env
.env.local
.env.*.local
dist/
build/
*.log
.DS_Store
uploads/
tmp/
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Host "✅ .gitignore created`n" -ForegroundColor Green
} else {
    Write-Host "✅ .gitignore already exists`n" -ForegroundColor Green
}

# Step 3: MongoDB Atlas info
Write-Host "Step 3️⃣: MongoDB Setup Required" -ForegroundColor Cyan
Write-Host @"
Before deploying, you need a cloud database:

1. Visit: https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Create a free cluster
4. Get your connection string:
   mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/zenrix?retryWrites=true&w=majority

5. Copy your connection string - you'll need it in Railway dashboard!

Press Enter to continue when you have your MongoDB URI ready...
"@
Read-Host "Press Enter to continue"

# Step 4: Instructions for Railway
Write-Host "`nStep 4️⃣: Deploy to Railway" -ForegroundColor Cyan
Write-Host @"
Now follow these steps:

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub"
4. Select this repository
5. Railway will auto-detect Node.js

CONFIGURE: In Railway Dashboard → Variables tab, add:

   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/zenrix?retryWrites=true&w=majority
   JWT_SECRET=$(([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()).Replace('-','').Substring(0,32))
   SESSION_SECRET=$(([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()).Replace('-','').Substring(0,32))
   ADMIN_PASSWORD=set-a-strong-password-here
   NODE_ENV=production
   PORT=3000

Then click "Deploy" - that's it! 🎉

Your app will be live at: https://YOUR-PROJECT.railway.app

"@

Write-Host "`n📋 After Deployment - Test Your Site:" -ForegroundColor Yellow
Write-Host "  • Admin: https://YOUR-PROJECT.railway.app/admin-dashboard.html"
Write-Host "  • Products: https://YOUR-PROJECT.railway.app/products.html"
Write-Host "  • Chatbot: https://YOUR-PROJECT.railway.app/products.html (bottom right)"
Write-Host "  • API Test: https://YOUR-PROJECT.railway.app/api/products`n"

Write-Host "🎉 Deployment guide complete!" -ForegroundColor Green
Write-Host "Questions? See DEPLOYMENT.md for details`n"
