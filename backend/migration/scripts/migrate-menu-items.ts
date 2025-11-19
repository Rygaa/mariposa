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
  config();
}

interface MenuItemExport {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  isAvailable?: boolean;
  price?: number | null;
  image?: string | null;
  producedQuantityPerRecipe?: number | null;
  cost?: number | null;
  doesExpensesAndRecipesNeedUpdate?: boolean;
  tag?: string[] | null;
  unit?: string | null;
  averagePrice?: number | null;
  stockQuantity?: number;
  inHouseStockQuantity?: number | null;
  inShopStockQuantity?: number | null;
  stockConversionRatio?: number;
  createdById?: string | null;
  enterpriseId?: string | null;
  deletedAt?: string | null;
  // Some exports include a `type` array or boolean flags like `isRecipe`
  type?: string[];
  isRecipe?: boolean;
  // Optional relations arrays
  menuItemPrices?: any[];
}

interface MenuItemsExport {
  exportDate?: string;
  totalMenuItems?: number;
  menuItems: MenuItemExport[];
}

async function migrateMenuItems() {
  console.log("Starting menu items migration...");

  const filePath = path.join(__dirname, "../data/menu-items-export.json");
  if (!fs.existsSync(filePath)) {
    console.error(`Export file not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data: MenuItemsExport = JSON.parse(raw);

  console.log(`Found ${data.menuItems?.length ?? 0} menu items to migrate`);

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
    let success = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of data.menuItems || []) {
      try {
        // Determine type array
        let typeArr: Array<"MENU_ITEM"|"RECIPE"|"RAW_MATERIAL"|"SUPPLEMENT"|"MENU_ITEM_OPTION"> = ["MENU_ITEM"];
        if (Array.isArray(item.type) && item.type.length > 0) {
          // trust exported type if present
          typeArr = item.type as any;
        } else if (item.isRecipe) {
          typeArr = ["RECIPE"];
        }

        const menuItemData: any = {
          id: item.id,
          name: item.name,
          type: typeArr,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          description: item.description ?? null,
          isAvailable: item.isDeleted ? false : (item.isAvailable ?? true),
          categoryId: null,
          price: item.price ?? null,
          image: item.image ?? null,
          producedQuantityPerRecipe: item.producedQuantityPerRecipe ?? null,
          cost: item.cost ?? null,
          doesExpensesAndRecipesNeedUpdate: item.doesExpensesAndRecipesNeedUpdate ?? false,
          tag: item.tag ?? null,
          unit: item.unit ?? null,
          averagePrice: item.averagePrice ?? null,
          stockQuantity: item.stockQuantity ?? 0,
          inHouseStockQuantity: item.inHouseStockQuantity ?? null,
          inShopStockQuantity: item.inShopStockQuantity ?? null,
          stockConversionRatio: item.stockConversionRatio ?? 1,
          createdById: item.createdById ?? null,
          enterpriseId: item.enterpriseId ?? null,
          deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
        } as schema.NewMenuItems;

        await db.insert(schema.menuItems).values(menuItemData);

        // Optionally insert related prices if the export includes them
        if (Array.isArray((item as any).menuItemPrices) && (item as any).menuItemPrices.length > 0) {
          for (const p of (item as any).menuItemPrices) {
            try {
              const priceRow: any = {
                id: p.id ?? crypto.randomUUID(),
                priceValue: p.priceValue ?? p.value ?? null,
                unitValue: p.unitValue ?? null,
                multiplier: p.multiplier ?? 1,
                description: p.description ?? null,
                priceType: p.priceType ?? (p.type ?? "selling"),
                createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                menuItemId: item.id,
              } as schema.NewItemPrices;

              await db.insert(schema.itemPrices).values(priceRow);
            } catch (err: any) {
              if (err?.code === "23505") continue;
              console.error(`Failed to insert price for ${item.id}:`, err?.message ?? err);
            }
          }
        }

        success++;
        console.log(`✓ Migrated: ${item.name} (${item.id})`);
      } catch (err: any) {
        if (err?.code === "23505") {
          skipped++;
          console.log(`⊘ Skipped (already exists): ${item.name} (${item.id})`);
          continue;
        }
        errors++;
        console.error(`✗ Error migrating ${item.name} (${item.id}):`, err?.message ?? err);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total items: ${data.menuItems?.length ?? 0}`);
    console.log(`Migrated: ${success}`);
    console.log(`Skipped (already existed): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log("==========================\n");
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

migrateMenuItems()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
