CREATE TABLE "case_report" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"input" jsonb NOT NULL,
	"report" text,
	"source" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_report" ADD CONSTRAINT "case_report_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_report_case_idx" ON "case_report" USING btree ("case_id","id");