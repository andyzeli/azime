DELETE FROM "case_records_summary"
WHERE "section" IS DISTINCT FROM 'ai_aggregate_summary'
   OR "case_id" IS NULL
   OR "summary" IS NULL;--> statement-breakpoint
DELETE FROM "case_records_summary" AS older
USING "case_records_summary" AS newer
WHERE older."case_id" = newer."case_id"
  AND older."id" < newer."id";--> statement-breakpoint
ALTER TABLE "case_records_summary" ALTER COLUMN "case_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "case_records_summary" ALTER COLUMN "summary" SET DATA TYPE jsonb USING "summary"::jsonb;--> statement-breakpoint
ALTER TABLE "case_records_summary" ALTER COLUMN "summary" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "case_records_summary_case_id_unique" ON "case_records_summary" USING btree ("case_id");--> statement-breakpoint
ALTER TABLE "case_records_summary" DROP COLUMN "section";
