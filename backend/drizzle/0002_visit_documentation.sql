CREATE TABLE "case_post_exam_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"region" text NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_visit_documentation" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"region" text NOT NULL,
	"documentation" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_post_exam_snapshot" ADD CONSTRAINT "case_post_exam_snapshot_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_visit_documentation" ADD CONSTRAINT "case_visit_documentation_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_post_exam_snapshot_case_region_idx" ON "case_post_exam_snapshot" USING btree ("case_id","region","id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_visit_documentation_case_region_unique" ON "case_visit_documentation" USING btree ("case_id","region");