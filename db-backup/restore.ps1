# Fashion Hub Database Restore Script (Windows PowerShell)
# This script seeds the database with initial data

Write-Host "Restoring Fashion Hub database..." -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "Warning: .env file not found. Using default MongoDB URI." -ForegroundColor Yellow
    Write-Host ""
}

# Run the seed script
Write-Host "Running seed script..." -ForegroundColor Cyan
node db-backup/seed-data.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Database restored successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Cyan
    Write-Host "  1. Start the server: npm start"
    Write-Host "  2. Login with: john@example.com / password123"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Database restore failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above."
    exit 1
}
