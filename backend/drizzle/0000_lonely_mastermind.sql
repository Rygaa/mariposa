CREATE TYPE "public"."E_EatingTableMenuItemStatus" AS ENUM('INITIALIZED', 'CONFIRMED', 'WAITING_TO_BE_PRINTED', 'PRINTED', 'SERVED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."E_EatingTableType" AS ENUM('TAKEAWAY', 'EMPLOYEES', 'WAST', 'GIFT');--> statement-breakpoint
CREATE TYPE "public"."E_PriceType" AS ENUM('selling', 'buying');--> statement-breakpoint
CREATE TYPE "public"."ROLE" AS ENUM('ROOT', 'ADMIN', 'MEMBER', 'enterprises_view', 'enterprises_create', 'enterprises_update', 'enterprises_delete', 'users_view', 'users_create', 'users_update', 'users_delete', 'eatingTables_view', 'eatingTables_create', 'eatingTables_update', 'eatingTables_delete', 'categories_view', 'categories_create', 'categories_update', 'categories_delete', 'menuItems_view', 'menuItems_create', 'menuItems_update', 'menuItems_delete', 'orders_view', 'orders_create', 'orders_update', 'orders_delete', 'menuItemOrders_view', 'menuItemOrders_create', 'menuItemOrders_update', 'menuItemOrders_delete', 'menuItemIngredients_view', 'menuItemIngredients_create', 'menuItemIngredients_update', 'menuItemIngredients_delete', 'itemPrices_view', 'itemPrices_create', 'itemPrices_update', 'itemPrices_delete', 'menuItemSubMenuItems_view', 'menuItemSubMenuItems_create', 'menuItemSubMenuItems_update', 'menuItemSubMenuItems_delete');--> statement-breakpoint
CREATE TYPE "public"."E_Type" AS ENUM('MENU_ITEM', 'RECIPE', 'RAW_MATERIAL', 'SUPPLEMENT', 'MENU_ITEM_OPTION');--> statement-breakpoint
CREATE TYPE "public"."Unit" AS ENUM('gramme', 'Kg', 'portion', 'liter', 'milliliter');--> statement-breakpoint
CREATE TABLE "Category" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"isUnlisted" boolean DEFAULT false NOT NULL,
	"iconname" text,
	"index" integer
);
--> statement-breakpoint
CREATE TABLE "EatingTable" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"type" "E_EatingTableType" DEFAULT 'TAKEAWAY' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Enterprise" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"ownerId" varchar,
	"role" jsonb DEFAULT '["MEMBER"]'::jsonb,
	"password" text,
	CONSTRAINT "Enterprise_email_unique" UNIQUE("email"),
	CONSTRAINT "Enterprise_ownerId_unique" UNIQUE("ownerId")
);
--> statement-breakpoint
CREATE TABLE "ItemPrice" (
	"id" varchar PRIMARY KEY NOT NULL,
	"priceValue" real NOT NULL,
	"unitValue" real,
	"multiplier" real DEFAULT 1,
	"description" text,
	"priceType" "E_PriceType" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"menuItemId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MenuItemImage" (
	"id" varchar PRIMARY KEY NOT NULL,
	"menuItemId" varchar NOT NULL,
	"fileId" varchar NOT NULL,
	"shouldBeUsedInMenuItemsPage" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MenuItemOrder" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"orderId" varchar NOT NULL,
	"menuItemId" varchar NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" real NOT NULL,
	"status" "E_EatingTableMenuItemStatus" DEFAULT 'INITIALIZED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MenuItemSubMenuItem" (
	"id" varchar PRIMARY KEY NOT NULL,
	"parentMenuItemId" varchar NOT NULL,
	"subMenuItemId" varchar NOT NULL,
	"quantity" real NOT NULL,
	"producedMenuItemsQuantity" real DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MenuItem" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subName" text,
	"type" jsonb DEFAULT '["MENU_ITEM"]' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"createdById" varchar,
	"enterpriseId" varchar,
	"price" real,
	"image" jsonb,
	"description" text,
	"isAvailable" boolean DEFAULT true,
	"categoryId" varchar,
	"producedQuantityPerRecipe" real,
	"cost" real,
	"doesExpensesAndRecipesNeedUpdate" boolean DEFAULT false NOT NULL,
	"tag" jsonb,
	"unit" "Unit",
	"averagePrice" real,
	"stockQuantity" real DEFAULT 0,
	"inHouseStockQuantity" real,
	"inShopStockQuantity" real,
	"stockConversionRatio" real DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "Order" (
	"id" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"eatingTableId" varchar NOT NULL,
	"status" "E_EatingTableMenuItemStatus" DEFAULT 'INITIALIZED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"firstName" text,
	"lastName" text,
	"avatar" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"role" jsonb DEFAULT '["MEMBER"]'::jsonb,
	"password" text NOT NULL,
	"enterpriseId" varchar,
	"subscriptionEndDate" timestamp,
	"preferredDateTimeFormat" text DEFAULT 'DD/MM/YYYY' NOT NULL,
	"preferredTimeFormat" text DEFAULT '24H' NOT NULL,
	"preferredTimezone" text DEFAULT 'Africa/Algiers' NOT NULL,
	"webPushSubscriptionContainer" jsonb,
	"meta" jsonb,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_parent_sub" ON "MenuItemSubMenuItem" USING btree ("parentMenuItemId","subMenuItemId");