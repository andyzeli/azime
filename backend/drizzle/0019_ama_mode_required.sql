UPDATE "patientcase" SET "ama_mode" = CASE WHEN "case_type" = 'work_injury' THEN 'rating' ELSE 'off' END WHERE "ama_mode" IS NULL;--> statement-breakpoint
ALTER TABLE "patientcase" ALTER COLUMN "ama_mode" SET NOT NULL;
