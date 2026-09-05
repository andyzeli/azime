import { z } from "zod";

export const providerKindSchema = z.enum(["individual", "facility"]);

export const createCaseProviderSchema = z
  .object({
    name: z.string().trim().min(1),
    kind: providerKindSchema,
    discipline: z.string().trim().min(1),
  })
  .strict();

export type CreateCaseProviderInput = z.infer<typeof createCaseProviderSchema>;
