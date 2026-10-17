CREATE TABLE "ama_diagnostic_rows" (
	"row_id" text PRIMARY KEY NOT NULL,
	"region_id" text NOT NULL,
	"description" text NOT NULL,
	"nerve_roots" text[] DEFAULT '{}'::text[] NOT NULL,
	"help" text,
	"questions" jsonb NOT NULL,
	"entries" jsonb NOT NULL,
	"examination_tasks" jsonb NOT NULL
);
