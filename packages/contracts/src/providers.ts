import { z } from "zod";

export const providerKindSchema = z.enum(["individual", "facility"]);
export type ProviderKind = z.infer<typeof providerKindSchema>;

export const providerDisciplineOptions = [
  { value: "primary_care", label: "Primary Care" },
  { value: "orthopedics", label: "Orthopedics" },
  { value: "physical_therapy", label: "Physical Therapy" },
  { value: "occupational_therapy", label: "Occupational Therapy" },
  { value: "sports_medicine", label: "Sports Medicine" },
  { value: "chiropractic", label: "Chiropractic" },
] as const;

const providerDisciplineValues = providerDisciplineOptions.map(
  ({ value }) => value,
) as [
  (typeof providerDisciplineOptions)[number]["value"],
  ...(typeof providerDisciplineOptions)[number]["value"][],
];

export const providerDisciplineSchema = z.enum(providerDisciplineValues);
export type ProviderDiscipline = z.infer<typeof providerDisciplineSchema>;

const providerDisciplineLabels = new Map<ProviderDiscipline, string>(
  providerDisciplineOptions.map(({ value, label }) => [value, label]),
);

export const getProviderDisciplineLabel = (discipline: ProviderDiscipline) =>
  providerDisciplineLabels.get(discipline) ?? discipline;

export const createCaseProviderInputSchema = z
  .object({
    name: z.string().trim().min(1),
    kind: providerKindSchema,
    discipline: providerDisciplineSchema,
  })
  .strict();

export type CreateCaseProviderInput = z.infer<
  typeof createCaseProviderInputSchema
>;

export const caseProviderSchema = createCaseProviderInputSchema.extend({
  id: z.string().uuid(),
  caseId: z.number().int().positive(),
});

export type CaseProviderDto = z.infer<typeof caseProviderSchema>;

export const caseProviderListSchema = z.array(caseProviderSchema);
///
