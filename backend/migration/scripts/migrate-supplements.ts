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

// Type definitions for the menu item supplements export
interface Supplement {
  id: string;
  name: string;
  price: number;
  isDeleted: boolean;
}

interface MenuItemSupplement {
  id: string;
  menuItemId: string;
  supplementId: string;
  createdAt: string;
  menuItem: {
    id: string;
    name: string;
    price: number;
    isAvailable: boolean;
  };
  supplement: Supplement;
}

interface MenuItemSupplementsExport {
  exportDate: string;
  totalRelationships: number;
  menuItemSupplements: MenuItemSupplement[];
}

async function migrateSupplements() {
  console.log("Starting supplements migration...");

  // Read the supplements export file
  const supplementsPath = path.join(__dirname, "../data/menu-item-supplements-export.json");
  const supplementsData: MenuItemSupplementsExport = JSON.parse(
    fs.readFileSync(supplementsPath, "utf-8")
  );

  console.log(`Found ${supplementsData.menuItemSupplements.length} supplement relationships`);

  // Extract unique supplements
  const uniqueSupplements = new Map<string, Supplement>();
  for (const relationship of supplementsData.menuItemSupplements) {
    if (relationship.supplement && !uniqueSupplements.has(relationship.supplement.id)) {
      uniqueSupplements.set(relationship.supplement.id, relationship.supplement);
    }
  }

  console.log(`Found ${uniqueSupplements.size} unique supplements to migrate`);

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

    // Process each unique supplement
    for (const [supplementId, supplement] of uniqueSupplements) {
      try {
        // Create menuItem of type "SUPPLEMENT"
        const menuItemData = {
          id: supplement.id, // Use the same ID from the export
          name: supplement.name,
          type: ["SUPPLEMENT"] as Array<"MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION">,
          createdAt: new Date(), // Use current date since supplements don't have createdAt in export
          updatedAt: new Date(),
          description: null,
          isAvailable: !supplement.isDeleted, // Set availability based on isDeleted
          categoryId: null, // Supplements don't belong to categories
          price: supplement.price, // Supplements have a price
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
          deletedAt: null,
        };

        await db.insert(schema.menuItems).values(menuItemData);

        successCount++;
        console.log(`✓ Migrated supplement: ${supplement.name} (${supplement.id})`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          id: supplement.id,
          name: supplement.name,
          error: errorMessage,
        });
        console.error(`✗ Failed to migrate supplement ${supplement.name}:`, errorMessage);
      }
    }

    // Create relationships between menu items and supplements
    let relSuccess = 0;
    for (const rel of supplementsData.menuItemSupplements) {
      try {
        const relData = {
          id: rel.id,
          parentMenuItemId: rel.menuItemId,
          subMenuItemId: rel.supplementId,
          quantity: 1,
          producedMenuItemsQuantity: 1,
          createdAt: rel.createdAt ? new Date(rel.createdAt) : new Date(),
        };

        await db.insert(schema.menuItemSubMenuItems).values(relData);
        relSuccess++;
      } catch (err: any) {
        // ignore duplicates, log others
        if (err?.code === '23505') continue;
        console.error(`✗ Failed to create supplement link ${rel.id}:`, err?.message ?? err);
      }
    }

    console.log(`\n✓ Created ${relSuccess} supplement relationships`);

    // Summary
    console.log("\n=== Migration Summary ===");
    console.log(`Total unique supplements: ${uniqueSupplements.size}`);
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
migrateSupplements().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
