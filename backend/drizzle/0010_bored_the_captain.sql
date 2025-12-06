CREATE TABLE "ActivityLog" (
	"id" varchar PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"userId" varchar,
	"userName" text,
	"request" jsonb NOT NULL,
	"response" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
