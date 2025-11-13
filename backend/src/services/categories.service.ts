import { eq, and, or, like } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function findById(
  categoryId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Categories | undefined> {
  const [category] = await tx
    .select()
    .from(SchemaDrizzle.categories)
    .where(eq(SchemaDrizzle.categories.id, categoryId))
    .limit(1);
  return category;
}

async function getById(
  categoryId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Categories> {
  const category = await findById(categoryId, tx);

  if (!category) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Category not found",
    });
  }

  return category;
}

async function create(
  data: Omit<SchemaDrizzle.NewCategories, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Categories> {
  const [createdCategory] = await tx
    .insert(SchemaDrizzle.categories)
    .values({
      id: crypto.randomUUID(),
      ...data,
    })
    .returning();

  return createdCategory;
}

async function update(
  data: Partial<Omit<SchemaDrizzle.Categories, "createdAt">> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Categories> {
  await getById(data.id, tx);

  const [updatedCategory] = await tx
    .update(SchemaDrizzle.categories)
    .set({ 
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(SchemaDrizzle.categories.id, data.id))
    .returning();

  return updatedCategory;
}

async function deleteCategory(
  categoryId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await getById(categoryId, tx);
  await tx.delete(SchemaDrizzle.categories).where(eq(SchemaDrizzle.categories.id, categoryId));
}

type ListFilters = {
  search?: string;
  isUnlisted?: boolean;
  limit?: number;
  offset?: number;
};

async function list(
  filters: ListFilters = {},
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.Categories[]> {
  const { search, isUnlisted, limit = 100, offset = 0 } = filters;

  let query = tx.select().from(SchemaDrizzle.categories);

  const conditions = [];

  if (search) {
    conditions.push(like(SchemaDrizzle.categories.name, `%${search}%`));
  }

  if (isUnlisted !== undefined) {
    conditions.push(eq(SchemaDrizzle.categories.isUnlisted, isUnlisted));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const categories = await query.limit(limit).offset(offset);

  return categories;
}

const _ServiceCategories = {
  findById,
  getById,
  create,
  update,
  deleteCategory,
  list,
};

export default _ServiceCategories;
