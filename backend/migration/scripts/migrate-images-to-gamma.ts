import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend/.env BEFORE importing db
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';
import { db } from '../../src/db';
import { menuItems } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFile } from '../../src/utils/fileUpload';

/**
 * Migration script to upload local menu item images to Gamma Files
 * and update the database with the new file IDs
 */

const STORAGE_PATH = path.join(__dirname, '../../storage/menuItems');

// Simple mime type mapping
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

async function migrateMenuItemImages() {
  console.log('🚀 Starting menu item image migration to Gamma Files...\n');

  try {
    // Get all files from storage/menuItems directory
    const files = fs.readdirSync(STORAGE_PATH).filter(file => {
      // Filter out Zone.Identifier files and hidden files
      return !file.includes(':Zone.Identifier') && !file.startsWith('.');
    });

    console.log(`📁 Found ${files.length} image files in storage/menuItems\n`);

    // Get all menu items from database
    const allMenuItems = await db.select().from(menuItems);
    console.log(`📊 Found ${allMenuItems.length} menu items in database\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const menuItem of allMenuItems) {
      // Skip if no image field
      if (!menuItem.image) {
        skippedCount++;
        continue;
      }

      // Get image filenames (should be array of local filenames)
      const imageValue = menuItem.image as any;
      let imageFilenames: string[] = [];
      
      if (Array.isArray(imageValue)) {
        imageFilenames = imageValue;
      } else if (typeof imageValue === 'string') {
        imageFilenames = [imageValue];
      }

      if (imageFilenames.length === 0) {
        skippedCount++;
        continue;
      }

      // Check if already migrated - if filenames don't contain paths or menuItem- prefix, they're file IDs
      const alreadyMigrated = imageFilenames.every(filename => {
        const basename = filename.includes('/') ? path.basename(filename) : filename;
        return !basename.startsWith('menuItem-') && !basename.includes('.');
      });

      if (alreadyMigrated) {
        console.log(`⏭️  Skipping ${menuItem.name} - already migrated (contains file IDs)`);
        skippedCount++;
        continue;
      }

      console.log(`\n📸 Processing: ${menuItem.name} (${menuItem.id})`);
      console.log(`   Local images: ${imageFilenames.join(', ')}`);

      const uploadedFileIds: string[] = [];

      for (const filename of imageFilenames) {
        // Extract just the filename from paths like "/uploads/menuItems/menuItem-xyz.jpg"
        const justFilename = filename.includes('/') 
          ? path.basename(filename) 
          : filename;
        
        const filePath = path.join(STORAGE_PATH, justFilename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.log(`   ⚠️  File not found: ${justFilename}`);
          continue;
        }

        try {
          // Read file as buffer
          const fileBuffer = fs.readFileSync(filePath);
          
          // Get mime type
          const mimeType = getMimeType(filename);

          console.log(`   ⬆️  Uploading ${justFilename} (${(fileBuffer.length / 1024).toFixed(2)} KB)...`);

          // Upload to Gamma Files
          const result = await uploadFile(
            fileBuffer,
            justFilename,
            mimeType
          );

          const fileId = result.file.id;
          uploadedFileIds.push(fileId);

          console.log(`   ✅ Uploaded successfully - File ID: ${fileId}`);

        } catch (uploadError: any) {
          console.error(`   ❌ Failed to upload ${justFilename}:`, uploadError.message);
          errorCount++;
        }
      }

      // Update database with new file IDs
      if (uploadedFileIds.length > 0) {
        try {
          await db
            .update(menuItems)
            .set({ 
              image: uploadedFileIds,
              updatedAt: new Date()
            })
            .where(eq(menuItems.id, menuItem.id));

          console.log(`   💾 Updated database with ${uploadedFileIds.length} file ID(s)`);
          successCount++;
        } catch (dbError: any) {
          console.error(`   ❌ Failed to update database:`, dbError.message);
          errorCount++;
        }
      } else {
        console.log(`   ⚠️  No files uploaded, skipping database update`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount} menu items`);
    console.log(`   ⏭️  Skipped: ${skippedCount} menu items`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (successCount > 0) {
      console.log('✨ Migration completed successfully!');
      console.log('💡 Tip: You can now safely backup the storage/menuItems folder');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateMenuItemImages()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { migrateMenuItemImages };
