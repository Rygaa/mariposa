import { eq, and } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function findById(
  subMenuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemSubMenuItems | undefined> {
  const [subMenuItem] = await tx
    .select()
    .from(SchemaDrizzle.menuItemSubMenuItems)
    .where(eq(SchemaDrizzle.menuItemSubMenuItems.id, subMenuItemId))
    .limit(1);
  return subMenuItem;
}

async function getById(
  subMenuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemSubMenuItems> {
  const subMenuItem = await findById(subMenuItemId, tx);

  if (!subMenuItem) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Menu item sub menu item not found",
    });
  }

  return subMenuItem;
}

async function create(
  data: Omit<SchemaDrizzle.NewMenuItemSubMenuItems, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemSubMenuItems> {
  const id = crypto.randomUUID();
  
  // Check if the relationship already exists
  const existing = await tx
    .select()
    .from(SchemaDrizzle.menuItemSubMenuItems)
    .where(
      and(
        eq(SchemaDrizzle.menuItemSubMenuItems.parentMenuItemId, data.parentMenuItemId),
        eq(SchemaDrizzle.menuItemSubMenuItems.subMenuItemId, data.subMenuItemId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This sub menu item relationship already exists",
    });
  }

  const [createdSubMenuItem] = await tx
    .insert(SchemaDrizzle.menuItemSubMenuItems)
    .values({
      id,
      ...data,
    })
    .returning();

  return createdSubMenuItem;
}

async function update(
  data: Partial<Omit<SchemaDrizzle.MenuItemSubMenuItems, "createdAt">> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemSubMenuItems> {
  await getById(data.id, tx);
  
  const { id, ...updateData } = data;

  const [updatedSubMenuItem] = await tx
    .update(SchemaDrizzle.menuItemSubMenuItems)
    .set(updateData)
    .where(eq(SchemaDrizzle.menuItemSubMenuItems.id, id))
    .returning();

  return updatedSubMenuItem;
}

async function deleteSubMenuItem(
  subMenuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await getById(subMenuItemId, tx);
  await tx
    .delete(SchemaDrizzle.menuItemSubMenuItems)
    .where(eq(SchemaDrizzle.menuItemSubMenuItems.id, subMenuItemId));
}

async function listByParentMenuItem(
  parentMenuItemId: string,
  tx: DbTransactionOrDB = db
) {
  const subMenuItems = await tx
    .select({
      id: SchemaDrizzle.menuItemSubMenuItems.id,
      parentMenuItemId: SchemaDrizzle.menuItemSubMenuItems.parentMenuItemId,
      subMenuItemId: SchemaDrizzle.menuItemSubMenuItems.subMenuItemId,
      quantity: SchemaDrizzle.menuItemSubMenuItems.quantity,
      producedMenuItemsQuantity: SchemaDrizzle.menuItemSubMenuItems.producedMenuItemsQuantity,
      createdAt: SchemaDrizzle.menuItemSubMenuItems.createdAt,
      linkedItem: SchemaDrizzle.menuItems,
    })
    .from(SchemaDrizzle.menuItemSubMenuItems)
    .leftJoin(
      SchemaDrizzle.menuItems,
      eq(SchemaDrizzle.menuItemSubMenuItems.subMenuItemId, SchemaDrizzle.menuItems.id)
    )
    .where(eq(SchemaDrizzle.menuItemSubMenuItems.parentMenuItemId, parentMenuItemId));

  return subMenuItems;
}

async function listBySubMenuItem(
  subMenuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemSubMenuItems[]> {
  const usages = await tx
    .select()
    .from(SchemaDrizzle.menuItemSubMenuItems)
    .where(eq(SchemaDrizzle.menuItemSubMenuItems.subMenuItemId, subMenuItemId));

  return usages;
}

const _ServiceMenuItemSubMenuItems = {
  findById,
  getById,
  create,
  update,
  deleteSubMenuItem,
  listByParentMenuItem,
  listBySubMenuItem,
};

export default _ServiceMenuItemSubMenuItems;
