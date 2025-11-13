import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==== MODELS & ROLES ====

// Define all models in the system
export const models = [
  "enterprises",
  "users",
  "eatingTables",
  "categories",
  "menuItems",
  "orders",
  "menuItemOrders",
  "menuItemIngredients",
  "itemPrices",
  "menuItemSubMenuItems",
] as const;

// Define CRUD operations
const operations = ["view", "create", "update", "delete"] as const;

// System-level roles
const systemRoles = ["ROOT", "ADMIN", "MEMBER"] as const;

// Generate dynamic roles: model_operation (e.g., users_view, users_create)
const dynamicRoles = models.flatMap((model) => operations.map((op) => `${model}_${op}` as const));

// Combine all roles
const allRoles = [...systemRoles, ...dynamicRoles] as const;

export const roleEnum = pgEnum("ROLE", allRoles);

// ==== ENUMS ====

export const unitEnum = pgEnum("Unit", ["gramme", "Kg", "portion", "liter", "milliliter"]);

export const eatingTableTypeEnum = pgEnum("E_EatingTableType", ["TAKEAWAY", "EMPLOYEES", "WAST", "GIFT"]);

export const itemTypeEnum = pgEnum("E_ItemType", ["MENU_ITEM", "RECIPE", "RAW_MATERIAL", "SUPPLEMENT", "MENU_ITEM_OPTION"]);

export const eatingTableMenuItemStatusEnum = pgEnum("E_EatingTableMenuItemStatus", [
  "PENDING",
  "STARTED",
  "DONE",
  "PRINTED",
  "PAID",
  "CONFIRMED",
]);

// ==== TABLES ====

export const enterprises = pgTable("Enterprise", {
  id: varchar("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  isActive: boolean("isActive").default(true).notNull(),
  ownerId: varchar("ownerId").unique(),
  role: jsonb("role").default(["MEMBER"]).$type<string[]>(),
  password: text("password"),
});

export const users = pgTable("User", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username"),
  firstName: text("firstName"),
  lastName: text("lastName"),
  avatar: text("avatar"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  role: jsonb("role").default(["MEMBER"]).$type<string[]>(),
  password: text("password").notNull(),
  enterpriseId: varchar("enterpriseId"),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  preferredDateTimeFormat: text("preferredDateTimeFormat").default("DD/MM/YYYY").notNull(),
  preferredTimeFormat: text("preferredTimeFormat").default("24H").notNull(),
  preferredTimezone: text("preferredTimezone").default("Africa/Algiers").notNull(),
  webPushSubscriptionContainer: jsonb("webPushSubscriptionContainer").$type<string[]>(),
});

export const eatingTables = pgTable("EatingTable", {
  id: varchar("id").primaryKey(),
  name: text("name"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  type: eatingTableTypeEnum("type").default("TAKEAWAY").notNull(),
});

export const categories = pgTable("Category", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  isUnlisted: boolean("isUnlisted").default(false).notNull(),
  iconname: text("iconname"),
  index: integer("index"),
});

export const menuItems = pgTable("MenuItem", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  itemType: itemTypeEnum("itemType").default("MENU_ITEM").notNull(),
  
  // Common fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  createdById: varchar("createdById"),
  enterpriseId: varchar("enterpriseId"),
  
  // Menu item specific fields
  price: real("price"), // Selling price for menu items
  image: text("image"),
  description: text("description"),
  isAvailable: boolean("isAvailable").default(true),
  categoryId: varchar("categoryId"), // null for raw materials
  
  // Recipe/production fields (for both menu items and raw materials)
  producedQuantityPerRecipe: real("producedQuantityPerRecipe"),
  cost: real("cost"), // Production cost
  doesExpensesAndRecipesNeedUpdate: boolean("doesExpensesAndRecipesNeedUpdate").default(false).notNull(),
  
  // Raw material/inventory fields (from expenses)
  tag: jsonb("tag").$type<string[]>(),
  unit: unitEnum("unit"), // Unit of measurement for raw materials
  averagePrice: real("averagePrice"), // Purchase price for raw materials
  stockQuantity: real("stockQuantity").default(0),
  inHouseStockQuantity: real("inHouseStockQuantity"),
  inShopStockQuantity: real("inShopStockQuantity"),
  sellingPrice: real("sellingPrice"), // For raw materials that can be sold directly
  stockConversionRatio: real("stockConversionRatio").default(1),
});

export const orders = pgTable("Order", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  eatingTableId: varchar("eatingTableId").notNull(),
  status: eatingTableMenuItemStatusEnum("status").default("PENDING").notNull(),
});

export const menuItemOrders = pgTable("MenuItemOrder", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  orderId: varchar("orderId").notNull(),
  menuItemId: varchar("menuItemId").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  price: real("price").notNull(),
  status: eatingTableMenuItemStatusEnum("status").default("PENDING").notNull(),
});

export const menuItemIngredients = pgTable("MenuItemIngredient", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  parentMenuItemId: varchar("parentMenuItemId").notNull(), // The finished product
  ingredientMenuItemId: varchar("ingredientMenuItemId").notNull(), // The raw material/ingredient
  quantity: real("quantity").notNull(), // Quantity of ingredient needed
});

export const itemPrices = pgTable("ItemPrice", {
  id: varchar("id").primaryKey(),
  priceValue: real("priceValue").notNull(),
  unitValue: real("unitValue"),
  multiplier: real("multiplier").default(1),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  menuItemId: varchar("menuItemId"), // Now references menuItems instead of expenses
});

export const menuItemSubMenuItems = pgTable(
  "MenuItemSubMenuItem",
  {
    id: varchar("id").primaryKey(),
    parentMenuItemId: varchar("parentMenuItemId").notNull(),
    subMenuItemId: varchar("subMenuItemId").notNull(),
    quantity: real("quantity").notNull(),
    producedMenuItemsQuantity: real("producedMenuItemsQuantity").default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("unique_parent_sub").on(t.parentMenuItemId, t.subMenuItemId)]
);

// ==== RELATIONS ====

export const enterpriseRelations = relations(enterprises, ({ one, many }) => ({
  owner: one(users, { fields: [enterprises.ownerId], references: [users.id] }),
  users: many(users),
  items: many(menuItems),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  enterprise: one(enterprises, { fields: [users.enterpriseId], references: [enterprises.id] }),
  createdItems: many(menuItems),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, { fields: [menuItems.categoryId], references: [categories.id] }),
  creator: one(users, { fields: [menuItems.createdById], references: [users.id] }),
  enterprise: one(enterprises, { fields: [menuItems.enterpriseId], references: [enterprises.id] }),
  ingredients: many(menuItemIngredients, { relationName: "parentItem" }),
  usedInItems: many(menuItemIngredients, { relationName: "ingredientItem" }),
  priceHistory: many(itemPrices),
  subMenuItems: many(menuItemSubMenuItems, { relationName: "parentMenuItem" }),
  usedAsSubMenuItem: many(menuItemSubMenuItems, { relationName: "subMenuItem" }),
  orders: many(menuItemOrders),
}));

export const menuItemIngredientsRelations = relations(menuItemIngredients, ({ one }) => ({
  parentItem: one(menuItems, {
    fields: [menuItemIngredients.parentMenuItemId],
    references: [menuItems.id],
    relationName: "parentItem",
  }),
  ingredient: one(menuItems, {
    fields: [menuItemIngredients.ingredientMenuItemId],
    references: [menuItems.id],
    relationName: "ingredientItem",
  }),
}));

export const menuItemSubMenuItemsRelations = relations(menuItemSubMenuItems, ({ one }) => ({
  parentMenuItem: one(menuItems, {
    fields: [menuItemSubMenuItems.parentMenuItemId],
    references: [menuItems.id],
    relationName: "parentMenuItem",
  }),
  subMenuItem: one(menuItems, {
    fields: [menuItemSubMenuItems.subMenuItemId],
    references: [menuItems.id],
    relationName: "subMenuItem",
  }),
}));

export const itemPricesRelations = relations(itemPrices, ({ one }) => ({
  menuItem: one(menuItems, { fields: [itemPrices.menuItemId], references: [menuItems.id] }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  eatingTable: one(eatingTables, { fields: [orders.eatingTableId], references: [eatingTables.id] }),
  menuItemOrders: many(menuItemOrders),
}));

export const menuItemOrderRelations = relations(menuItemOrders, ({ one }) => ({
  order: one(orders, { fields: [menuItemOrders.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [menuItemOrders.menuItemId], references: [menuItems.id] }),
}));

export const eatingTableRelations = relations(eatingTables, ({ many }) => ({
  orders: many(orders),
}));

// types users
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Users = typeof users.$inferSelect;
export type NewUsers = typeof users.$inferInsert;
// types enterprises
export type Enterprises = typeof enterprises.$inferSelect;
export type NewEnterprises = typeof enterprises.$inferInsert;
// types eatingTables
export type EatingTables = typeof eatingTables.$inferSelect;
export type NewEatingTables = typeof eatingTables.$inferInsert;
// types menuItems (unified items table)
export type MenuItems = typeof menuItems.$inferSelect;
export type NewMenuItems = typeof menuItems.$inferInsert;
// types menuItemIngredients
export type MenuItemIngredients = typeof menuItemIngredients.$inferSelect;
export type NewMenuItemIngredients = typeof menuItemIngredients.$inferInsert;
// types itemPrices
export type ItemPrices = typeof itemPrices.$inferSelect;
export type NewItemPrices = typeof itemPrices.$inferInsert;
export type Categories = typeof categories.$inferSelect;
export type NewCategories = typeof categories.$inferInsert;
