import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { eq, sql, inArray } from "drizzle-orm";

// Load .env from the backend directory
// __dirname is backend/migration/data, so ../../.env goes to backend/.env
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  // Try loading from current working directory
  config();
}

// Type definitions for the expenses export
interface ExpensePrice {
  id: string;
  priceValue: number;
  unitValue: number | null;
  multiplier: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  expenseId: string;
}

interface Expense {
  id: string;
  name: string;
  tag: string[];
  unit: "gramme" | "Kg" | "portion" | "liter" | "milliliter";
  averagePrice: number;
  stockQuantity: number;
  inHouseStockQuantity: number;
  inShopStockQuantity: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  enterpriseId: string | null;
  stockConversionRatio: number;
  prices: ExpensePrice[];
  expensesTag: any[];
  createdBy: any;
  Enterprise: any;
  menuItemExpenses?: Array<{
    id: string;
    createdAt: string;
    expenseId: string;
    menuItemId: string;
    quantity: number | null;
    menuItem?: { id: string; name: string };
  }>;
}

interface ExpensesExport {
  exportDate: string;
  totalExpenses: number;
  expenses: Expense[];
}

async function migrateExpensesToMenuItems() {
  console.log("Starting expenses migration...");

  // Read the expenses export file
  const expensesPath = path.join(__dirname, "../data/expenses-export.json");
  const expensesData: ExpensesExport = JSON.parse(
    fs.readFileSync(expensesPath, "utf-8")
  );

  console.log(`Found ${expensesData.expenses.length} expenses to migrate`);

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
    // First, delete all existing RAW_MATERIAL items and their links
    console.log("Deleting existing RAW_MATERIAL items and their links...");
    
    // Get all RAW_MATERIAL IDs using SQL with jsonb contains operator
    const rawMaterials = await db.execute<{ id: string }>(
      sql`SELECT id FROM "MenuItem" WHERE type::jsonb @> '["RAW_MATERIAL"]'::jsonb`
    );
    
    const rawMaterialIds = rawMaterials.rows.map(rm => rm.id);
    
    if (rawMaterialIds.length > 0) {
      console.log(`Found ${rawMaterialIds.length} RAW_MATERIAL items to delete`);
      
      // Delete links where raw material is the child (subMenuItemId)
      await db
        .delete(schema.menuItemSubMenuItems)
        .where(inArray(schema.menuItemSubMenuItems.subMenuItemId, rawMaterialIds));
      
      // Delete prices associated with raw materials
      await db
        .delete(schema.itemPrices)
        .where(inArray(schema.itemPrices.menuItemId, rawMaterialIds));
      
      // Delete the raw materials themselves using SQL
      await db.execute(
        sql`DELETE FROM "MenuItem" WHERE type::jsonb @> '["RAW_MATERIAL"]'::jsonb`
      );
      
      console.log(`✓ Deleted ${rawMaterialIds.length} RAW_MATERIAL items and their associated data\n`);
    } else {
      console.log("No existing RAW_MATERIAL items found\n");
    }

    let successCount = 0;
    let deletedCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let linksCreated = 0;
    let linksSkipped = 0;

    for (const expense of expensesData.expenses) {
      // Skip deleted expenses
      if (expense.isDeleted) {
        deletedCount++;
        console.log(`⊘ Skipped (deleted): ${expense.name} (${expense.id})`);
        continue;
      }

      try {
        // Map expense to menuItem with RAW_MATERIAL type
        const menuItem: schema.NewMenuItems = {
          id: expense.id, // Use the same ID
          name: expense.name,
          type: ["RAW_MATERIAL"],
          createdAt: new Date(expense.createdAt),
          updatedAt: new Date(expense.updatedAt),
          deletedAt: expense.isDeleted ? new Date(expense.updatedAt) : undefined,
          createdById: expense.createdById || undefined,
          enterpriseId: expense.enterpriseId || undefined,
          
          // Menu item specific fields (undefined for raw materials)
          price: undefined,
          image: undefined,
          description: undefined,
          isAvailable: !expense.isDeleted,
          categoryId: undefined, // Raw materials don't have categories
          
          // Recipe/production fields
          producedQuantityPerRecipe: undefined,
          cost: expense.averagePrice && expense.averagePrice > 0 ? expense.averagePrice : undefined,
          doesExpensesAndRecipesNeedUpdate: false,
          
          // Raw material/inventory fields
          tag: expense.tag && expense.tag.length > 0 ? expense.tag : undefined,
          unit: expense.unit,
          averagePrice: expense.averagePrice && expense.averagePrice > 0 ? expense.averagePrice : undefined,
          stockQuantity: expense.stockQuantity || 0,
          inHouseStockQuantity: expense.inHouseStockQuantity || undefined,
          inShopStockQuantity: expense.inShopStockQuantity || undefined,
          stockConversionRatio: expense.stockConversionRatio || 1,
        };

        // Insert the menu item
        await db.insert(schema.menuItems).values(menuItem);
        
        // Insert associated prices as itemPrices
        for (const price of expense.prices) {
          const itemPrice: schema.NewItemPrices = {
            id: price.id, // Use the same ID
            priceValue: price.priceValue,
            unitValue: price.unitValue,
            multiplier: price.multiplier,
            description: price.description,
            priceType: "buying", // Expenses are buying prices
            createdAt: new Date(price.createdAt),
            menuItemId: expense.id,
          };

          await db.insert(schema.itemPrices).values(itemPrice);
        }

        // Create MenuItemSubMenuItem rows linking parent menu items to this raw material
        if (Array.isArray(expense.menuItemExpenses) && expense.menuItemExpenses.length > 0) {
          for (const mie of expense.menuItemExpenses) {
            try {
              // Check if parent menu item exists
              const parentExists = await db
                .select({ id: schema.menuItems.id })
                .from(schema.menuItems)
                .where(eq(schema.menuItems.id, mie.menuItemId))
                .limit(1);

              if (parentExists.length === 0) {
                linksSkipped++;
                console.log(
                  `  ⊘ Skipped link (parent not found): parent=${mie.menuItemId} → raw_material=${expense.name}`
                );
                continue;
              }

              const subMenuRow: schema.NewMenuItemSubMenuItems = {
                id: mie.id ?? `${mie.menuItemId}-${expense.id}`,
                parentMenuItemId: mie.menuItemId,
                subMenuItemId: expense.id,
                quantity: mie.quantity ?? 1,
                producedMenuItemsQuantity: 1,
                createdAt: new Date(mie.createdAt),
              };

              await db.insert(schema.menuItemSubMenuItems).values(subMenuRow);
              linksCreated++;
              console.log(
                `  ✓ Created link: parent=${mie.menuItemId} → raw_material=${expense.name} (qty: ${mie.quantity ?? 1})`
              );
            } catch (err: any) {
              // ignore unique constraint (already exists) and rethrow others
              if (err && err.code === "23505") {
                console.log(
                  `  ⊘ Link already exists: parent=${mie.menuItemId} → raw_material=${expense.id}`
                );
              } else {
                console.error(
                  `  ✗ Error creating link parent=${mie.menuItemId} → raw_material=${expense.id}:`,
                  err && err.message ? err.message : err
                );
              }
            }
          }
        }

        successCount++;
        console.log(`✓ Migrated: ${expense.name} (${expense.id})`);
      } catch (error: any) {
        // Check if it's a unique constraint error (item already exists)
        const errorCode = error.code || error.cause?.code;
        if (errorCode === "23505") {
          skipCount++;
          console.log(`⊘ Skipped (already exists): ${expense.name} (${expense.id})`);
          
          // Still try to create links for existing expenses
          if (Array.isArray(expense.menuItemExpenses) && expense.menuItemExpenses.length > 0) {
            for (const mie of expense.menuItemExpenses) {
              try {
                // Check if parent menu item exists
                const parentExists = await db
                  .select({ id: schema.menuItems.id })
                  .from(schema.menuItems)
                  .where(eq(schema.menuItems.id, mie.menuItemId))
                  .limit(1);

                if (parentExists.length === 0) {
                  linksSkipped++;
                  console.log(
                    `  ⊘ Skipped link (parent not found): parent=${mie.menuItemId} → raw_material=${expense.name}`
                  );
                  continue;
                }

                const subMenuRow: schema.NewMenuItemSubMenuItems = {
                  id: mie.id ?? `${mie.menuItemId}-${expense.id}`,
                  parentMenuItemId: mie.menuItemId,
                  subMenuItemId: expense.id,
                  quantity: mie.quantity ?? 1,
                  producedMenuItemsQuantity: 1,
                  createdAt: new Date(mie.createdAt),
                };

                await db.insert(schema.menuItemSubMenuItems).values(subMenuRow);
                linksCreated++;
                console.log(
                  `  ✓ Created link: parent=${mie.menuItemId} → raw_material=${expense.name} (qty: ${mie.quantity ?? 1})`
                );
              } catch (err: any) {
                // ignore unique constraint (already exists)
                const errCode = err?.code || err?.cause?.code;
                if (errCode === "23505") {
                  console.log(
                    `  ⊘ Link already exists: parent=${mie.menuItemId} → raw_material=${expense.id}`
                  );
                } else {
                  console.error(
                    `  ✗ Error creating link parent=${mie.menuItemId} → raw_material=${expense.id}:`,
                    err && err.message ? err.message : err
                  );
                }
              }
            }
          }
        } else {
          errorCount++;
          console.error(`✗ Error migrating ${expense.name}:`, error.message || error);
          console.error(`   Error code: ${errorCode}, Detail: ${error.detail || error.cause?.detail}`);
        }
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total expenses in export: ${expensesData.expenses.length}`);
    console.log(`Skipped (marked as deleted): ${deletedCount}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped (already exist): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`\nLinks created: ${linksCreated}`);
    console.log(`Links skipped (parent not found): ${linksSkipped}`);
    console.log("========================\n");
    
    if (linksSkipped > 0) {
      console.log("⚠️  WARNING: Some links were skipped because parent menu items don't exist yet.");
      console.log("   Run the menu items migration first, then re-run this script to create the links.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

// Run the migration
migrateExpensesToMenuItems()
  .then(() => {
    console.log("Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
