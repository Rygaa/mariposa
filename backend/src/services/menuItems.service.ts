import { eq, and, or, like, sql } from "drizzle-orm";
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
  type?: string[];
  categoryId?: string;
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
  excludeIds?: string[];
  shouldIncludeSupplements?: boolean;
};

async function list(
  filters: ListFilters = {},
  tx: DbTransactionOrDB = db
): Promise<any[]> {
  const { search, type, categoryId, isAvailable, limit = 100, offset = 0, excludeIds = [], shouldIncludeSupplements = false } = filters;

  let query: any;
  
  if (shouldIncludeSupplements) {
    // Query with supplements joined - using subquery approach to avoid alias conflicts
    query = tx
      .select({
        menuItem: SchemaDrizzle.menuItems,
        subMenuItems: sql`COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sub_item.id,
                'name', sub_item.name,
                'type', sub_item.type,
                'price', sub_item.price,
                'image', sub_item.image,
                'description', sub_item.description,
                'isAvailable', sub_item."isAvailable",
                'quantity', link.quantity
              )
            )
            FROM "MenuItemSubMenuItem" link
            INNER JOIN "MenuItem" sub_item ON sub_item.id = link."subMenuItemId"
            WHERE link."parentMenuItemId" = "MenuItem"."id"
              AND sub_item.type::jsonb ? 'SUPPLEMENT'
          ),
          '[]'::json
        )`.as('subMenuItems'),
      })
      .from(SchemaDrizzle.menuItems);
  } else {
    query = tx.select().from(SchemaDrizzle.menuItems);
  }

  const conditions = [];

  if (search) {
    conditions.push(like(SchemaDrizzle.menuItems.name, `%${search}%`));
  }

  // Filter by type - check if any of the filter types are in the item's type array
  if (type && type.length > 0) {
    const typeConditions = type.map(t => 
      // Check if the JSONB array contains the specific type value
      sql`${SchemaDrizzle.menuItems.type}::jsonb ? ${t}`
    );
    if (typeConditions.length === 1) {
      conditions.push(typeConditions[0]);
    } else {
      conditions.push(or(...typeConditions));
    }
  }

  if (categoryId) {
    conditions.push(eq(SchemaDrizzle.menuItems.categoryId, categoryId));
  }

  if (isAvailable !== undefined) {
    conditions.push(eq(SchemaDrizzle.menuItems.isAvailable, isAvailable));
  }

  if (excludeIds && excludeIds.length > 0) {
    conditions.push(
      sql`${SchemaDrizzle.menuItems.id} NOT IN (${sql.join(
        excludeIds,
        sql`,`
      )})`
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.limit(limit).offset(offset);

  // If shouldIncludeSupplements, transform the results
  if (shouldIncludeSupplements) {
    return results.map((row: any) => ({
      ...row.menuItem,
      subMenuItems: row.subMenuItems || [],
    }));
  }

  return results;
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
