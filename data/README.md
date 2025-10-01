# Data Folder - Development vs Production Separation

## ⚠️ IMPORTANT: Data Isolation

This folder contains JSON files that store application data. **These files are environment-specific and should NOT be shared between development and production.**

## 🚫 Git Tracking Status

- ✅ **All data files are now IGNORED by Git** (in .gitignore)
- ✅ **Local development data stays local**
- ✅ **Production data stays on production server**
- ✅ **Example templates are tracked for reference**

## 📁 File Structure

### Development Files (LOCAL ONLY - NOT in Git)
- `members.json` - Local member data for development
- `users.json` - Local user data for development  
- `signups.json` - Local signup data for development
- `signup-settings.json` - Local signup settings for development
- `data-version-config.json` - Local data version for development

### Example Templates (TRACKED in Git)
- `*.example.json` - Template files showing data structure
- `README.md` - This documentation file

### Shared Reference Files (TRACKED in Git)
- `test-dataset.json` - Sample test data for importing during development

## 🔄 Environment-Specific Data Handling

### Local Development (localhost)
- Uses file-based storage in this `data/` folder
- Data persists locally for development testing
- Changes do NOT affect production
- Server: `server.js` reads/writes to local JSON files

### Production (Netlify)
- Uses in-memory storage in Netlify Functions
- Data is ephemeral and resets on deployment
- Completely isolated from local development
- Server: `netlify/functions/*.js` use in-memory objects

## 🚀 Setting Up Local Development

1. **Copy example files to actual files:**
   ```bash
   cp data/members.example.json data/members.json
   cp data/users.example.json data/users.json
   cp data/signups.example.json data/signups.json
   cp data/signup-settings.example.json data/signup-settings.json
   cp data/data-version-config.example.json data/data-version-config.json
   ```

2. **Start local development:**
   ```bash
   # Start backend server (port 3000)
   node server.js
   
   # Start frontend server (port 8000)
   python3 -m http.server 8000
   ```

3. **Import test data (optional):**
   - Use the admin panel "Import Test Data" button
   - Or manually populate data through the UI

## 🔒 Data Security

- **Local data files are ignored by Git** - no accidental commits
- **Production data is in-memory only** - no persistent storage
- **No sensitive data in repository** - clean separation
- **Example files contain dummy data** - safe for public repos

## 🛠️ Troubleshooting

### If you see data files in Git status:
```bash
# Remove from Git tracking (keeps local files)
git rm --cached data/*.json

# Commit the removal
git commit -m "Remove data files from Git tracking"
```

### To reset local development data:
```bash
# Copy fresh templates
cp data/*.example.json data/
# Remove .example from filenames
for file in data/*.example.json; do mv "$file" "${file/.example/}"; done
```

## 📋 Best Practices

1. **Never commit actual data files** - only templates
2. **Use example files as reference** for data structure
3. **Test locally with realistic data** but keep it separate
4. **Reset production data** through admin controls, not file changes
5. **Document data structure changes** in example files

---

**Remember: Local development data should stay local, production data should stay in production!** 🎯