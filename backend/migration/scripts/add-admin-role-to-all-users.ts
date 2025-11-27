import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import { eq } from "drizzle-orm";
import * as path from "path";
import { config } from "dotenv";

// Load .env from the backend directory
const envPath = path.join(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  config();
}

async function addAdminRoleToAllUsers() {
  console.log("\n" + "=".repeat(60));
  console.log("    ADD ADMIN ROLE TO ALL USERS");
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
    console.log("📋 Fetching all users...");
    const allUsers = await db.select().from(schema.users);
    console.log(`✓ Found ${allUsers.length} users\n`);

    if (allUsers.length === 0) {
      console.log("⚠️  No users found in database");
      await pool.end();
      return;
    }

    console.log("🔄 Adding ADMIN role to all users...");
    let updatedCount = 0;
    let alreadyAdminCount = 0;

    for (const user of allUsers) {
      const currentRoles = user.role || ["MEMBER"];
      
      // Check if user already has ADMIN role
      if (currentRoles.includes("ADMIN")) {
        console.log(`  ⏭️  ${user.email} already has ADMIN role`);
        alreadyAdminCount++;
        continue;
      }

      // Add ADMIN role
      const newRoles = [...currentRoles, "ADMIN"];
      
      await db
        .update(schema.users)
        .set({ role: newRoles })
        .where(eq(schema.users.id, user.id));

      console.log(`  ✓ Added ADMIN role to ${user.email} (roles: ${newRoles.join(", ")})`);
      updatedCount++;
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Already admin: ${alreadyAdminCount}`);
    console.log("=".repeat(60) + "\n");

    console.log("✅ Successfully added ADMIN role to all users!");
  } catch (error) {
    console.error("❌ Error adding ADMIN role to users:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
addAdminRoleToAllUsers()
  .then(() => {
    console.log("🎉 Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
