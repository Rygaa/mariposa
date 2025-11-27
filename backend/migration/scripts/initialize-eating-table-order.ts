import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import { sql } from "drizzle-orm";
import { config } from "dotenv";
import * as path from "path";

// Load .env from the backend directory
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  config();
}

async function initializeEatingTableOrder() {
  console.log("Initializing eating table order indices...");

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
    // Get all tables
    const tables = await db.select().from(schema.eatingTables);

    console.log(`Found ${tables.length} tables`);

    // Update each table with its index
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      await db
        .update(schema.eatingTables)
        .set({ orderIndex: i })
        .where(sql`${schema.eatingTables.id} = ${table.id}`);
      
      console.log(`Set ${table.name} to order ${i}`);
    }

    console.log("Done!");
  } catch (err) {
    console.error("Initialization failed:", err);
    throw err;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

initializeEatingTableOrder()
  .then(() => {
    console.log("✓ Initialization completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Initialization failed:", error);
    process.exit(1);
  });
