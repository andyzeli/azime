CREATE TABLE "pain_disability_questionnaire" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"appointment_id" integer,
	"access_token" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'in_progress' NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_score" integer,
	"functional_score" integer,
	"psychosocial_score" integer,
	"instrument_version" varchar(64) DEFAULT 'pdq-v1' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pain_disability_questionnaire" ADD CONSTRAINT "pain_disability_questionnaire_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_disability_questionnaire" ADD CONSTRAINT "pain_disability_questionnaire_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pdq_access_token_idx" ON "pain_disability_questionnaire" USING btree ("access_token");