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
	"web" varchar(255),
	"url" varchar
);
--> statement-breakpoint
CREATE TABLE "clinicalnote" (
	"id" serial NOT NULL,
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
CREATE TABLE "patientcase" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_name" varchar(255),
	"patient_last_name" varchar(255),
	"provider" uuid NOT NULL,
	"case_contact" integer
);
--> statement-breakpoint
CREATE TABLE "record" (
	"id" serial PRIMARY KEY NOT NULL,
	"case" integer,
	"url" text,
	"summary" text
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
ALTER TABLE "clinicalnote" ADD CONSTRAINT "clinicalnote_apt_appointments_id_fk" FOREIGN KEY ("apt") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gen_report" ADD CONSTRAINT "gen_report_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patientcase" ADD CONSTRAINT "patientcase_provider_users_id_fk" FOREIGN KEY ("provider") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patientcase" ADD CONSTRAINT "patientcase_case_contact_case_contacts_id_fk" FOREIGN KEY ("case_contact") REFERENCES "public"."case_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_case_patientcase_id_fk" FOREIGN KEY ("case") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;