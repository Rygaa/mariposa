CREATE TABLE "MenuItemImage" (
	"id" varchar PRIMARY KEY NOT NULL,
	"menuItemId" varchar NOT NULL,
	"fileId" varchar NOT NULL,
	"shouldBeUsedInMenuItemsPage" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
