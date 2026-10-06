-- Keep only the newest completed exam prep per case/region.
DELETE FROM "case_refined_pre_exam_analysis" WHERE "analysis" IS NULL;--> statement-breakpoint
DELETE FROM "case_refined_pre_exam_analysis" r
USING "case_refined_pre_exam_analysis" newer
WHERE r."case_id" = newer."case_id" AND r."region" = newer."region" AND r."id" < newer."id";--> statement-breakpoint
-- Per-region visit documents and the post-exam snapshots built from them use the old shape.
DELETE FROM "case_post_exam_analysis";--> statement-breakpoint
DELETE FROM "case_visit_documentation";--> statement-breakpoint
DROP INDEX "case_refined_pre_exam_analysis_case_region_idx";--> statement-breakpoint
DROP INDEX "case_visit_documentation_case_region_unique";--> statement-breakpoint
ALTER TABLE "case_refined_pre_exam_analysis" ALTER COLUMN "analysis" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "case_refined_pre_exam_analysis_case_region_unique" ON "case_refined_pre_exam_analysis" USING btree ("case_id","region");--> statement-breakpoint
CREATE UNIQUE INDEX "case_visit_documentation_case_unique" ON "case_visit_documentation" USING btree ("case_id");--> statement-breakpoint
ALTER TABLE "case_visit_documentation" DROP COLUMN "region";