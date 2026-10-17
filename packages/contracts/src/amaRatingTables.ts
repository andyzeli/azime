import { z } from "zod";

const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
export const amaRatingTableSchema = z
  .strictObject({
    table_id: id,
    description: text,
    instructions: text.nullable().optional(),
    source_ref: z.strictObject({
      guides_version: text,
      chapter: text,
      table: text,
    }),
    class_options: z
      .array(
        z.strictObject({
          value: z.number().int().min(0).max(4),
          label: text,
          instructions: text,
        })
      )
      .length(5),
    mod_options: z.strictObject({
      prompt: text,
      options: z.array(z.strictObject({ id, label: text, text })).length(3),
    }),
    results: z
      .array(
        z.strictObject({
          class_value: z.number().int().min(0).max(4),
          mod_option_id: id,
          wpi: z.number().min(0).max(100),
        })
      )
      .length(15),
  })
  .superRefine((table, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (new Set(table.class_options.map((o) => o.value)).size !== 5)
      issue("Each class 0–4 must appear exactly once");
    const options = new Set(table.mod_options.options.map((o) => o.id));
    if (options.size !== 3) issue("MOD option IDs must be unique");
    const pairs = new Set<string>();
    for (const result of table.results) {
      if (!options.has(result.mod_option_id))
        issue("Unknown MOD option in results");
      const pair = `${result.class_value}:${result.mod_option_id}`;
      if (pairs.has(pair)) issue("Duplicate result pair");
      pairs.add(pair);
    }
  });
export type AmaRatingTable = z.infer<typeof amaRatingTableSchema>;
export const amaRatingTableReferenceDataSchema = z
  .array(amaRatingTableSchema)
  .min(1)
  .refine(
    (tables) => new Set(tables.map((t) => t.table_id)).size === tables.length,
    "Duplicate table ID"
  );

// Exact lookup only: null is unanswered; class zero is a real answer.
export function lookupAmaRatingResult(
  table: AmaRatingTable,
  classValue: number | null,
  modOptionId: string | null
) {
  if (classValue === null || modOptionId === null) return null;
  return (
    table.results.find(
      (r) => r.class_value === classValue && r.mod_option_id === modOptionId
    )?.wpi ?? null
  );
}
