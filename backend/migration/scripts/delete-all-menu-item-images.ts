import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env from the backend directory
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  // Try loading from current working directory
  config();
}

async function deleteAllMenuItemImages() {
  console.log("Starting deletion of all menu item images...");

  // Initialize database connection
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const url = new URL(databaseUrl);
  const pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    user: url.username,
    password: url.password,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const db = drizzle(pool, { schema });

  try {
    // Get all menu item images from database
    const allImages = await db.select().from(schema.menuItemImages);
    
    console.log(`Found ${allImages.length} images in database`);

    // Delete all records from menuItemImages table
    await db.delete(schema.menuItemImages);
    
    console.log(`Deleted ${allImages.length} records from MenuItemImage table`);

    // Delete physical files from storage/files directory
    const filesDir = path.join(__dirname, "../../storage/files");
    if (fs.existsSync(filesDir)) {
      const files = fs.readdirSync(filesDir);
      let deletedFilesCount = 0;
      
      for (const file of files) {
        const filePath = path.join(filesDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          deletedFilesCount++;
        }
      }
      
      console.log(`Deleted ${deletedFilesCount} physical files from storage/files`);
    }

    // Delete physical files from storage/menuItems directory
    const menuItemsDir = path.join(__dirname, "../../storage/menuItems");
    if (fs.existsSync(menuItemsDir)) {
      const files = fs.readdirSync(menuItemsDir);
      let deletedMenuItemFilesCount = 0;
      
      for (const file of files) {
        const filePath = path.join(menuItemsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          deletedMenuItemFilesCount++;
        }
      }
      
      console.log(`Deleted ${deletedMenuItemFilesCount} physical files from storage/menuItems`);
    }

    console.log("✅ Successfully deleted all menu item images!");
  } catch (error) {
    console.error("❌ Error deleting menu item images:", error);
    throw error;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

// Run the script
deleteAllMenuItemImages()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
