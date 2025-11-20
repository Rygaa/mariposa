/**
 * Migration script to convert menu item images from JSONB array to MenuItemImage table
 * 
 * This script:
 * 1. Reads all menu items with images
 * 2. Creates MenuItemImage records for each fileId
 * 3. Marks the first image with shouldBeUsedInMenuItemsPage = true
 * 4. Logs progress and errors
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../../src/db';
import { menuItems, menuItemImages } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

async function migrateMenuItemImages() {
  console.log("🚀 Starting menu item images migration...");

  // delete all menu item images - for testing purposes
  await db.delete(menuItemImages).where(eq(menuItemImages.id, menuItemImages.id));

  try {
    // Get all menu items that have images
    const allMenuItems = await db
      .select()
      .from(menuItems)
    //   .where(eq(menuItems.deletedAt, null as any));

    console.log(`📊 Found ${allMenuItems.length} menu items to process`);

    let totalImagesCreated = 0;
    let itemsWithImages = 0;
    let errorCount = 0;

    for (const menuItem of allMenuItems) {
      const images = menuItem.image || [];
      
      if (images.length === 0) {
        continue;
      }

      itemsWithImages++;
      console.log(`\n📷 Processing menu item: ${menuItem.name} (${menuItem.id})`);
      console.log(`   Found ${images.length} image(s)`);

      for (let index = 0; index < images.length; index++) {
        const fileId = images[index];
        
        if (!fileId) {
          console.log(`   ⚠️  Skipping empty fileId at index ${index}`);
          continue;
        }

        try {
          // Check if this image already exists
          const existing = await db
            .select()
            .from(menuItemImages)
            .where(eq(menuItemImages.fileId, fileId))
            .limit(1);

          if (existing.length > 0) {
            console.log(`   ⏭️  Image already exists: ${fileId}`);
            continue;
          }

          // Create MenuItemImage record
          const id = crypto.randomUUID();
          await db.insert(menuItemImages).values({
            id,
            menuItemId: menuItem.id,
            fileId,
            // Mark first image as the one to use in menu items page
            shouldBeUsedInMenuItemsPage: index === 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          totalImagesCreated++;
          console.log(`   ✅ Created MenuItemImage record for fileId: ${fileId} ${index === 0 ? "(marked as main)" : ""}`);
        } catch (error) {
          errorCount++;
          console.error(`   ❌ Error creating MenuItemImage for fileId ${fileId}:`, error);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Migration Summary:");
    console.log(`   Total menu items processed: ${allMenuItems.length}`);
    console.log(`   Menu items with images: ${itemsWithImages}`);
    console.log(`   MenuItemImage records created: ${totalImagesCreated}`);
    console.log(`   Errors encountered: ${errorCount}`);
    console.log("=".repeat(60));

    if (errorCount === 0) {
      console.log("\n✨ Migration completed successfully!");
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} error(s)`);
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration
migrateMenuItemImages()
  .then(() => {
    console.log("\n👋 Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  });
