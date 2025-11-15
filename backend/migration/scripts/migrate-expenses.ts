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
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const expense of expensesData.expenses) {
      // Skip deleted expenses
      if (expense.isDeleted) {
        skipCount++;
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
          deletedAt: expense.isDeleted ? new Date(expense.updatedAt) : null,
          createdById: expense.createdById,
          enterpriseId: expense.enterpriseId,
          
          // Menu item specific fields (null for raw materials)
          price: null,
          image: null,
          description: null,
          isAvailable: !expense.isDeleted,
          categoryId: null, // Raw materials don't have categories
          
          // Recipe/production fields
          producedQuantityPerRecipe: null,
          cost: expense.averagePrice > 0 ? expense.averagePrice : null,
          doesExpensesAndRecipesNeedUpdate: false,
          
          // Raw material/inventory fields
          tag: expense.tag,
          unit: expense.unit,
          averagePrice: expense.averagePrice > 0 ? expense.averagePrice : null,
          stockQuantity: expense.stockQuantity,
          inHouseStockQuantity: expense.inHouseStockQuantity,
          inShopStockQuantity: expense.inShopStockQuantity,
          stockConversionRatio: expense.stockConversionRatio,
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
              const subMenuRow: schema.NewMenuItemSubMenuItems = {
                id: mie.id ?? `${mie.menuItemId}-${expense.id}`,
                parentMenuItemId: mie.menuItemId,
                subMenuItemId: expense.id,
                quantity: mie.quantity ?? 1,
                producedMenuItemsQuantity: 1,
                createdAt: new Date(mie.createdAt),
              };

              await db.insert(schema.menuItemSubMenuItems).values(subMenuRow);
            } catch (err: any) {
              // ignore unique constraint (already exists) and rethrow others
              if (err && err.code === "23505") {
                console.log(
                  `⊘ Sub-link already exists: parent=${mie.menuItemId} sub=${expense.id}`
                );
              } else {
                console.error(
                  `✗ Error creating sub-link parent=${mie.menuItemId} sub=${expense.id}:`,
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
        if (error.code === "23505") {
          skipCount++;
          console.log(`⊘ Skipped (already exists): ${expense.name} (${expense.id})`);
        } else {
          errorCount++;
          console.error(`✗ Error migrating ${expense.name}:`, error.message || error);
          console.error(`   Error code: ${error.code}, Detail: ${error.detail}`);
        }
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total expenses: ${expensesData.expenses.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped (already exist): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("========================\n");
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
