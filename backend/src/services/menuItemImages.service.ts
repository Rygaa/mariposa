import { eq, and } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function findById(
  id: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemImages | undefined> {
  const [menuItemImage] = await tx
    .select()
    .from(SchemaDrizzle.menuItemImages)
    .where(eq(SchemaDrizzle.menuItemImages.id, id))
    .limit(1);
  return menuItemImage;
}

async function getById(
  id: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemImages> {
  const menuItemImage = await findById(id, tx);

  if (!menuItemImage) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Menu item image not found",
    });
  }

  return menuItemImage;
}

async function create(
  data: Omit<SchemaDrizzle.NewMenuItemImages, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemImages> {
  const id = crypto.randomUUID();
  const [createdMenuItemImage] = await tx
    .insert(SchemaDrizzle.menuItemImages)
    .values({
      id,
      ...data,
    })
    .returning();

  return createdMenuItemImage;
}

async function update(
  data: Partial<Omit<SchemaDrizzle.MenuItemImages, "createdAt">> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemImages> {
  await getById(data.id, tx);
  
  const { id, ...updateData } = data;

  const [updatedMenuItemImage] = await tx
    .update(SchemaDrizzle.menuItemImages)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(SchemaDrizzle.menuItemImages.id, id))
    .returning();

  return updatedMenuItemImage;
}

async function deleteById(
  id: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await getById(id, tx);
  await tx.delete(SchemaDrizzle.menuItemImages).where(eq(SchemaDrizzle.menuItemImages.id, id));
}

async function listByMenuItemId(
  menuItemId: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.MenuItemImages[]> {
  const images = await tx
    .select()
    .from(SchemaDrizzle.menuItemImages)
    .where(eq(SchemaDrizzle.menuItemImages.menuItemId, menuItemId));
  
  return images;
}

async function deleteByFileId(
  fileId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await tx
    .delete(SchemaDrizzle.menuItemImages)
    .where(eq(SchemaDrizzle.menuItemImages.fileId, fileId));
}

const _ServiceMenuItemImages = {
  findById,
  getById,
  create,
  update,
  deleteById,
  listByMenuItemId,
  deleteByFileId,
};

export default _ServiceMenuItemImages;
