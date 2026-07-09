ALTER TABLE "record" RENAME COLUMN "case" TO "case_id";--> statement-breakpoint
ALTER TABLE "record" DROP CONSTRAINT "record_case_patientcase_id_fk";
--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_case_id_patientcase_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."patientcase"("id") ON DELETE no action ON UPDATE no action;