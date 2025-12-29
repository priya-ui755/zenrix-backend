# Database Backup & Restore

## Quick Setup on New Machine

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd zenrix-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   - Copy `.env.example` to `.env` (or create `.env`)
   - Update MongoDB connection string if needed

4. **Restore database**
   
   **Windows:**
   ```powershell
   .\db-backup\restore.ps1
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x db-backup/restore.sh
   ./db-backup/restore.sh
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Login with test account**
   - URL: http://localhost:3000
   - Email: `john@example.com`
   - Password: `password123`

## What Gets Restored

✅ Sample users (john@example.com, jane@example.com, admin@zenrix.com)  
✅ 5 Products (electronics, fashion, home)  
✅ 3 Sample orders  
✅ CMS pages (about, contact, terms, etc.)  
✅ UI components (navbar, footer)  
✅ Hero sections and career listings

For detailed documentation, see [db-backup/README.md](db-backup/README.md)
