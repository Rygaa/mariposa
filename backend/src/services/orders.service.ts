import { eq, and } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

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

const _ServiceOrders = {
  findById,
  getById,
  create,
  update,
  deleteOrder,
  list,
  printOrder,
  printReceiptOfEatingTable,
  printReceiptOfOrder,
};

export default _ServiceOrders;
