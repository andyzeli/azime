CREATE TABLE "case_physician_steering" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"steering" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "case_physician_steering" ADD CONSTRAINT "case_physician_steering_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_refined_analysis" ADD CONSTRAINT "case_refined_analysis_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_physician_steering_case_id_unique" ON "case_physician_steering" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_refined_analysis_case_id_unique" ON "case_refined_analysis" USING btree ("case_id");