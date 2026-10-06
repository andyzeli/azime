CREATE TABLE "case_refined_pre_exam_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"region" text NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"analysis" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_refined_pre_exam_analysis" ADD CONSTRAINT "case_refined_pre_exam_analysis_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_refined_pre_exam_analysis_case_region_idx" ON "case_refined_pre_exam_analysis" USING btree ("case_id","region","id");