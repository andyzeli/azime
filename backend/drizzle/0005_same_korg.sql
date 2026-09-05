CREATE TABLE "case_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" integer NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"discipline" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "record" ADD COLUMN "provider_id" uuid;--> statement-breakpoint
ALTER TABLE "case_providers" ADD CONSTRAINT "case_providers_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_provider_id_case_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."case_providers"("id") ON DELETE no action ON UPDATE no action;