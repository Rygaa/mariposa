import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

// Load .env from the backend directory
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  config();
}

interface MenuItemExport {
  id: string;
  name: string;
  price?: number | null;
  image?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  isAvailable?: boolean;
  menuListId: string;
  producedQuantityPerRecipe?: number | null;
  recipeId?: string | null;
  cost?: number | null;
  isRecipe?: boolean;
  shouldAppearInScreenshot?: boolean;
  doesExpensesAndRecipesNeedUpdate?: boolean;
}

interface MenuListExport {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isUnlisted: boolean;
  iconname?: string | null;
  index?: number | null;
  menuItemContainer?: MenuItemExport[];
}

interface MenuListsExport {
  exportDate?: string;
  totalMenuLists?: number;
  menuLists: MenuListExport[];
}

async function migrateMenuLists() {
  console.log("Starting menu lists migration...");

  const filePath = path.join(__dirname, "../data/menu-lists-export.json");
  if (!fs.existsSync(filePath)) {
    console.error(`Export file not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data: MenuListsExport = JSON.parse(raw);

  console.log(`Found ${data.menuLists?.length ?? 0} menu lists to migrate`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

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
    // Reset categories table first
    console.log("Resetting categories table...");
    await db.delete(schema.categories);
    console.log("✓ Categories table cleared\n");

    let categoriesSuccess = 0;
    let categoriesSkipped = 0;
    let categoriesErrors = 0;
    let menuItemsSuccess = 0;
    let menuItemsSkipped = 0;
    let menuItemsErrors = 0;

    for (const menuList of data.menuLists || []) {
      let categoryExists = false;
      
      try {
        // Insert category (menu list)
        const categoryData: any = {
          id: menuList.id,
          name: menuList.name,
          createdAt: new Date(menuList.createdAt),
          updatedAt: new Date(menuList.updatedAt),
          isUnlisted: menuList.isUnlisted ?? false,
        };

        // Only add optional fields if they exist
        if (menuList.iconname) {
          categoryData.iconname = menuList.iconname;
        }
        if (menuList.index !== null && menuList.index !== undefined) {
          categoryData.index = menuList.index;
        }

        await db.insert(schema.categories).values(categoryData);

        categoriesSuccess++;
        console.log(`✓ Migrated category: ${menuList.name} (${menuList.id})`);
        categoryExists = true;

      } catch (err: any) {
        if (err.code === "23505") {
          // Duplicate - skip but continue with menu items
          categoriesSkipped++;
          console.log(`⊘ Category already exists: ${menuList.name}`);
          categoryExists = true;
        } else {
          console.error(`✗ Error migrating category ${menuList.name}:`);
          console.error(`   Error code: ${err.code}`);
          console.error(`   Error message: ${err.message}`);
          categoriesErrors++;
        }
      }

      // Update menu items to link them with this category
      if (categoryExists && menuList.menuItemContainer && menuList.menuItemContainer.length > 0) {
        for (const item of menuList.menuItemContainer) {
          try {
            // First, check if the menu item exists
            const [existingItem] = await db
              .select()
              .from(schema.menuItems)
              .where(eq(schema.menuItems.id, item.id))
              .limit(1);

            if (!existingItem) {
              console.error(`  ✗ Menu item not found: ${item.name} (${item.id})`);
              console.error(`     This item needs to be migrated first before linking to category.`);
              throw new Error(`Menu item ${item.id} not found in database. Please migrate menu items first.`);
            }

            console.log('found')

            // Update the menu item to link it with the category
            await db
              .update(schema.menuItems)
              .set({ categoryId: menuList.id })
              .where(eq(schema.menuItems.id, item.id));

            menuItemsSuccess++;
            console.log(`  ✓ Linked menu item: ${item.name}`);

          } catch (itemErr: any) {
            console.error(`  ✗ Error linking menu item ${item.name}:`, itemErr.message);
            menuItemsErrors++;
            throw itemErr; // Stop migration on error
          }
        }
        console.log(`  → Linked ${menuList.menuItemContainer.length} menu items to ${menuList.name}`);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Categories - Success: ${categoriesSuccess}, Skipped: ${categoriesSkipped}, Errors: ${categoriesErrors}`);
    console.log(`Menu Items - Success: ${menuItemsSuccess}, Skipped: ${menuItemsSkipped}, Errors: ${menuItemsErrors}`);
    console.log("========================\n");

  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

migrateMenuLists()
  .then(() => {
    console.log("✓ Migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Migration failed:", err);
    process.exit(1);
  });
