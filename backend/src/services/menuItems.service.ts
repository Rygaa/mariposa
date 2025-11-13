import { eq, and, or, like } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function findById(
  menuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItems | undefined> {
  const [menuItem] = await tx
    .select()
    .from(SchemaDrizzle.menuItems)
    .where(eq(SchemaDrizzle.menuItems.id, menuItemId))
    .limit(1);
  return menuItem;
}

async function getById(
  menuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItems> {
  const menuItem = await findById(menuItemId, tx);

  if (!menuItem) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Menu item not found",
    });
  }

  return menuItem;
}

async function create(
  data: Omit<SchemaDrizzle.NewMenuItems, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItems> {
  const id = crypto.randomUUID();
  const [createdMenuItem] = await tx
    .insert(SchemaDrizzle.menuItems)
    .values({
      id,
      ...data,
    })
    .returning();

  return createdMenuItem;
}

async function update(
  data: Partial<Omit<SchemaDrizzle.MenuItems, "createdAt">> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItems> {
  await getById(data.id, tx);
  
  const { id, ...updateData } = data;

  const [updatedMenuItem] = await tx
    .update(SchemaDrizzle.menuItems)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(SchemaDrizzle.menuItems.id, id))
    .returning();

  return updatedMenuItem;
}

async function deleteMenuItem(
  menuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await getById(menuItemId, tx);
  await tx.delete(SchemaDrizzle.menuItems).where(eq(SchemaDrizzle.menuItems.id, menuItemId));
}

type ListFilters = {
  search?: string;
  itemType?: string;
  categoryId?: string;
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
};

async function list(
  filters: ListFilters = {},
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItems[]> {
  const { search, itemType, categoryId, isAvailable, limit = 100, offset = 0 } = filters;

  let query = tx.select().from(SchemaDrizzle.menuItems);

  const conditions = [];

  if (search) {
    conditions.push(like(SchemaDrizzle.menuItems.name, `%${search}%`));
  }

  if (itemType) {
    conditions.push(eq(SchemaDrizzle.menuItems.itemType, itemType as any));
  }

  if (categoryId) {
    conditions.push(eq(SchemaDrizzle.menuItems.categoryId, categoryId));
  }

  if (isAvailable !== undefined) {
    conditions.push(eq(SchemaDrizzle.menuItems.isAvailable, isAvailable));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const menuItems = await query.limit(limit).offset(offset);

  return menuItems;
}



const _ServiceMenuItems = {
  findById,
  getById,
  create,
  update,
  deleteMenuItem,
  list,
};

export default _ServiceMenuItems;
