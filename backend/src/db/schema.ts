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

export const typeEnum = pgEnum("E_Type", ["MENU_ITEM", "RECIPE", "RAW_MATERIAL", "SUPPLEMENT", "MENU_ITEM_OPTION"]);

export const eatingTableMenuItemStatusEnum = pgEnum("E_EatingTableMenuItemStatus", [
  "INITIALIZED",
  "CONFIRMED",
  "WAITING_TO_BE_PRINTED",
  "PRINTED",
  "SERVED",
  "PAID",
]);

export const priceTypeEnum = pgEnum("E_PriceType", ["selling", "buying"]);

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
  meta: jsonb("meta").$type<Record<string, any>>(),
});

export const eatingTables = pgTable("EatingTable", {
  id: varchar("id").primaryKey(),
  name: text("name"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  type: eatingTableTypeEnum("type").default("TAKEAWAY").notNull(),
  orderIndex: integer("orderIndex").default(0).notNull(),
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
  subName: text("subName"),
  type: jsonb("type").default('["MENU_ITEM"]').$type<Array<"MENU_ITEM" | "RECIPE" | "RAW_MATERIAL" | "SUPPLEMENT" | "MENU_ITEM_OPTION">>().notNull(),
  
  // Common fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  createdById: varchar("createdById"),
  enterpriseId: varchar("enterpriseId"),
  index: integer("index"),
  
  // Menu item specific fields
  price: real("price"), // Selling price for menu items
  image: jsonb("image").$type<string[]>(),
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
  stockConversionRatio: real("stockConversionRatio").default(1),
  designVersion: integer("designVersion"),
  imageSourceMenuItemId: varchar("imageSourceMenuItemId"), // Reference to another menu item to use its images
});

export const orders = pgTable("Order", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  eatingTableId: varchar("eatingTableId").notNull(),
  status: eatingTableMenuItemStatusEnum("status").default("INITIALIZED").notNull(),
});

export const menuItemOrders = pgTable("MenuItemOrder", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  orderId: varchar("orderId").notNull(),
  menuItemId: varchar("menuItemId").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  price: real("price").notNull(),
  parentMenuItemOrderId: varchar("parentMenuItemOrderId"), // Links supplements to their parent menu item order
});

export const menuItemImages = pgTable("MenuItemImage", {
  id: varchar("id").primaryKey(),
  menuItemId: varchar("menuItemId").notNull(),
  fileId: varchar("fileId").notNull(),
  shouldBeUsedInMenuItemsPage: boolean("shouldBeUsedInMenuItemsPage").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const itemPrices = pgTable("ItemPrice", {
  id: varchar("id").primaryKey(),
  priceValue: real("priceValue").notNull(),
  unitValue: real("unitValue"),
  multiplier: real("multiplier").default(1),
  description: text("description"),
  priceType: priceTypeEnum("priceType").notNull(), // "selling" or "buying"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  menuItemId: varchar("menuItemId").notNull(), // References menuItems
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
  sellingPrices: many(itemPrices, { relationName: "sellingPrices" }),
  buyingPrices: many(itemPrices, { relationName: "buyingPrices" }),
  subMenuItems: many(menuItemSubMenuItems, { relationName: "parentMenuItem" }),
  usedAsSubMenuItem: many(menuItemSubMenuItems, { relationName: "subMenuItem" }),
  orders: many(menuItemOrders),
  images: many(menuItemImages),
  imageSourceMenuItem: one(menuItems, { 
    fields: [menuItems.imageSourceMenuItemId], 
    references: [menuItems.id],
    relationName: "imageSource"
  }),
  itemsUsingThisAsImageSource: many(menuItems, { relationName: "imageSource" }),
}));

export const menuItemImageRelations = relations(menuItemImages, ({ one }) => ({
  menuItem: one(menuItems, { fields: [menuItemImages.menuItemId], references: [menuItems.id] }),
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

export const menuItemOrderRelations = relations(menuItemOrders, ({ one, many }) => ({
  order: one(orders, { fields: [menuItemOrders.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [menuItemOrders.menuItemId], references: [menuItems.id] }),
  parentMenuItemOrder: one(menuItemOrders, {
    fields: [menuItemOrders.parentMenuItemOrderId],
    references: [menuItemOrders.id],
    relationName: "parentMenuItemOrder",
  }),
  childMenuItemOrders: many(menuItemOrders, { relationName: "parentMenuItemOrder" }),
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
// types menuItemSubMenuItems
export type MenuItemSubMenuItems = typeof menuItemSubMenuItems.$inferSelect;
export type NewMenuItemSubMenuItems = typeof menuItemSubMenuItems.$inferInsert;
// types itemPrices
export type ItemPrices = typeof itemPrices.$inferSelect;
export type NewItemPrices = typeof itemPrices.$inferInsert;
export type Categories = typeof categories.$inferSelect;
export type NewCategories = typeof categories.$inferInsert;
// types orders
export type Orders = typeof orders.$inferSelect;
export type NewOrders = typeof orders.$inferInsert;
// types menuItemOrders
export type MenuItemOrders = typeof menuItemOrders.$inferSelect;
export type NewMenuItemOrders = typeof menuItemOrders.$inferInsert;
// types menuItemImages
export type MenuItemImages = typeof menuItemImages.$inferSelect;
export type NewMenuItemImages = typeof menuItemImages.$inferInsert;
