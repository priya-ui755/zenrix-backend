# Zenrix Database Backup & Restore

This folder contains the database seed script and restore utilities for the Zenrix e-commerce platform.

## 📦 What's Included

- **seed-data.js** - Node.js script that populates the database with sample data
- **restore.ps1** - PowerShell restore script for Windows
- **restore.sh** - Bash restore script for Linux/Mac
- **README.md** - This file

## 🚀 Quick Start (New Machine Setup)

### Prerequisites
- Node.js installed
- MongoDB running locally (default: `mongodb://localhost:27017/zenrix`)
- Project dependencies installed (`npm install`)

### Restore Database

**Windows (PowerShell):**
```powershell
.\db-backup\restore.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x db-backup/restore.sh
./db-backup/restore.sh
```

**Manual (any OS):**
```bash
node db-backup/seed-data.js
```

## 📊 Sample Data Included

The seed script creates:

- **3 Users** (including test accounts)
- **5 Products** (electronics, fashion, home categories)
- **3 Sample Orders** (various statuses)
- **7 CMS Pages** (home, about, contact, etc.)
- **2 Components** (navbar, footer)
- **1 Hero Section** (homepage banner)
- **2 Career Listings**
- **2 Newsletter Subscribers**

## 🔐 Test User Credentials

After restoring the database, you can login with:

**Regular User:**
- Email: `john@example.com`
- Password: `password123`

**Another User:**
- Email: `jane@example.com`
- Password: `password123`

**Admin User:**
- Email: `admin@zenrix.com`
- Password: (value from `ADMIN_PASSWORD` in `.env`, default: `admin123`)

## ⚙️ Configuration

The seed script uses the `MONGODB_URI` from your `.env` file. If not found, it defaults to:
```
mongodb://localhost:27017/zenrix
```

Make sure your `.env` file contains:
```env
MONGODB_URI=mongodb://localhost:27017/zenrix
ADMIN_PASSWORD=admin123
JWT_SECRET=your-jwt-secret
```

## 🔄 Re-seeding Database

**⚠️ Warning:** Running the seed script will **delete all existing data** in the database and replace it with fresh sample data.

If you want to keep existing data:
1. Open `seed-data.js`
2. Comment out the "Clear existing data" section (lines ~44-53)

## 📝 Notes

- The seed script is idempotent - you can run it multiple times safely
- All passwords are hashed using bcrypt
- Sample orders link to the created users and products
- All CMS pages are published by default
- Products include realistic data with images from Unsplash

## 🐛 Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running: `mongod` or check MongoDB service
- Verify connection string in `.env`

**Module not found errors:**
- Run `npm install` to install dependencies

**Permission denied (Linux/Mac):**
- Make script executable: `chmod +x db-backup/restore.sh`

## 🔗 Related Files

- Main server: `server.js`
- Models: `models/` directory
- Routes: `routes/` directory
- Environment config: `.env`

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose ODM](https://mongoosejs.com/)
- [Project README](../README.md)

---

**Last Updated:** December 2025  
**Zenrix E-commerce Platform**
