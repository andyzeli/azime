CREATE TABLE "anchoras" (
	"qid" integer,
	"case" integer,
	"score" integer
);
--> statement-breakpoint
CREATE TABLE "anchorqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"q" text,
	"type" varchar
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"provider" uuid NOT NULL,
	"date" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(255),
	"email" varchar(255),
	"website" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "case_records_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"section" varchar(255),
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "clinicalnote" (
	"id" serial NOT NULL,
	"case_id" integer,
	"apt" integer,
	"type" varchar(255),
	"audio_url" varchar(255),
	"note" text
);
--> statement-breakpoint
CREATE TABLE "gen_report" (
	"id" integer PRIMARY KEY NOT NULL,
	"case_id" integer,
	"type" varchar(255),
	"report" text
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
CREATE TABLE "patientcase" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_name" varchar(255),
	"patient_last_name" varchar(255),
	"provider" uuid,
	"case_contact" integer,
	"case_type" varchar(255),
	"case_status" varchar(255)
);
--> statement-breakpoint
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
CREATE TABLE "record" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"url" text,
	"summary" jsonb,
	"summary_status" text DEFAULT 'pending' NOT NULL,
	"name" text,
	"provider_name" text,
	"document_type" text NOT NULL,
	"event_date" date,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "standardqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"q" text,
	"type" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"email" text,
	"specialty" text
);
--> statement-breakpoint
ALTER TABLE "anchoras" ADD CONSTRAINT "anchoras_qid_anchorqs_id_fk" FOREIGN KEY ("qid") REFERENCES "public"."anchorqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anchoras" ADD CONSTRAINT "anchoras_case_patientcase_id_fk" FOREIGN KEY ("case") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_users_id_fk" FOREIGN KEY ("provider") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_records_summary" ADD CONSTRAINT "case_records_summary_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinicalnote" ADD CONSTRAINT "clinicalnote_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinicalnote" ADD CONSTRAINT "clinicalnote_apt_appointments_id_fk" FOREIGN KEY ("apt") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen_report" ADD CONSTRAINT "gen_report_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_disability_questionnaire" ADD CONSTRAINT "pain_disability_questionnaire_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_disability_questionnaire" ADD CONSTRAINT "pain_disability_questionnaire_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patientcase" ADD CONSTRAINT "patientcase_provider_users_id_fk" FOREIGN KEY ("provider") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patientcase" ADD CONSTRAINT "patientcase_case_contact_case_contacts_id_fk" FOREIGN KEY ("case_contact") REFERENCES "public"."case_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_instance" ADD CONSTRAINT "patient_questionnaire_instance_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_instance" ADD CONSTRAINT "patient_questionnaire_instance_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pdq_access_token_idx" ON "pain_disability_questionnaire" USING btree ("access_token");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_questionnaire_access_token_idx" ON "patient_questionnaire_instance" USING btree ("access_token");