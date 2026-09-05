CREATE TABLE "case_provider_summaries" (
	"case_id" integer PRIMARY KEY NOT NULL,
	"summary" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_provider_summaries" ADD CONSTRAINT "case_provider_summaries_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;