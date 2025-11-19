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

interface MenuItemOptionExport {
  id: string;
  menuItemOrderId: string;
  optionId: string;
  createdAt: string;
  option?: {
    id: string;
    name: string;
    description?: string | null;
    shouldBePrinted?: boolean;
  };
}

interface SelectedSupplementExport {
  id: string;
  menuItemOrderId: string;
  supplementId: string;
  quantity: number;
  createdAt: string;
  supplement?: {
    id: string;
    name: string;
    price: number;
    isDeleted?: boolean;
  };
}

interface MenuItemOrderExport {
  id: string;
  menuItemId: string;
  orderId: string;
  createdAt: string;
  menuItem?: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    description?: string | null;
    isDeleted?: boolean;
    isAvailable?: boolean;
  };
  selectedSupplements?: SelectedSupplementExport[];
  MenuItemOrderMenuItemOption?: MenuItemOptionExport[];
}

interface OrderExport {
  id: string;
  createdAt: string;
  updatedAt: string;
  eatingTableId: string;
  status: "INITIALIZED" | "CONFIRMED" | "WAITING_TO_BE_PRINTED" | "PRINTED" | "SERVED" | "PAID" | "PENDING";
  eatingTable?: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    type: string;
  };
  MenuItemOrderContainer?: MenuItemOrderExport[];
}

interface OrdersExport {
  exportDate?: string;
  totalOrders?: number;
  orders: OrderExport[];
}

async function migrateOrders() {
  console.log("Starting orders migration...");

  const filePath = path.join(__dirname, "../data/orders-export.json");
  if (!fs.existsSync(filePath)) {
    console.error(`Export file not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data: OrdersExport = JSON.parse(raw);

  console.log(`Found ${data.orders?.length ?? 0} orders to migrate`);

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

  // Start transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log("🔄 Transaction started\n");

    let ordersSuccess = 0;
    let ordersErrors = 0;
    let menuItemOrdersSuccess = 0;
    let menuItemOrdersErrors = 0;

    for (const order of data.orders || []) {
      try {
        // Map "PENDING" status to "INITIALIZED" if needed
        const mappedStatus = order.status === "PENDING" ? "INITIALIZED" : order.status;
        
        const orderData: schema.NewOrders = {
          id: order.id,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
          eatingTableId: order.eatingTableId,
          status: mappedStatus as any,
        };

        await db.insert(schema.orders).values(orderData);
        ordersSuccess++;
        console.log(`✓ Migrated order: ${order.id}`);

        // Migrate menu item orders
        if (Array.isArray(order.MenuItemOrderContainer) && order.MenuItemOrderContainer.length > 0) {
          for (const menuItemOrder of order.MenuItemOrderContainer) {
            try {
              // Get the price from the menu item if available
              const price = menuItemOrder.menuItem?.price ?? 0;

              const menuItemOrderData: schema.NewMenuItemOrders = {
                id: menuItemOrder.id,
                createdAt: new Date(menuItemOrder.createdAt),
                updatedAt: new Date(menuItemOrder.createdAt), // Use createdAt if updatedAt not available
                orderId: order.id,
                menuItemId: menuItemOrder.menuItemId,
                quantity: 1, // Default quantity
                price: price,
                status: mappedStatus as any,
              };

              await db.insert(schema.menuItemOrders).values(menuItemOrderData);
              menuItemOrdersSuccess++;
              console.log(`  ✓ Migrated menu item order: ${menuItemOrder.id} (${menuItemOrder.menuItem?.name ?? menuItemOrder.menuItemId})`);

              // Note: selectedSupplements and MenuItemOrderMenuItemOption data
              // will need separate tables if they don't exist yet
              // For now, we're just logging that they exist
              if (menuItemOrder.selectedSupplements && menuItemOrder.selectedSupplements.length > 0) {
                console.log(`    ⓘ Has ${menuItemOrder.selectedSupplements.length} supplement(s) - skipping (table may not exist)`);
              }
              if (menuItemOrder.MenuItemOrderMenuItemOption && menuItemOrder.MenuItemOrderMenuItemOption.length > 0) {
                console.log(`    ⓘ Has ${menuItemOrder.MenuItemOrderMenuItemOption.length} option(s) - skipping (table may not exist)`);
              }

            } catch (err: any) {
              if (err?.code === "23505") {
                console.error(`\n❌ DUPLICATE ENTRY DETECTED: Menu item order ${menuItemOrder.id} already exists`);
                throw new Error(`Duplicate menu item order: ${menuItemOrder.id}`);
              }
              if (err?.code === "23503") {
                console.error(`\n❌ FOREIGN KEY CONSTRAINT: Menu item order ${menuItemOrder.id} - menu item may not exist`);
                throw new Error(`Foreign key constraint for menu item order: ${menuItemOrder.id}`);
              }
              menuItemOrdersErrors++;
              console.error(`\n❌ ERROR: Failed to migrate menu item order ${menuItemOrder.id}:`, err?.message ?? err);
              throw err;
            }
          }
        }

      } catch (err: any) {
        if (err?.code === "23505") {
          console.error(`\n❌ DUPLICATE ENTRY DETECTED: Order ${order.id} already exists`);
          throw new Error(`Duplicate order: ${order.id}`);
        }
        if (err?.code === "23503") {
          console.error(`\n❌ FOREIGN KEY CONSTRAINT: Order ${order.id} - eating table may not exist`);
          throw new Error(`Foreign key constraint for order: ${order.id}`);
        }
        ordersErrors++;
        console.error(`\n❌ ERROR: Failed to migrate order ${order.id}:`, err?.message ?? err);
        throw err;
      }
    }

    await client.query('COMMIT');
    console.log("\n✅ Transaction committed successfully\n");

    console.log("=== Migration Summary ===");
    console.log(`Total orders: ${data.orders?.length ?? 0}`);
    console.log(`Orders migrated: ${ordersSuccess}`);
    console.log(`Orders errors: ${ordersErrors}`);
    console.log(`Menu item orders migrated: ${menuItemOrdersSuccess}`);
    console.log(`Menu item orders errors: ${menuItemOrdersErrors}`);
    console.log("==========================\n");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("\n🔄 Transaction rolled back - all changes reverted\n");
    console.error("Migration failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
    console.log("Database connection closed");
  }
}

migrateOrders()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
