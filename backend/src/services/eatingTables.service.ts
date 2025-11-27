import { eq, and, or, like } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function findById(
  eatingTableId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.EatingTables | undefined> {
  const [eatingTable] = await tx
    .select()
    .from(SchemaDrizzle.eatingTables)
    .where(eq(SchemaDrizzle.eatingTables.id, eatingTableId))
    .limit(1);
  return eatingTable;
}

async function getById(
  eatingTableId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.EatingTables> {
  const eatingTable = await findById(eatingTableId, tx);

  if (!eatingTable) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Eating table not found",
    });
  }

  return eatingTable;
}

async function create(
  data: Omit<SchemaDrizzle.NewEatingTables, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.EatingTables> {
  const [createdEatingTable] = await tx
    .insert(SchemaDrizzle.eatingTables)
    .values({
      id: crypto.randomUUID(),
      ...data,
    })
    .returning();

  return createdEatingTable;
}

async function update(
  data: Partial<Omit<SchemaDrizzle.EatingTables, "createdAt">> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.EatingTables> {
  await getById(data.id, tx);

  const [updatedEatingTable] = await tx
    .update(SchemaDrizzle.eatingTables)
    .set({ 
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(SchemaDrizzle.eatingTables.id, data.id))
    .returning();

  return updatedEatingTable;
}

async function deleteEatingTable(
  eatingTableId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await getById(eatingTableId, tx);
  await tx.delete(SchemaDrizzle.eatingTables).where(eq(SchemaDrizzle.eatingTables.id, eatingTableId));
}

type ListFilters = {
  search?: string;
  type?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
};

async function list(
  filters: ListFilters = {},
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.EatingTables[]> {
  const { search, type, isActive, limit = 100, offset = 0 } = filters;

  let query = tx.select().from(SchemaDrizzle.eatingTables);

  const conditions = [];

  if (search) {
    conditions.push(like(SchemaDrizzle.eatingTables.name, `%${search}%`));
  }

  if (type) {
    conditions.push(eq(SchemaDrizzle.eatingTables.type, type as any));
  }

  if (isActive !== undefined) {
    conditions.push(eq(SchemaDrizzle.eatingTables.isActive, isActive));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const eatingTables = await query
    .orderBy(SchemaDrizzle.eatingTables.orderIndex)
    .limit(limit)
    .offset(offset);

  return eatingTables;
}

async function reorder(
  tableId: string,
  newOrderIndex: number,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.EatingTables[]> {
  // Get the table being moved
  const table = await getById(tableId, tx);
  const oldOrderIndex = table.orderIndex || 0;

  // Get all tables
  const allTables = await list({}, tx);

  // Update order indices
  if (newOrderIndex > oldOrderIndex) {
    // Moving down: shift tables between old and new position up
    for (const t of allTables) {
      if (t.id === tableId) continue;
      const currentIndex = t.orderIndex || 0;
      if (currentIndex > oldOrderIndex && currentIndex <= newOrderIndex) {
        await tx
          .update(SchemaDrizzle.eatingTables)
          .set({ orderIndex: currentIndex - 1, updatedAt: new Date() })
          .where(eq(SchemaDrizzle.eatingTables.id, t.id));
      }
    }
  } else if (newOrderIndex < oldOrderIndex) {
    // Moving up: shift tables between new and old position down
    for (const t of allTables) {
      if (t.id === tableId) continue;
      const currentIndex = t.orderIndex || 0;
      if (currentIndex >= newOrderIndex && currentIndex < oldOrderIndex) {
        await tx
          .update(SchemaDrizzle.eatingTables)
          .set({ orderIndex: currentIndex + 1, updatedAt: new Date() })
          .where(eq(SchemaDrizzle.eatingTables.id, t.id));
      }
    }
  }

  // Update the moved table
  await tx
    .update(SchemaDrizzle.eatingTables)
    .set({ orderIndex: newOrderIndex, updatedAt: new Date() })
    .where(eq(SchemaDrizzle.eatingTables.id, tableId));

  // Return updated list
  return await list({}, tx);
}

const _ServiceEatingTables = {
  findById,
  getById,
  create,
  update,
  deleteEatingTable,
  list,
  reorder,
};

export default _ServiceEatingTables;
