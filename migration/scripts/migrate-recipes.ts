import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  config();
}

// Type definitions for the recipes export
interface MenuItemExpense {
  id: string;
  menuItemId: string;
  expenseId: string;
  quantity: number;
  createdAt: string;
  expense: {
    id: string;
    name: string;
    unit: string;
    averagePrice: number;
  };
}

interface ParentMenuItem {
  id: string;
  parentMenuItemId: string;
  subMenuItemId: string;
  quantity: number;
  producedMenuItemsQuantity: number;
  createdAt: string;
  parentMenuItem: {
    id: string;
    name: string;
    price: number;
    cost: number;
  };
}

interface SubMenuItem {
  id: string;
  parentMenuItemId: string;
  subMenuItemId: string;
  quantity: number;
  producedMenuItemsQuantity: number;
  createdAt: string;
  parentMenuItem: {
    id: string;
    name: string;
    price: number;
    cost: number;
  };
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  cost: number | null;
  price: number;
  isAvailable: boolean;
  producedQuantityPerRecipe: number | null;
  menuItemExpenses: MenuItemExpense[];
  parentMenuItemContainer: ParentMenuItem[];
  subMenuItemContainer: SubMenuItem[];
}

interface RecipesExport {
  exportDate: string;
  totalRecipes: number;
  recipes: Recipe[];
}

async function migrateRecipes() {
  console.log("Starting recipes migration...");

  // Read the recipes export file
  const recipesPath = path.join(__dirname, "../data/recipes-export.json");
  const recipesData: RecipesExport = JSON.parse(
    fs.readFileSync(recipesPath, "utf-8")
  );

  console.log(`Found ${recipesData.recipes.length} recipes to migrate`);

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
    // First, delete all existing RECIPE menuItems
    console.log("Deleting existing RECIPE menuItems...");
    await pool.query(`
      DELETE FROM "MenuItem" 
      WHERE type @> '["RECIPE"]'::jsonb
    `);
    console.log("✓ Existing RECIPE menuItems deleted\n");

    let successCount = 0;
    let errorCount = 0;
    let relationshipCount = 0;
    const errors: Array<{ id: string; name: string; error: string }> = [];

    // Process each recipe
    for (const recipe of recipesData.recipes) {
      try {
        // Create menuItem of type "RECIPE"
        const menuItemData = {
          id: recipe.id, // Use the same ID from the export
          name: recipe.name,
          type: ["RECIPE"] as Array<"MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION">,
          createdAt: new Date(recipe.createdAt),
          updatedAt: new Date(recipe.updatedAt),
          description: recipe.description,
          isAvailable: !recipe.isDeleted, // Set availability based on isDeleted
          categoryId: null, // Recipes don't belong to categories
          price: null, // Recipes don't have a selling price (they have cost)
          image: null,
          producedQuantityPerRecipe: null, // Can be set later if needed
          cost: recipe.cost, // Production cost from the recipe
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
          deletedAt: recipe.isDeleted ? new Date(recipe.updatedAt) : null,
        };

        await db.insert(schema.menuItems).values(menuItemData);

        // Create relationships with expenses (RAW_MATERIAL menuItems)
        for (const menuItemExpense of recipe.menuItemExpenses) {
          try {
            const relationshipData = {
              id: menuItemExpense.id, // Use the same ID from the export
              parentMenuItemId: recipe.id, // The recipe
              subMenuItemId: menuItemExpense.expenseId, // The expense/raw material
              quantity: menuItemExpense.quantity,
              producedMenuItemsQuantity: 1,
              createdAt: new Date(menuItemExpense.createdAt),
            };

            await db.insert(schema.menuItemSubMenuItems).values(relationshipData);
            relationshipCount++;
          } catch (relError) {
            const relErrorMessage = relError instanceof Error ? relError.message : String(relError);
            console.error(
              `  ⚠ Failed to create relationship for recipe ${recipe.name} with expense ${menuItemExpense.expense.name}: ${relErrorMessage}`
            );
          }
        }

        // Create relationships where this recipe is used as a sub-item in other menu items
        for (const subMenuItem of recipe.subMenuItemContainer) {
          try {
            const relationshipData = {
              id: subMenuItem.id, // Use the same ID from the export
              parentMenuItemId: subMenuItem.parentMenuItemId, // The parent menu item
              subMenuItemId: recipe.id, // This recipe as a sub-item
              quantity: subMenuItem.quantity,
              producedMenuItemsQuantity: subMenuItem.producedMenuItemsQuantity,
              createdAt: new Date(subMenuItem.createdAt),
            };

            await db.insert(schema.menuItemSubMenuItems).values(relationshipData);
            relationshipCount++;
          } catch (relError) {
            const relErrorMessage = relError instanceof Error ? relError.message : String(relError);
            console.error(
              `  ⚠ Failed to create relationship for recipe ${recipe.name} used in ${subMenuItem.parentMenuItem.name}: ${relErrorMessage}`
            );
          }
        }

        successCount++;
        console.log(
          `✓ Migrated recipe: ${recipe.name} (${recipe.id}) with ${recipe.menuItemExpenses.length} expenses + ${recipe.subMenuItemContainer.length} parent links`
        );
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          id: recipe.id,
          name: recipe.name,
          error: errorMessage,
        });
        console.error(`✗ Failed to migrate recipe ${recipe.name}:`, errorMessage);
      }
    }

    // Summary
    console.log("\n=== Migration Summary ===");
    console.log(`Total recipes: ${recipesData.recipes.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Recipe-expense relationships created: ${relationshipCount}`);

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
migrateRecipes().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
