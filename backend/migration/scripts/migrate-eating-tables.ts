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

interface OrderExport {
  id: string;
  createdAt: string;
  updatedAt: string;
  eatingTableId: string;
  status: "INITIALIZED" | "CONFIRMED" | "WAITING_TO_BE_PRINTED" | "PRINTED" | "SERVED" | "PAID";
}

interface EatingTableExport {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  type: "TAKEAWAY" | "EMPLOYEES" | "WAST" | "GIFT";
  isDefault?: boolean;
  OrderContainer?: OrderExport[];
}

interface EatingTablesExport {
  exportDate?: string;
  totalEatingTables?: number;
  eatingTables: EatingTableExport[];
}

async function migrateEatingTables() {
  console.log("Starting eating tables migration...");

  const filePath = path.join(__dirname, "../data/eating-tables-export.json");
  if (!fs.existsSync(filePath)) {
    console.error(`Export file not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data: EatingTablesExport = JSON.parse(raw);

  console.log(`Found ${data.eatingTables?.length ?? 0} eating tables to migrate`);

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
    let tablesSuccess = 0;
    let tablesSkipped = 0;
    let tablesErrors = 0;

    for (const table of data.eatingTables || []) {
      try {
        // Insert eating table
        await db.insert(schema.eatingTables).values({
          id: table.id,
          name: table.name,
          createdAt: new Date(table.createdAt),
          updatedAt: new Date(table.updatedAt),
          isActive: table.isActive ?? true,
          isDefault: table.isDefault ?? false,
          type: table.type || "TAKEAWAY",
        });

        tablesSuccess++;
        console.log(`✓ Migrated eating table: ${table.name} (${table.id})`);

      } catch (err: any) {
        if (err.code === "23505") {
          // Duplicate - skip
          tablesSkipped++;
          console.log(`⊘ Skipped duplicate eating table: ${table.name}`);
        } else {
          console.error(`✗ Error migrating eating table ${table.name}:`, err.message);
          tablesErrors++;
        }
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Eating Tables - Success: ${tablesSuccess}, Skipped: ${tablesSkipped}, Errors: ${tablesErrors}`);
    console.log("========================\n");

  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

migrateEatingTables()
  .then(() => {
    console.log("✓ Migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Migration failed:", err);
    process.exit(1);
  });
