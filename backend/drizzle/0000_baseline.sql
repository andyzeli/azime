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
CREATE TABLE "canonical_diagnoses" (
	"id" text PRIMARY KEY NOT NULL,
	"region_id" text NOT NULL,
	"label" text NOT NULL,
	"definition" text,
	"icd_prefixes" text[] NOT NULL
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
CREATE TABLE "case_physician_steering" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"region" text,
	"steering" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_pre_exam_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"region" text,
	"input_snapshot" jsonb,
	"analysis" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_provider_summaries" (
	"case_id" integer PRIMARY KEY NOT NULL,
	"summary" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" integer NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"discipline" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_records_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"summary" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_refined_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "diagnosis_mentions" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"record_id" integer NOT NULL,
	"name" text NOT NULL,
	"icd" text,
	"region" text NOT NULL,
	"canonical_dx" text NOT NULL,
	"evidence_page" integer NOT NULL,
	"evidence_quote" text NOT NULL,
	"event_date" date
);
--> statement-breakpoint
CREATE TABLE "gen_report" (
	"id" integer PRIMARY KEY NOT NULL,
	"case_id" integer,
	"type" varchar(255),
	"report" text
);
--> statement-breakpoint
CREATE TABLE "ladder_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" text,
	"canonical_dx_id" text NOT NULL,
	"treatment_id" text NOT NULL,
	"applicability" text,
	"adequacy" text
);
--> statement-breakpoint
CREATE TABLE "ladder_entry_sources" (
	"ladder_entry_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	CONSTRAINT "ladder_entry_sources_ladder_entry_id_source_id_pk" PRIMARY KEY("ladder_entry_id","source_id")
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
	"case_status" varchar(255),
	"injury_type" varchar(50) DEFAULT 'specific' NOT NULL,
	"date_of_injury" date,
	"regions" text[] DEFAULT '{}' NOT NULL
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
	"provider_id" uuid,
	"document_type" text NOT NULL,
	"event_date" date,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"edition" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standardqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"q" text,
	"type" varchar
);
--> statement-breakpoint
CREATE TABLE "treatment_aliases" (
	"treatment_id" text NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "treatment_aliases_treatment_id_alias_pk" PRIMARY KEY("treatment_id","alias")
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" text PRIMARY KEY NOT NULL,
	"region" text,
	"category" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "treatments_category_check" CHECK ("treatments"."category" in ('conservative', 'medication', 'injection', 'surgical', 'multimodal'))
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
ALTER TABLE "case_physician_steering" ADD CONSTRAINT "case_physician_steering_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_pre_exam_analysis" ADD CONSTRAINT "case_pre_exam_analysis_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_provider_summaries" ADD CONSTRAINT "case_provider_summaries_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_providers" ADD CONSTRAINT "case_providers_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_records_summary" ADD CONSTRAINT "case_records_summary_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_refined_analysis" ADD CONSTRAINT "case_refined_analysis_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinicalnote" ADD CONSTRAINT "clinicalnote_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinicalnote" ADD CONSTRAINT "clinicalnote_apt_appointments_id_fk" FOREIGN KEY ("apt") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_mentions" ADD CONSTRAINT "diagnosis_mentions_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_mentions" ADD CONSTRAINT "diagnosis_mentions_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen_report" ADD CONSTRAINT "gen_report_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_canonical_dx_id_canonical_diagnoses_id_fk" FOREIGN KEY ("canonical_dx_id") REFERENCES "public"."canonical_diagnoses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entry_sources" ADD CONSTRAINT "ladder_entry_sources_ladder_entry_id_ladder_entries_id_fk" FOREIGN KEY ("ladder_entry_id") REFERENCES "public"."ladder_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entry_sources" ADD CONSTRAINT "ladder_entry_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_disability_questionnaire" ADD CONSTRAINT "pain_disability_questionnaire_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_disability_questionnaire" ADD CONSTRAINT "pain_disability_questionnaire_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patientcase" ADD CONSTRAINT "patientcase_provider_users_id_fk" FOREIGN KEY ("provider") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patientcase" ADD CONSTRAINT "patientcase_case_contact_case_contacts_id_fk" FOREIGN KEY ("case_contact") REFERENCES "public"."case_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_instance" ADD CONSTRAINT "patient_questionnaire_instance_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_instance" ADD CONSTRAINT "patient_questionnaire_instance_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_provider_id_case_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."case_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_aliases" ADD CONSTRAINT "treatment_aliases_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_physician_steering_case_id_region_id_unique" ON "case_physician_steering" USING btree ("case_id","region");--> statement-breakpoint
CREATE UNIQUE INDEX "case_pre_exam_analysis_case_id_region_unique" ON "case_pre_exam_analysis" USING btree ("case_id","region");--> statement-breakpoint
CREATE UNIQUE INDEX "case_records_summary_case_id_unique" ON "case_records_summary" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_refined_analysis_case_id_unique" ON "case_refined_analysis" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "diagnosis_mentions_case_id_idx" ON "diagnosis_mentions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "diagnosis_mentions_record_id_idx" ON "diagnosis_mentions" USING btree ("record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pdq_access_token_idx" ON "pain_disability_questionnaire" USING btree ("access_token");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_questionnaire_access_token_idx" ON "patient_questionnaire_instance" USING btree ("access_token");