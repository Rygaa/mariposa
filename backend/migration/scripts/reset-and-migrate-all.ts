import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import * as path from "path";
import { config } from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Load .env from the backend directory
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  config();
}

async function resetDatabase() {
  console.log("=== Starting Database Reset ===\n");

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
    console.log("🗑️  Deleting all menuItemSubMenuItems relationships...");
    await pool.query('DELETE FROM "MenuItemSubMenuItem"');
    console.log("✓ Relationships deleted\n");

    console.log("🗑️  Deleting all itemPrices...");
    await pool.query('DELETE FROM "ItemPrice"');
    console.log("✓ Item prices deleted\n");

    console.log("🗑️  Deleting all menuItems...");
    await pool.query('DELETE FROM "MenuItem"');
    console.log("✓ Menu items deleted\n");

    console.log("=== Database Reset Complete ===\n");
  } catch (error) {
    console.error("Database reset failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function runMigrationScript(scriptName: string, description: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Running: ${description}`);
  console.log(`${"=".repeat(60)}\n`);

  const scriptPath = path.join(__dirname, scriptName);
  
  try {
    const { stdout, stderr } = await execPromise(
      `npx ts-node "${scriptPath}"`,
      {
        cwd: path.join(__dirname, "../.."),
        env: { ...process.env },
      }
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log(`\n✓ ${description} completed successfully\n`);
  } catch (error: any) {
    console.error(`\n✗ ${description} failed:`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw new Error(`Migration script ${scriptName} failed`);
  }
}

async function runAllMigrations() {
  console.log("\n" + "=".repeat(60));
  console.log("    FULL DATABASE RESET AND MIGRATION");
  console.log("=".repeat(60) + "\n");

  try {
    // Step 1: Reset database
    await resetDatabase();

    // Step 2: Run migration scripts in order
    await runMigrationScript("migrate-menu-items.ts", "Menu Items Migration (MENU_ITEM)");
    await runMigrationScript("migrate-images-to-gamma.ts", "Upload Images to Gamma Files");
    await runMigrationScript("migrate-menu-item-images.ts", "Menu Item Images Migration");
    await runMigrationScript("migrate-eating-tables.ts", "Eating Tables Migration");
    await runMigrationScript("migrate-recipes.ts", "Recipes Migration (RECIPE)");
    await runMigrationScript("migrate-expenses.ts", "Expenses Migration (RAW_MATERIAL)");
    await runMigrationScript("migrate-supplements.ts", "Supplements Migration (SUPPLEMENT)");
    await runMigrationScript("migrate-menu-lists.ts", "Menu Lists Migration");
    await runMigrationScript("migrate-menu-item-options.ts", "Menu Item Options Migration (MENU_ITEM_OPTION)");

    console.log("\n" + "=".repeat(60));
    console.log("    ✓ ALL MIGRATIONS COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("    ✗ MIGRATION PROCESS FAILED");
    console.error("=".repeat(60) + "\n");
    throw error;
  }
}

// Run the full migration process
runAllMigrations()
  .then(() => {
    console.log("Process completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  });
