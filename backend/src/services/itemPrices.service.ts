import { eq, and } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function create(
  data: Omit<SchemaDrizzle.NewItemPrices, "id">,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.ItemPrices> {
  const id = crypto.randomUUID();
  const [createdItemPrice] = await tx
    .insert(SchemaDrizzle.itemPrices)
    .values({
      id,
      ...data,
    })
    .returning();

  return createdItemPrice;
}

async function deleteItemPrice(
  itemPriceId: string,
  tx: DbTransactionOrDB = db
): Promise<void> {
  await tx.delete(SchemaDrizzle.itemPrices).where(eq(SchemaDrizzle.itemPrices.id, itemPriceId));
}

async function listByMenuItem(
  menuItemId: string,
  priceType?: "selling" | "buying",
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.ItemPrices[]> {
  const conditions = [eq(SchemaDrizzle.itemPrices.menuItemId, menuItemId)];
  
  if (priceType) {
    conditions.push(eq(SchemaDrizzle.itemPrices.priceType, priceType));
  }

  const itemPrices = await tx
    .select()
    .from(SchemaDrizzle.itemPrices)
    .where(and(...conditions));

  return itemPrices;
}

const _ServiceItemPrices = {
  create,
  deleteItemPrice,
  listByMenuItem,
};

export default _ServiceItemPrices;
