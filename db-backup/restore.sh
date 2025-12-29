#!/bin/bash

# Zenrix Database Restore Script (Linux/Mac)
# This script seeds the database with initial data

echo "🌱 Restoring Zenrix database..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Using default MongoDB URI."
    echo ""
fi

# Run the seed script
echo "📦 Running seed script..."
node db-backup/seed-data.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database restored successfully!"
    echo ""
    echo "You can now:"
    echo "  1. Start the server: npm start"
    echo "  2. Login with: john@example.com / password123"
    echo ""
else
    echo ""
    echo "❌ Database restore failed!"
    echo "Please check the error messages above."
    exit 1
fi
