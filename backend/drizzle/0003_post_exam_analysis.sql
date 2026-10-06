ALTER TABLE "case_post_exam_snapshot" RENAME TO "case_post_exam_analysis";--> statement-breakpoint
ALTER TABLE "case_post_exam_analysis" DROP CONSTRAINT "case_post_exam_snapshot_case_id_patientcase_id_fk";
--> statement-breakpoint
DROP INDEX "case_post_exam_snapshot_case_region_idx";--> statement-breakpoint
ALTER TABLE "case_post_exam_analysis" ADD COLUMN "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "case_post_exam_analysis" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "case_post_exam_analysis" ADD CONSTRAINT "case_post_exam_analysis_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_post_exam_analysis_case_region_idx" ON "case_post_exam_analysis" USING btree ("case_id","region","id");