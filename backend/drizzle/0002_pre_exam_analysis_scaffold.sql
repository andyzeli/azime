CREATE TABLE "case_pre_exam_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_pre_exam_analysis" ADD CONSTRAINT "case_pre_exam_analysis_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_pre_exam_analysis_case_id_unique" ON "case_pre_exam_analysis" USING btree ("case_id");