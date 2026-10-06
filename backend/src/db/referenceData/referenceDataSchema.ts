import { z } from "zod";

const id = z.string().trim().min(1);
const nullableText = z.string().nullable().optional();

const canonicalDiagnosisSchema = z
  .object({
    id,
    region_id: id,
    label: id,
    definition: nullableText,
    icd_prefixes: z.array(id),
  })
  .strict();

const treatmentSchema = z
  .object({
    id,
    region: nullableText,
    category: z.enum([
      "conservative",
      "medication",
      "injection",
      "surgical",
      "multimodal",
    ]),
    label: id,
  })
  .strict();

const treatmentAliasSchema = z
  .object({
    treatment_id: id,
    alias: id,
  })
  .strict();

const sourceSchema = z
  .object({
    id,
    ref: id,
    edition: id,
  })
  .strict();

const ladderEntrySchema = z
  .object({
    id: z.string().uuid(),
    region_id: nullableText,
    canonical_dx_id: id,
    treatment_id: id,
    applicability: nullableText,
    adequacy: nullableText,
  })
  .strict();

const ladderEntrySourceSchema = z
  .object({
    ladder_entry_id: z.string().uuid(),
    source_id: id,
  })
  .strict();

export const referenceDataSchema = z
  .object({
    manifest: z
      .object({
        schema_version: z.literal(1),
        dataset_version: id,
      })
      .strict(),
    canonicalDiagnoses: z.array(canonicalDiagnosisSchema).min(1),
    treatments: z.array(treatmentSchema).min(1),
    treatmentAliases: z.array(treatmentAliasSchema),
    sources: z.array(sourceSchema),
    ladderEntries: z.array(ladderEntrySchema),
    ladderEntrySources: z.array(ladderEntrySourceSchema),
  })
  .superRefine((data, ctx) => {
    const unique = (
      values: string[],
      path: keyof typeof data,
      description: string,
    ) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        if (seen.has(value)) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate ${description}: ${value}`,
            path: [path, index],
          });
        }
        seen.add(value);
      });
    };

    unique(
      data.canonicalDiagnoses.map(({ id }) => id),
      "canonicalDiagnoses",
      "canonical diagnosis id",
    );
    unique(
      data.treatments.map(({ id }) => id),
      "treatments",
      "treatment id",
    );
    unique(
      data.treatmentAliases.map(
        ({ treatment_id, alias }) => `${treatment_id}\u0000${alias}`,
      ),
      "treatmentAliases",
      "treatment alias key",
    );
    unique(
      data.sources.map(({ id }) => id),
      "sources",
      "source id",
    );
    unique(
      data.ladderEntries.map(({ id }) => id),
      "ladderEntries",
      "ladder entry id",
    );
    unique(
      data.ladderEntrySources.map(
        ({ ladder_entry_id, source_id }) =>
          `${ladder_entry_id}\u0000${source_id}`,
      ),
      "ladderEntrySources",
      "ladder entry source key",
    );

    const treatmentIds = new Set(data.treatments.map(({ id }) => id));
    const diagnosisIds = new Set(data.canonicalDiagnoses.map(({ id }) => id));
    const sourceIds = new Set(data.sources.map(({ id }) => id));
    const ladderEntryIds = new Set(data.ladderEntries.map(({ id }) => id));

    data.treatmentAliases.forEach(({ treatment_id }, index) => {
      if (!treatmentIds.has(treatment_id)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown treatment_id: ${treatment_id}`,
          path: ["treatmentAliases", index, "treatment_id"],
        });
      }
    });
    data.ladderEntries.forEach(({ canonical_dx_id, treatment_id }, index) => {
      if (!diagnosisIds.has(canonical_dx_id)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown canonical_dx_id: ${canonical_dx_id}`,
          path: ["ladderEntries", index, "canonical_dx_id"],
        });
      }
      if (!treatmentIds.has(treatment_id)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown treatment_id: ${treatment_id}`,
          path: ["ladderEntries", index, "treatment_id"],
        });
      }
    });
    data.ladderEntrySources.forEach(({ ladder_entry_id, source_id }, index) => {
      if (!ladderEntryIds.has(ladder_entry_id)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown ladder_entry_id: ${ladder_entry_id}`,
          path: ["ladderEntrySources", index, "ladder_entry_id"],
        });
      }
      if (!sourceIds.has(source_id)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown source_id: ${source_id}`,
          path: ["ladderEntrySources", index, "source_id"],
        });
      }
    });
  });

export type ReferenceData = z.infer<typeof referenceDataSchema>;
