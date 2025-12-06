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

async function migrateOrders2() {
  console.log("Starting orders migration from orders-export2.json...");

  const filePath = path.join(__dirname, "../data/orders-export2.json");
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

  try {
    console.log("🔄 Starting transaction...\n");

    let ordersSuccess = 0;
    let ordersSkipped = 0;
    let menuItemOrdersSuccess = 0;
    let supplementsSuccess = 0;
    let optionsSuccess = 0;
    let missingMenuItems = new Set<string>();
    let missingSupplements = new Set<string>();
    let missingOptions = new Set<string>();
    let createdMenuItems = 0;
    let createdSupplements = 0;
    let createdOptions = 0;

    // Use drizzle's transaction API
    await db.transaction(async (tx) => {
      for (const order of data.orders || []) {
        try {
          // Check if order already exists
          const existingOrder = await tx
            .select()
            .from(schema.orders)
            .where(eq(schema.orders.id, order.id))
            .limit(1);

          if (existingOrder.length > 0) {
            ordersSkipped++;
            console.log(`⊘ Order ${order.id} already exists - skipping`);
            continue;
          }

          // Map "PENDING" status to "INITIALIZED" if needed
          const mappedStatus = order.status === "PENDING" ? "INITIALIZED" : order.status;
          
          const orderData: schema.NewOrders = {
            id: order.id,
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.updatedAt),
            eatingTableId: order.eatingTableId,
            status: mappedStatus as any,
          };

          await tx.insert(schema.orders).values(orderData);
          ordersSuccess++;
          console.log(`✓ Migrated order: ${order.id}`);

          // Migrate menu item orders
          if (Array.isArray(order.MenuItemOrderContainer) && order.MenuItemOrderContainer.length > 0) {
            for (const menuItemOrder of order.MenuItemOrderContainer) {
              try {
                // Skip specific menu items
                if (menuItemOrder.menuItemId === "0e62033a-dfe0-4798-8b99-9fba6f00c0ce") {
                  console.log(`  ⊘ Skipping menu item order: ${menuItemOrder.id} (${menuItemOrder.menuItemId})`);
                  continue;
                }

                // Replace specific menu item ID if needed
                if (menuItemOrder.menuItemId === "a6a38c7a-b3e3-4343-86b8-6f626b480c94") {
                  console.log(`  🔄 Replacing menu item ID ${menuItemOrder.menuItemId} with fd86b433-d1f1-4c50-845d-adba0e72bedb`);
                  menuItemOrder.menuItemId = "fd86b433-d1f1-4c50-845d-adba0e72bedb";
                }
                if (menuItemOrder.menuItemId === "f6b51f48-1a58-4f4f-bb80-44907aa5abb0") {
                  console.log(`  🔄 Replacing menu item ID ${menuItemOrder.menuItemId} with 7f1872d8-99e6-49b4-ba8d-2d0a3073ad40`);
                  menuItemOrder.menuItemId = "7f1872d8-99e6-49b4-ba8d-2d0a3073ad40";
                }
                if (menuItemOrder.menuItemId === "68b91b46-00d0-40ee-bf9c-dd9dd901583b") {
                  console.log(`  🔄 Replacing menu item ID ${menuItemOrder.menuItemId} with fd6d99ef-1332-49d0-b9ca-4e0dcf2501a7`);
                  menuItemOrder.menuItemId = "fd6d99ef-1332-49d0-b9ca-4e0dcf2501a7";
                }
                if (menuItemOrder.menuItemId === "4e5f105f-0836-4b3c-bcc4-f633daddd4b6") {
                  console.log(`  🔄 Replacing menu item ID ${menuItemOrder.menuItemId} with 055906e1-7d86-43a7-a7a7-d469ddc3b84e`);
                  menuItemOrder.menuItemId = "055906e1-7d86-43a7-a7a7-d469ddc3b84e";
                }
             

                // Verify menu item exists in database, create if not
                let menuItemExists = await tx
                  .select()
                  .from(schema.menuItems)
                  .where(eq(schema.menuItems.id, menuItemOrder.menuItemId))
                  .limit(1);

                if (menuItemExists.length === 0) {
                  const itemName = menuItemOrder.menuItem?.name ?? `Unknown Item`;
                  const itemPrice = menuItemOrder.menuItem?.price ?? 0;
                  const itemDescription = menuItemOrder.menuItem?.description;
                  const itemImage = menuItemOrder.menuItem?.image;
                  
                  console.log(`  🔨 Creating missing menu item '${itemName}' (${menuItemOrder.menuItemId})`);
                  
                  // Create the menu item
                  await tx.insert(schema.menuItems).values({
                    id: menuItemOrder.menuItemId,
                    name: itemName,
                    type: ["MENU_ITEM"],
                    price: itemPrice,
                    description: itemDescription,
                    isAvailable: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  });
                  
                  createdMenuItems++;
                  missingMenuItems.add(`${itemName} (${menuItemOrder.menuItemId})`);
                }

                // Get the price from the menu item if available
                const price = menuItemOrder.menuItem?.price ?? 0;

                const menuItemOrderData: schema.NewMenuItemOrders = {
                  id: menuItemOrder.id,
                  createdAt: new Date(menuItemOrder.createdAt),
                  updatedAt: new Date(menuItemOrder.createdAt),
                  orderId: order.id,
                  menuItemId: menuItemOrder.menuItemId,
                  quantity: 1, // Default quantity
                  price: price,
                };

                await tx.insert(schema.menuItemOrders).values(menuItemOrderData);
                menuItemOrdersSuccess++;
                console.log(`  ✓ Migrated menu item order: ${menuItemOrder.id} (${menuItemOrder.menuItem?.name ?? menuItemOrder.menuItemId})`);

                // Migrate selected supplements
                if (menuItemOrder.selectedSupplements && menuItemOrder.selectedSupplements.length > 0) {
                  for (const supplement of menuItemOrder.selectedSupplements) {
                    // Replace specific supplement ID if needed
                    if (supplement.supplementId === "22ef11b5-2ce9-4b8a-8d58-d08c84af6cdc") {
                      console.log(`    🔄 Replacing supplement ID ${supplement.supplementId} with c524586d-0537-4566-a8d4-89d3cee11047`);
                      supplement.supplementId = "c524586d-0537-4566-a8d4-89d3cee11047";
                    }
                    if (supplement.supplementId === "19e4c2f6-7aa0-4791-ae48-56a7a4e3a425") {
                      console.log(`    🔄 Replacing supplement ID ${supplement.supplementId} with 0f7cb029-0a65-49f2-b5a0-1ac42f9b547d`);
                      supplement.supplementId = "0f7cb029-0a65-49f2-b5a0-1ac42f9b547d";
                    }
              
                    // Verify supplement exists in database, create if not
                    let supplementExists = await tx
                      .select()
                      .from(schema.menuItems)
                      .where(eq(schema.menuItems.id, supplement.supplementId))
                      .limit(1);

                    if (supplementExists.length === 0) {
                      const suppName = supplement.supplement?.name ?? 'Unknown Supplement';
                      const suppPrice = supplement.supplement?.price ?? 0;
                      
                      console.log(`    🔨 Creating missing supplement '${suppName}' (${supplement.supplementId})`);
                      
                      // Create the supplement as a menu item with SUPPLEMENT type
                      await tx.insert(schema.menuItems).values({
                        id: supplement.supplementId,
                        name: suppName,
                        type: ["SUPPLEMENT"],
                        price: suppPrice,
                        isAvailable: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      });
                      
                      createdSupplements++;
                      missingSupplements.add(`${suppName} (${supplement.supplementId})`);
                    }

                    // Insert supplement as menu item order with parent reference
                    const supplementPrice = supplement.supplement?.price ?? 0;
                    const supplementOrderData: schema.NewMenuItemOrders = {
                      id: supplement.id,
                      createdAt: new Date(supplement.createdAt),
                      updatedAt: new Date(supplement.createdAt),
                      orderId: order.id,
                      menuItemId: supplement.supplementId,
                      quantity: supplement.quantity,
                      price: supplementPrice,
                      parentMenuItemOrderId: menuItemOrder.id,
                    };

                    await tx.insert(schema.menuItemOrders).values(supplementOrderData);
                    supplementsSuccess++;
                    console.log(`    ✓ Migrated supplement: ${supplement.supplement?.name ?? supplement.supplementId} (qty: ${supplement.quantity})`);
                  }
                }

                // Migrate menu item options
                if (menuItemOrder.MenuItemOrderMenuItemOption && menuItemOrder.MenuItemOrderMenuItemOption.length > 0) {
                  for (const option of menuItemOrder.MenuItemOrderMenuItemOption) {
                    // Verify option exists in database, create if not
                    let optionExists = await tx
                      .select()
                      .from(schema.menuItems)
                      .where(eq(schema.menuItems.id, option.optionId))
                      .limit(1);

                    if (optionExists.length === 0) {
                      const optName = option.option?.name ?? 'Unknown Option';
                      const optDescription = option.option?.description;
                      
                      console.log(`    🔨 Creating missing option '${optName}' (${option.optionId})`);
                      
                      // Create the option as a menu item with MENU_ITEM_OPTION type
                      await tx.insert(schema.menuItems).values({
                        id: option.optionId,
                        name: optName,
                        type: ["MENU_ITEM_OPTION"],
                        description: optDescription,
                        price: 0,
                        isAvailable: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      });
                      
                      createdOptions++;
                      missingOptions.add(`${optName} (${option.optionId})`);
                    }

                    // Insert option as menu item order with parent reference
                    const optionOrderData: schema.NewMenuItemOrders = {
                      id: option.id,
                      createdAt: new Date(option.createdAt),
                      updatedAt: new Date(option.createdAt),
                      orderId: order.id,
                      menuItemId: option.optionId,
                      quantity: 1,
                      price: 0, // Options typically don't have price
                      parentMenuItemOrderId: menuItemOrder.id,
                    };

                    await tx.insert(schema.menuItemOrders).values(optionOrderData);
                    optionsSuccess++;
                    console.log(`    ✓ Migrated option: ${option.option?.name ?? option.optionId}`);
                  }
                }

              } catch (err: any) {
                console.error(`\n❌ ERROR: Failed to migrate menu item order ${menuItemOrder.id}:`, err?.message ?? err);
                throw err;
              }
            }
          }

        } catch (err: any) {
          console.error(`\n❌ ERROR: Failed to migrate order ${order.id}:`, err?.message ?? err);
          throw err;
        }
      }

      // Report created items
      if (createdMenuItems > 0 || createdSupplements > 0 || createdOptions > 0) {
        console.log("\n🔨 Created missing items:\n");
        
        if (createdMenuItems > 0) {
          console.log(`Created Menu Items (${createdMenuItems}):`);
          missingMenuItems.forEach(item => console.log(`  - ${item}`));
          console.log();
        }
        
        if (createdSupplements > 0) {
          console.log(`Created Supplements (${createdSupplements}):`);
          missingSupplements.forEach(item => console.log(`  - ${item}`));
          console.log();
        }
        
        if (createdOptions > 0) {
          console.log(`Created Options (${createdOptions}):`);
          missingOptions.forEach(item => console.log(`  - ${item}`));
          console.log();
        }
      }

      console.log("\n✅ Transaction committed successfully\n");

      console.log("=== Migration Summary ===");
      console.log(`Total orders: ${data.orders?.length ?? 0}`);
      console.log(`Orders migrated: ${ordersSuccess}`);
      console.log(`Orders skipped (already exist): ${ordersSkipped}`);
      console.log(`Menu item orders migrated: ${menuItemOrdersSuccess}`);
      console.log(`Supplements migrated: ${supplementsSuccess}`);
      console.log(`Options migrated: ${optionsSuccess}`);
      console.log(`\nCreated items:`);
      console.log(`  Menu items created: ${createdMenuItems}`);
      console.log(`  Supplements created: ${createdSupplements}`);
      console.log(`  Options created: ${createdOptions}`);
      console.log("==========================\n");
    });
  } catch (err) {
    console.error("\n🔄 Transaction rolled back - all changes reverted\n");
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

migrateOrders2()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
