import { z } from "zod";

export const jobDescriptionSchema = z.object({
  jobTitle: z
    .string()
    .describe("The official job title (e.g., 'Warehouse Material Handler')."),

  requiredPhysicalDemands: z
    .array(z.string())
    .describe(
      "Key physical requirements of the pre-injury job (e.g., 'Must lift up to 50 lbs regularly', 'Overhead reaching required 4 hrs/day', 'Constant standing on concrete'). Description should make it easy to classify into exertion categories",
    ),
  exertionClassification: z
    .enum([
      "Sedentary",
      "Light",
      "Medium",
      "Heavy",
      "Very Heavy",
      "Unspecified",
    ])
    .describe(
      "U.S. Dept of Labor physical exertion category if stated or inferable.",
    ),
});
