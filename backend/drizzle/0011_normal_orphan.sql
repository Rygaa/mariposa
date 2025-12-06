ALTER TABLE "ItemPrice" ALTER COLUMN "priceValue" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ItemPrice" ALTER COLUMN "multiplier" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ItemPrice" ADD COLUMN "updatedAt" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "ItemPrice" ADD COLUMN "isTemplate" boolean DEFAULT false;