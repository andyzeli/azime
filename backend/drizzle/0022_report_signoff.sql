CREATE TABLE "practice_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_report" ADD COLUMN "signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "case_report" ADD COLUMN "signed_by" text;--> statement-breakpoint
ALTER TABLE "case_report" ADD COLUMN "signed_by_email" text;--> statement-breakpoint
ALTER TABLE "case_report" ADD COLUMN "signed_pdf" "bytea";