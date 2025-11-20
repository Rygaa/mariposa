import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env from the backend directory
// __dirname is backend/migration/data, so ../../.env goes to backend/.env
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  // Try loading from current working directory
  config();
}

// Type definitions for the menu item options export
interface MenuItemOption {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  shouldBePrinted: boolean;
  menuItemMenuItemOption: any[];
  MenuItemOrderMenuItemOption: any[];
}

interface MenuItemOptionsExport {
  exportDate: string;
  totalOptions: number;
  menuItemOptions: MenuItemOption[];
}

async function migrateMenuItemOptions() {
  console.log("Starting menu item options migration...");

  // Read the menu item options export file
  const menuItemOptionsPath = path.join(__dirname, "../data/menu-item-options-export.json");
  const optionsData: MenuItemOptionsExport = JSON.parse(
    fs.readFileSync(menuItemOptionsPath, "utf-8")
  );

  console.log(`Found ${optionsData.menuItemOptions.length} menu item options to migrate`);

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
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; name: string; error: string }> = [];

    // Process each menu item option
    for (const option of optionsData.menuItemOptions) {
      try {
        // Create menuItem of type "MENU_ITEM_OPTION"
        const menuItemData = {
          id: option.id, // Use the same ID from the export
          name: option.name,
          type: ["MENU_ITEM_OPTION"] as Array<"MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION">,
          createdAt: new Date(option.createdAt),
          updatedAt: new Date(option.updatedAt),
          description: option.description,
          isAvailable: true, // Default value
          categoryId: null, // Options don't belong to categories
          price: null, // Options typically don't have their own price
          image: null,
          producedQuantityPerRecipe: null,
          cost: null,
          doesExpensesAndRecipesNeedUpdate: false,
          tag: null,
          unit: null,
          averagePrice: null,
          stockQuantity: 0,
          inHouseStockQuantity: null,
          inShopStockQuantity: null,
          stockConversionRatio: 1,
          createdById: null,
          enterpriseId: null,
        };

        await db.insert(schema.menuItems).values(menuItemData);

        // Create relationships from menu items to this option (if present)
        if (option.menuItemMenuItemOption && option.menuItemMenuItemOption.length > 0) {
          for (const rel of option.menuItemMenuItemOption) {
            try {
              const relData = {
                id: rel.id,
                parentMenuItemId: rel.menuItemId,
                subMenuItemId: option.id,
                quantity: rel.quantity ?? 1,
                producedMenuItemsQuantity: rel.producedMenuItemsQuantity ?? 1,
                createdAt: rel.createdAt ? new Date(rel.createdAt) : new Date(),
              };

              await db.insert(schema.menuItemSubMenuItems).values(relData);
            } catch (err: any) {
              if (err?.code === '23505') continue;
              console.error(`✗ Failed to create option link ${rel.id}:`, err?.message ?? err);
            }
          }
        }

        successCount++;
        console.log(`✓ Migrated option: ${option.name} (${option.id})`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          id: option.id,
          name: option.name,
          error: errorMessage,
        });
        console.error(`✗ Failed to migrate option ${option.name}:`, errorMessage);
      }
    }

    // Summary
    console.log("\n=== Migration Summary ===");
    console.log(`Total options: ${optionsData.menuItemOptions.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\n=== Errors ===");
      errors.forEach((err) => {
        console.log(`- ${err.name} (${err.id}): ${err.error}`);
      });
    }

    console.log("\nMigration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

// Run the migration
migrateMenuItemOptions().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
