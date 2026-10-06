import { readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { z } from "zod";
import {
  CanonicalDiagnoses,
  LadderEntries,
  LadderEntrySources,
  Sources,
  TreatmentAliases,
  Treatments,
} from "../schema.js";
import {
  referenceDataSchema,
  type ReferenceData,
} from "./referenceDataSchema.js";

const { Client } = pg;

const files = {
  manifest: "manifest.json",
  canonicalDiagnoses: "canonical_diagnoses.json",
  treatments: "treatments.json",
  treatmentAliases: "treatment_aliases.json",
  sources: "sources.json",
  ladderEntries: "ladder_entries.json",
  ladderEntrySources: "ladder_entry_sources.json",
} as const;

async function readReferenceData(directory: string): Promise<ReferenceData> {
  const entries = await Promise.all(
    Object.entries(files).map(async ([key, filename]) => {
      const filepath = path.join(directory, filename);
      let contents: string;
      try {
        contents = await readFile(filepath, "utf8");
      } catch (error) {
        const detail = error instanceof Error ? `: ${error.message}` : "";
        throw new Error(`Could not read ${filepath}${detail}`);
      }

      try {
        return [key, JSON.parse(contents)] as const;
      } catch (error) {
        const detail = error instanceof Error ? `: ${error.message}` : "";
        throw new Error(`Invalid JSON in ${filepath}${detail}`);
      }
    }),
  );

  return referenceDataSchema.parse(Object.fromEntries(entries));
}

async function replaceReferenceData(
  connectionString: string,
  data: ReferenceData,
) {
  const client = new Client({ connectionString });
  await client.connect();
  const database = drizzle(client);

  try {
    await database.transaction(async (transaction) => {
      await transaction.delete(LadderEntrySources);
      await transaction.delete(LadderEntries);
      await transaction.delete(TreatmentAliases);
      await transaction.delete(Sources);
      await transaction.delete(Treatments);
      await transaction.delete(CanonicalDiagnoses);

      if (data.canonicalDiagnoses.length > 0) {
        await transaction.insert(CanonicalDiagnoses).values(
          data.canonicalDiagnoses.map((row) => ({
            id: row.id,
            regionId: row.region_id,
            label: row.label,
            definition: row.definition ?? null,
            icdPrefixes: row.icd_prefixes,
          })),
        );
      }
      if (data.treatments.length > 0) {
        await transaction.insert(Treatments).values(
          data.treatments.map((row) => ({
            id: row.id,
            region: row.region ?? null,
            category: row.category,
            label: row.label,
          })),
        );
      }
      if (data.sources.length > 0) {
        await transaction.insert(Sources).values(data.sources);
      }
      if (data.treatmentAliases.length > 0) {
        await transaction.insert(TreatmentAliases).values(
          data.treatmentAliases.map((row) => ({
            treatmentId: row.treatment_id,
            alias: row.alias,
          })),
        );
      }
      if (data.ladderEntries.length > 0) {
        await transaction.insert(LadderEntries).values(
          data.ladderEntries.map((row) => ({
            id: row.id,
            regionId: row.region_id ?? null,
            canonicalDxId: row.canonical_dx_id,
            treatmentId: row.treatment_id,
            applicability: row.applicability ?? null,
            adequacy: row.adequacy ?? null,
          })),
        );
      }
      if (data.ladderEntrySources.length > 0) {
        await transaction.insert(LadderEntrySources).values(
          data.ladderEntrySources.map((row) => ({
            ladderEntryId: row.ladder_entry_id,
            sourceId: row.source_id,
          })),
        );
      }
    });
  } finally {
    await client.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-only");
  const positionalArgs = args.filter(
    (arg) => arg !== "--validate-only" && arg !== "--",
  );
  if (positionalArgs.length > 1) {
    throw new Error(
      "Usage: importReferenceData.js [--validate-only] [reference-data-directory]",
    );
  }

  const directory = path.resolve(positionalArgs[0] ?? "reference-data");
  const data = await readReferenceData(directory);

  if (validateOnly) {
    console.log(
      `Reference data ${data.manifest.dataset_version} is valid: ${directory}`,
    );
    return;
  }

  dotenv.config({ path: ".env.local" });
  dotenv.config();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to import reference data");
  }

  await replaceReferenceData(connectionString, data);
  console.log(
    `Reference data ${data.manifest.dataset_version} imported: ${directory}`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof z.ZodError) {
    console.error(z.prettifyError(error));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
