CREATE TABLE "case_records_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"section" varchar(255),
	"summary" text
);
--> statement-breakpoint
ALTER TABLE "case_records_summary" ADD CONSTRAINT "case_records_summary_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;