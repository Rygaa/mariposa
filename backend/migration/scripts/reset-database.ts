import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import * as path from "path";
import { config } from "dotenv";

// Load .env from the backend directory
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  config();
}

async function resetDatabase() {
  console.log("\n" + "=".repeat(60));
  console.log("    DATABASE RESET");
  console.log("=".repeat(60) + "\n");

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
    console.log("🗑️  Deleting all menuItemOrders...");
    const result1 = await pool.query('DELETE FROM "MenuItemOrder"');
    console.log(`✓ Deleted ${result1.rowCount} menu item orders\n`);

    console.log("🗑️  Deleting all orders...");
    const result2 = await pool.query('DELETE FROM "Order"');
    console.log(`✓ Deleted ${result2.rowCount} orders\n`);

    console.log("🗑️  Deleting all eating tables...");
    const result3 = await pool.query('DELETE FROM "EatingTable"');
    console.log(`✓ Deleted ${result3.rowCount} eating tables\n`);

    console.log("🗑️  Deleting all menuItemImages...");
    const result4 = await pool.query('DELETE FROM "MenuItemImage"');
    console.log(`✓ Deleted ${result4.rowCount} menu item images\n`);

    console.log("🗑️  Deleting all menuItemSubMenuItems relationships...");
    const result5 = await pool.query('DELETE FROM "MenuItemSubMenuItem"');
    console.log(`✓ Deleted ${result5.rowCount} relationships\n`);

    console.log("🗑️  Deleting all itemPrices...");
    const result6 = await pool.query('DELETE FROM "ItemPrice"');
    console.log(`✓ Deleted ${result6.rowCount} item prices\n`);

    console.log("🗑️  Deleting all menuItems...");
    const result7 = await pool.query('DELETE FROM "MenuItem"');
    console.log(`✓ Deleted ${result7.rowCount} menu items\n`);

    console.log("🗑️  Deleting all categories...");
    const result8 = await pool.query('DELETE FROM "Category"');
    console.log(`✓ Deleted ${result8.rowCount} categories\n`);

    console.log("=".repeat(60));
    console.log("    ✓ DATABASE RESET COMPLETE");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("    ✗ DATABASE RESET FAILED");
    console.error("=".repeat(60) + "\n");
    console.error("Error:", error);
    throw error;
  } finally {
    await pool.end();
    console.log("Database connection closed\n");
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log("Reset completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Reset failed:", error);
    process.exit(1);
  });
