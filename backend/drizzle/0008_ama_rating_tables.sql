CREATE TABLE "ama_rating_tables" (
  "table_id" text PRIMARY KEY NOT NULL,
  "description" text NOT NULL,
  "source_ref" jsonb NOT NULL,
  "class_options" jsonb NOT NULL,
  "second_question" jsonb NOT NULL,
  "results" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_diagnoses" ADD COLUMN "ama_rating_table_ids" text[] DEFAULT '{}'::text[] NOT NULL;
