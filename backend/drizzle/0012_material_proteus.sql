CREATE TABLE "patient_questionnaire_instance" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"appointment_id" integer,
	"type" varchar(80) NOT NULL,
	"access_token" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'in_progress' NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scores" jsonb,
	"instrument_version" varchar(64) NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_questionnaire_instance" ADD CONSTRAINT "patient_questionnaire_instance_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_instance" ADD CONSTRAINT "patient_questionnaire_instance_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_questionnaire_access_token_idx" ON "patient_questionnaire_instance" USING btree ("access_token");