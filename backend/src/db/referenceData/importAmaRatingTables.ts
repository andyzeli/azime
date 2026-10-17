import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { z } from "zod";
import { amaRatingTableReferenceDataSchema } from "@azime/contracts";
import * as schema from "../schema.js";
import { amaRatingTablesDirectory, readAmaImportFiles } from "./amaImportFiles.js";

// Validate the complete reference file before upserting tables in one transaction.
export async function importAmaRatingTables(
  database: Pick<typeof import("../index.js").db, "transaction">,
  input: unknown,
) {
  const tables = amaRatingTableReferenceDataSchema.parse(input);
  await database.transaction(async transaction => {
    for (const table of tables) {
      const values = {
        tableId: table.table_id, description: table.description,
        instructions: table.instructions ?? null,
        sourceRef: table.source_ref, classOptions: table.class_options,
        modOptions: table.mod_options, results: table.results,
      };
      await transaction.insert(schema.AmaRatingTables).values(values)
        .onConflictDoUpdate({ target: schema.AmaRatingTables.tableId, set: values });
    }
  });
  return { tables: tables.length, tableIds: tables.map(t => t.table_id) };
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== "--");
  const validateOnly = args.includes("--validate-only");
  const files = args.filter(arg => arg !== "--validate-only");
  if (files.length > 1 || files[0]?.startsWith("--"))
    throw new Error("Usage: importAmaRatingTables.js [--validate-only] [upload-file-or-directory]");
  const inputPath = files[0] ? path.resolve(files[0]) : amaRatingTablesDirectory;
  console.log("Reading AMA rating tables from:", inputPath);
  const tables = amaRatingTableReferenceDataSchema.parse(await readAmaImportFiles(inputPath));
  if (validateOnly) {
    console.log({ tables: tables.length, tableIds: tables.map(t => t.table_id) });
    return;
  }
  dotenv.config({ path: ".env.local" });
  dotenv.config();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log(await importAmaRatingTables(drizzle(client, { schema }), tables));
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof z.ZodError ? z.prettifyError(error) : error);
    process.exitCode = 1;
  });
}
