import { eq, and } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function findById(
  menuItemOrderId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemOrders | undefined> {
  const [menuItemOrder] = await tx
    .select()
    .from(SchemaDrizzle.menuItemOrders)
    .where(eq(SchemaDrizzle.menuItemOrders.id, menuItemOrderId))
    .limit(1);
  return menuItemOrder;
}

async function getById(
  menuItemOrderId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemOrders> {
  const menuItemOrder = await findById(menuItemOrderId, tx);

  if (!menuItemOrder) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Menu item order not found",
    });
  }

  return menuItemOrder;
}

async function create(
  data: Omit<SchemaDrizzle.NewMenuItemOrders, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemOrders> {
  const [createdMenuItemOrder] = await tx
    .insert(SchemaDrizzle.menuItemOrders)
    .values({
      id: crypto.randomUUID(),
      ...data,
    })
    .returning();

  return createdMenuItemOrder;
}

async function update(
  data: Partial<Omit<SchemaDrizzle.MenuItemOrders, "createdAt">> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemOrders> {
  await getById(data.id, tx);

  const [updatedMenuItemOrder] = await tx
    .update(SchemaDrizzle.menuItemOrders)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(SchemaDrizzle.menuItemOrders.id, data.id))
    .returning();

  return updatedMenuItemOrder;
}

async function deleteMenuItemOrder(
  menuItemOrderId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await getById(menuItemOrderId, tx);
  await tx
    .delete(SchemaDrizzle.menuItemOrders)
    .where(eq(SchemaDrizzle.menuItemOrders.id, menuItemOrderId));
}

type ListFilters = {
  orderId?: string;
  menuItemId?: string;
  limit?: number;
  offset?: number;
};

async function list(
  filters: ListFilters = {},
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemOrders[]> {
  const { orderId, menuItemId, limit = 100, offset = 0 } = filters;

  let query = tx.select().from(SchemaDrizzle.menuItemOrders);

  const conditions: any[] = [];

  if (orderId) {
    conditions.push(eq(SchemaDrizzle.menuItemOrders.orderId, orderId));
  }

  if (menuItemId) {
    conditions.push(eq(SchemaDrizzle.menuItemOrders.menuItemId, menuItemId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const menuItemOrders = await query.limit(limit).offset(offset);

  return menuItemOrders;
}

async function listByOrderId(
  orderId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemOrders[]> {
  return list({ orderId }, tx);
}

async function updateQuantity(
  menuItemOrderId: string,
  quantity: number,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemOrders> {
  if (quantity <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Quantity must be greater than 0",
    });
  }

  return update({ id: menuItemOrderId, quantity }, tx);
}

const _ServiceMenuItemOrders = {
  findById,
  getById,
  create,
  update,
  deleteMenuItemOrder,
  list,
  listByOrderId,
  updateQuantity,
};

export default _ServiceMenuItemOrders;
