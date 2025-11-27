import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";
import { sendMessageToRole } from "../socketList";

async function findById(
  orderId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Orders | undefined> {
  const [order] = await tx
    .select()
    .from(SchemaDrizzle.orders)
    .where(eq(SchemaDrizzle.orders.id, orderId))
    .limit(1);
  return order;
}

async function findByIdWithRelations(
  orderId: string,
  tx: DbTransactionOrDB = db
): Promise<any | undefined> {
  const order = await tx.query.orders.findFirst({
    where: eq(SchemaDrizzle.orders.id, orderId),
    with: {
      eatingTable: true,
      menuItemOrders: {
        with: {
          menuItem: {
            with: {
              category: true,
              subMenuItems: {
                with: {
                  subMenuItem: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return order;
}

async function getById(
  orderId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Orders> {
  const order = await findById(orderId, tx);

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Order not found",
    });
  }

  return order;
}

async function getByIdWithRelations(
  orderId: string,
  tx: DbTransactionOrDB = db
): Promise<any> {
  const order = await findByIdWithRelations(orderId, tx);

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Order not found",
    });
  }

  return order;
}

async function create(
  data: Omit<SchemaDrizzle.NewOrders, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Orders> {
  const [createdOrder] = await tx
    .insert(SchemaDrizzle.orders)
    .values({
      id: crypto.randomUUID(),
      ...data,
    })
    .returning();

  return createdOrder;
}

async function update(
  data: Partial<Omit<SchemaDrizzle.Orders, "createdAt">> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Orders> {
  await getById(data.id, tx);

  const [updatedOrder] = await tx
    .update(SchemaDrizzle.orders)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(SchemaDrizzle.orders.id, data.id))
    .returning();

  // If status changed to CONFIRMED, send notification to all ADMIN users
  if (data.status === "CONFIRMED") {
    console.log("SHOULD PRINT - Order confirmed:", updatedOrder.id);
    sendMessageToRole("ADMIN", {
      type: "ORDER_CONFIRMED",
      orderId: updatedOrder.id,
      timestamp: Date.now(),
    });
  }

  return updatedOrder;
}

async function deleteOrder(
  orderId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await getById(orderId, tx);
  await tx.delete(SchemaDrizzle.orders).where(eq(SchemaDrizzle.orders.id, orderId));
}

type ListFilters = {
  eatingTableId?: string;
  // Use a simple string type for status (matches enum values in DB).
  status?: string;
  limit?: number;
  offset?: number;
};

async function list(
  filters: ListFilters = {},
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Orders[]> {
  const { eatingTableId, status, limit = 100, offset = 0 } = filters;

  let query = tx.select().from(SchemaDrizzle.orders);

  const conditions: any[] = [];

  if (eatingTableId) {
    conditions.push(eq(SchemaDrizzle.orders.eatingTableId, eatingTableId));
  }

  if (status) {
    conditions.push(eq(SchemaDrizzle.orders.status, status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const orders = await query.limit(limit).offset(offset);

  return orders;
}

async function listWithRelations(
  filters: ListFilters = {},
  tx: DbTransactionOrDB = db
): Promise<any[]> {
  const { eatingTableId, status, limit, offset = 0 } = filters;

  const conditions: any[] = [];

  if (eatingTableId) {
    conditions.push(eq(SchemaDrizzle.orders.eatingTableId, eatingTableId));
  }

  if (status) {
    conditions.push(eq(SchemaDrizzle.orders.status, status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const queryOptions: any = {
    where: whereClause,
    with: {
      eatingTable: true,
      menuItemOrders: {
        with: {
          menuItem: {
            with: {
              category: true,
            },
          },
        },
      },
    },
    offset,
  };

  // Only add limit if it's explicitly provided
  if (limit !== undefined) {
    queryOptions.limit = limit;
  }

  const orders = await tx.query.orders.findMany(queryOptions);

  return orders;
}

// Placeholder printing functions
async function printOrder(orderId: string): Promise<{ success: boolean; message: string }> {
  // TODO: implement real printing logic (e.g., send to printer, generate PDF)
  return { success: true, message: `Printed order ${orderId} (placeholder)` };
}

async function printReceiptOfEatingTable(eatingTableId: string): Promise<{ success: boolean; message: string }>
{
  // TODO: implement receipt generation for an eating table
  return { success: true, message: `Printed receipt for eating table ${eatingTableId} (placeholder)` };
}

async function printReceiptOfOrder(orderId: string): Promise<{ success: boolean; message: string }>
{
  // TODO: implement receipt generation for a specific order
  return { success: true, message: `Printed receipt for order ${orderId} (placeholder)` };
}

async function getRevenueStats(
  startDate: Date,
  endDate: Date,
  tx: DbTransactionOrDB = db
): Promise<{
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
}> {
  // Get all PAID orders in the date range
  const orders = await tx
    .select()
    .from(SchemaDrizzle.orders)
    .where(
      and(
        eq(SchemaDrizzle.orders.status, "PAID"),
        gte(SchemaDrizzle.orders.createdAt, startDate),
        lte(SchemaDrizzle.orders.createdAt, endDate)
      )
    );

  // Get all menu item orders for those paid orders
  const orderIds = orders.map(o => o.id);
  
  if (orderIds.length === 0) {
    return {
      totalRevenue: 0,
      orderCount: 0,
      averageOrderValue: 0,
    };
  }

  const menuItemOrders = await tx
    .select()
    .from(SchemaDrizzle.menuItemOrders)
    .where(inArray(SchemaDrizzle.menuItemOrders.orderId, orderIds));

  // Calculate total revenue
  const totalRevenue = menuItemOrders.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  return {
    totalRevenue,
    orderCount,
    averageOrderValue,
  };
}

async function getMenuItemSales(
  startDate: Date,
  endDate: Date,
  tx: DbTransactionOrDB = db
): Promise<{
  menuItems: Array<{
    id: string;
    name: string;
    type: string[];
    quantitySold: number;
    revenue: number;
  }>;
  supplements: Array<{
    id: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
}> {
  // Get all PAID orders in the date range
  const orders = await tx
    .select()
    .from(SchemaDrizzle.orders)
    .where(
      and(
        eq(SchemaDrizzle.orders.status, "PAID"),
        gte(SchemaDrizzle.orders.createdAt, startDate),
        lte(SchemaDrizzle.orders.createdAt, endDate)
      )
    );

  const orderIds = orders.map(o => o.id);
  
  if (orderIds.length === 0) {
    return {
      menuItems: [],
      supplements: [],
    };
  }

  // Get all menu item orders with menu item details
  const menuItemOrders = await tx
    .select({
      menuItemId: SchemaDrizzle.menuItemOrders.menuItemId,
      quantity: SchemaDrizzle.menuItemOrders.quantity,
      price: SchemaDrizzle.menuItemOrders.price,
      menuItemName: SchemaDrizzle.menuItems.name,
      menuItemType: SchemaDrizzle.menuItems.type,
    })
    .from(SchemaDrizzle.menuItemOrders)
    .innerJoin(
      SchemaDrizzle.menuItems,
      eq(SchemaDrizzle.menuItemOrders.menuItemId, SchemaDrizzle.menuItems.id)
    )
    .where(inArray(SchemaDrizzle.menuItemOrders.orderId, orderIds));

  // Aggregate by menu item
  const menuItemMap = new Map<string, {
    id: string;
    name: string;
    type: string[];
    quantitySold: number;
    revenue: number;
  }>();

  for (const order of menuItemOrders) {
    const existing = menuItemMap.get(order.menuItemId);
    if (existing) {
      existing.quantitySold += order.quantity;
      existing.revenue += order.price * order.quantity;
    } else {
      menuItemMap.set(order.menuItemId, {
        id: order.menuItemId,
        name: order.menuItemName,
        type: order.menuItemType as string[],
        quantitySold: order.quantity,
        revenue: order.price * order.quantity,
      });
    }
  }

  // Filter and separate menu items and supplements
  const menuItems: Array<{
    id: string;
    name: string;
    type: string[];
    quantitySold: number;
    revenue: number;
  }> = [];
  
  const supplements: Array<{
    id: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }> = [];

  for (const item of menuItemMap.values()) {
    if (item.type.includes("MENU_ITEM")) {
      menuItems.push(item);
    }
    if (item.type.includes("SUPPLEMENT")) {
      supplements.push({
        id: item.id,
        name: item.name,
        quantitySold: item.quantitySold,
        revenue: item.revenue,
      });
    }
  }

  // Sort by quantity sold descending
  menuItems.sort((a, b) => b.quantitySold - a.quantitySold);
  supplements.sort((a, b) => b.quantitySold - a.quantitySold);

  return {
    menuItems,
    supplements,
  };
}

async function getRawMaterialConsumption(
  startDate: Date,
  endDate: Date,
  tx: DbTransactionOrDB = db
): Promise<Array<{
  id: string;
  name: string;
  unit: string | null;
  totalQuantityUsed: number;
}>> {
  // Get all paid orders in the date range
  const orders = await tx
    .select()
    .from(SchemaDrizzle.orders)
    .where(
      and(
        eq(SchemaDrizzle.orders.status, "PAID"),
        gte(SchemaDrizzle.orders.createdAt, startDate),
        lte(SchemaDrizzle.orders.createdAt, endDate)
      )
    );

  const orderIds = orders.map(o => o.id);
  
  if (orderIds.length === 0) {
    return [];
  }

  // Get all menu item orders
  const menuItemOrders = await tx
    .select({
      menuItemId: SchemaDrizzle.menuItemOrders.menuItemId,
      quantity: SchemaDrizzle.menuItemOrders.quantity,
    })
    .from(SchemaDrizzle.menuItemOrders)
    .where(inArray(SchemaDrizzle.menuItemOrders.orderId, orderIds));

  // Recursive function to get all raw materials from a menu item (including nested recipes)
  const getRawMaterials = async (
    menuItemId: string,
    quantity: number,
    visited: Set<string> = new Set()
  ): Promise<Map<string, number>> => {
    if (visited.has(menuItemId)) {
      return new Map(); // Prevent circular references
    }
    visited.add(menuItemId);

    const rawMaterials = new Map<string, number>();

    // Get the menu item details
    const [menuItem] = await tx
      .select()
      .from(SchemaDrizzle.menuItems)
      .where(eq(SchemaDrizzle.menuItems.id, menuItemId))
      .limit(1);

    if (!menuItem) {
      return rawMaterials;
    }

    // If this is a raw material, add it directly
    if (menuItem.type.includes("RAW_MATERIAL")) {
      rawMaterials.set(menuItemId, quantity);
      return rawMaterials;
    }

    // Get recipe components (sub menu items)
    const recipeComponents = await tx
      .select({
        subMenuItemId: SchemaDrizzle.menuItemSubMenuItems.subMenuItemId,
        quantity: SchemaDrizzle.menuItemSubMenuItems.quantity,
        producedMenuItemsQuantity: SchemaDrizzle.menuItemSubMenuItems.producedMenuItemsQuantity,
      })
      .from(SchemaDrizzle.menuItemSubMenuItems)
      .where(eq(SchemaDrizzle.menuItemSubMenuItems.parentMenuItemId, menuItemId));

    // Recursively process each component
    for (const component of recipeComponents) {
      const componentQuantity = component.quantity * quantity / (component.producedMenuItemsQuantity || 1);
      const componentRawMaterials = await getRawMaterials(
        component.subMenuItemId,
        componentQuantity,
        new Set(visited) // Pass a copy to avoid affecting sibling branches
      );

      // Merge the results
      for (const [rawMatId, rawMatQty] of componentRawMaterials.entries()) {
        const existing = rawMaterials.get(rawMatId) || 0;
        rawMaterials.set(rawMatId, existing + rawMatQty);
      }
    }

    return rawMaterials;
  };

  // Collect all raw materials from all orders
  const allRawMaterials = new Map<string, number>();

  for (const order of menuItemOrders) {
    const rawMaterials = await getRawMaterials(order.menuItemId, order.quantity);
    for (const [rawMatId, qty] of rawMaterials.entries()) {
      const existing = allRawMaterials.get(rawMatId) || 0;
      allRawMaterials.set(rawMatId, existing + qty);
    }
  }

  // Get details of all raw materials
  const rawMaterialIds = Array.from(allRawMaterials.keys());
  
  if (rawMaterialIds.length === 0) {
    return [];
  }

  const rawMaterialDetails = await tx
    .select({
      id: SchemaDrizzle.menuItems.id,
      name: SchemaDrizzle.menuItems.name,
      unit: SchemaDrizzle.menuItems.unit,
    })
    .from(SchemaDrizzle.menuItems)
    .where(inArray(SchemaDrizzle.menuItems.id, rawMaterialIds));

  // Build the final result
  const result = rawMaterialDetails.map(rm => ({
    id: rm.id,
    name: rm.name,
    unit: rm.unit,
    totalQuantityUsed: allRawMaterials.get(rm.id) || 0,
  }));

  // Sort by quantity used descending
  result.sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed);

  return result;
}

const _ServiceOrders = {
  findById,
  getById,
  findByIdWithRelations,
  getByIdWithRelations,
  create,
  update,
  deleteOrder,
  list,
  listWithRelations,
  printOrder,
  printReceiptOfEatingTable,
  printReceiptOfOrder,
  getRevenueStats,
  getMenuItemSales,
  getRawMaterialConsumption,
};

export default _ServiceOrders;
