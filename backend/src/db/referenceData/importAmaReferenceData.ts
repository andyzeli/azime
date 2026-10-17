import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { z } from "zod";
import {
  amaReferenceDataSchema,
  normalizeAmaRegion,
  type AmaDiagnosticRow,
} from "@azime/contracts";
import { AmaDiagnosticRows } from "../schema.js";
import { amaRowsDirectory, readAmaImportFiles } from "./amaImportFiles.js";

export function summarizeAmaReferenceData(rows: AmaDiagnosticRow[]) {
  return {
    rows: rows.length,
    entries: rows.reduce((count, row) => count + row.entries.length, 0),
    questions: rows.reduce((count, row) => count + row.questions.length, 0),
    examinationTasks: rows.reduce(
      (count, row) => count + row.examination_tasks.length,
      0,
    ),
  };
}

export async function importAmaReferenceData(
  connectionString: string,
  input: unknown,
) {
  // Validate the complete upload before connecting or writing any row.
  const rows = amaReferenceDataSchema.parse(input);
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    const database = drizzle(client);
    return await database.transaction(async (transaction) => {
      for (const row of rows) {
        const values = {
          rowId: row.row_id,
          regionId: normalizeAmaRegion(row.region_id),
          description: row.description,
          nerveRoots: row.nerve_roots,
          help: row.help ?? null,
          questions: row.questions,
          entries: row.entries,
          examinationTasks: row.examination_tasks,
        };
        await transaction
          .insert(AmaDiagnosticRows)
          .values(values)
          .onConflictDoUpdate({
            target: AmaDiagnosticRows.rowId,
            set: values,
          });
      }
      const stored = await transaction
        .select()
        .from(AmaDiagnosticRows)
        .where(
          inArray(
            AmaDiagnosticRows.rowId,
            rows.map((row) => row.row_id),
          ),
        );
      const summary = summarizeAmaReferenceData(
        stored.map((row) => ({
          row_id: row.rowId,
          region_id: row.regionId,
          description: row.description,
          nerve_roots: row.nerveRoots,
          help: row.help,
          questions: row.questions,
          entries: row.entries,
          examination_tasks: row.examinationTasks,
        })),
      );
      const expected = summarizeAmaReferenceData(rows);
      if (JSON.stringify(summary) !== JSON.stringify(expected)) {
        throw new Error(
          "Imported AMA reference counts do not match the upload",
        );
      }
      return summary;
    });
  } finally {
    await client.end();
  }
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const validateOnly = args.includes("--validate-only");
  const positional = args.filter((arg) => arg !== "--validate-only");
  if (positional.length > 1 || positional[0]?.startsWith("--")) {
    throw new Error(
      "Usage: importAmaReferenceData.js [--validate-only] [upload-file-or-directory]",
    );
  }
  const inputPath = positional[0] ? path.resolve(positional[0]) : amaRowsDirectory;
  console.log("Reading AMA diagnostic rows from:", inputPath);
  const rows = amaReferenceDataSchema.parse(await readAmaImportFiles(inputPath));
  if (validateOnly) {
    console.log("AMA reference data valid:", summarizeAmaReferenceData(rows));
    return;
  }
  dotenv.config({ path: ".env.local" });
  dotenv.config();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DATABASE_URL is required to import AMA reference data");
  console.log(
    "AMA reference data imported:",
    await importAmaReferenceData(connectionString, rows),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof z.ZodError ? z.prettifyError(error) : error);
    process.exitCode = 1;
  });
}
