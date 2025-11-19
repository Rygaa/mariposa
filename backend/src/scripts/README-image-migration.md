# Image Migration Script

This script migrates local menu item images from `storage/menuItems` to Gamma Files and updates the database with the new file IDs.

## Prerequisites

1. **Gamma Files Server**: Make sure your Gamma Files server is running and accessible
2. **Environment Variables**: Ensure these are set in `backend/.env`:
   ```bash
   GAMMA_URL=http://localhost:3000  # Your Gamma Files server URL
   GAMMA_API_KEY=your-api-key-here  # Your API key
   GAMMA_FOLDER_ID=optional-folder  # Optional: specific folder for uploads
   ```

## Running the Migration

From the backend directory, run:

```bash
npm run migrate:images
```

Or directly with ts-node:

```bash
ts-node src/scripts/migrate-images-to-gamma.ts
```

## What the Script Does

1. **Scans Storage**: Reads all image files from `storage/menuItems/` directory
2. **Fetches Menu Items**: Gets all menu items from the database
3. **Identifies Local Images**: Finds menu items that still reference local file paths
4. **Uploads to Gamma**: Uploads each image file to Gamma Files storage
5. **Updates Database**: Replaces local file paths with Gamma file IDs in the database

## File Naming Pattern

The script handles files with the naming pattern:
```
menuItem-{timestamp}-{random}-{originalName}.{ext}
```

Example: `menuItem-1752778927008-805667982-caramel.jpg`

## Migration Process

For each menu item:
- ✅ **Successfully migrated**: Image uploaded and database updated
- ⏭️ **Skipped**: Already migrated (image is array) or no image
- ⚠️ **Warning**: File not found locally
- ❌ **Error**: Upload or database update failed

## Output Example

```
🚀 Starting menu item image migration to Gamma Files...

📁 Found 52 image files in storage/menuItems
📊 Found 25 menu items in database

📸 Processing: Caramel Coffee (abc-123)
   Local images: menuItem-1752778927008-805667982-caramel.jpg
   ⬆️  Uploading menuItem-1752778927008-805667982-caramel.jpg (245.32 KB)...
   ✅ Uploaded successfully - File ID: gamma-file-id-xyz
   💾 Updated database with 1 file ID(s)

============================================================
📊 Migration Summary:
   ✅ Successfully migrated: 20 menu items
   ⏭️  Skipped: 3 menu items
   ❌ Errors: 2
============================================================

✨ Migration completed successfully!
💡 Tip: You can now safely backup the storage/menuItems folder
```

## After Migration

1. **Verify**: Check that menu item images display correctly in the application
2. **Backup**: Create a backup of `storage/menuItems/` folder
3. **Optional Cleanup**: After verification, you can archive or delete local image files

## Troubleshooting

### Connection Refused Error
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**Solution**: Make sure your Gamma Files server is running on the configured port.

### Authentication Error
**Solution**: Verify your `GAMMA_API_KEY` is correct in `.env`

### File Not Found
**Solution**: Ensure the image files exist in `storage/menuItems/` directory

## Rollback

If you need to rollback:
1. The script doesn't delete local files, so they remain in `storage/menuItems/`
2. You can manually update the database to restore old image paths if needed
3. Always backup your database before running migrations
