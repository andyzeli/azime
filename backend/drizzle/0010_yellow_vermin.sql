ALTER TABLE "record" ALTER COLUMN "summary" SET DATA TYPE jsonb USING CASE WHEN "summary" IS NULL THEN NULL ELSE to_jsonb("summary") END;--> statement-breakpoint
ALTER TABLE "record" ADD COLUMN "summary_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "record" ADD COLUMN "provider_name" text;--> statement-breakpoint
ALTER TABLE "record" ADD COLUMN "document_group" text;--> statement-breakpoint
ALTER TABLE "record" ADD COLUMN "document_type" text;
