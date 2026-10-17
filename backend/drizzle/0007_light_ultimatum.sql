ALTER TABLE "ladder_entry_sources" DROP CONSTRAINT "ladder_entry_sources_ladder_entry_id_ladder_entries_id_fk";--> statement-breakpoint
ALTER TABLE "ladder_entries" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ladder_entries" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "ladder_entry_sources" ALTER COLUMN "ladder_entry_id" SET DATA TYPE text USING "ladder_entry_id"::text;--> statement-breakpoint
ALTER TABLE "ladder_entry_sources" ADD CONSTRAINT "ladder_entry_sources_ladder_entry_id_ladder_entries_id_fk" FOREIGN KEY ("ladder_entry_id") REFERENCES "public"."ladder_entries"("id") ON DELETE no action ON UPDATE no action;
