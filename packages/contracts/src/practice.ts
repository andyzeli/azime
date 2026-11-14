import { z } from "zod";

// The letterhead and signer on every report PDF; edited on the Settings page. One
// physician for now, so the signer lives here too.
export const practiceSettingsSchema = z
  .object({
    name: z.string().trim(),
    address: z.string().trim(), // one line per row on the letterhead
    phone: z.string().trim(),
    fax: z.string().trim(),
    email: z.string().trim(),
    physicianName: z.string().trim(), // e.g. "Jane Doe"
    physicianCredentials: z.string().trim(), // e.g. "MD"
    physicianLicense: z.string().trim(), // e.g. "CA License A12345"
  })
  .strict();
export type PracticeSettings = z.infer<typeof practiceSettingsSchema>;

export const emptyPracticeSettings = (): PracticeSettings => ({
  name: "",
  address: "",
  phone: "",
  fax: "",
  email: "",
  physicianName: "",
  physicianCredentials: "",
  physicianLicense: "",
});

// "Jane Doe, MD", the name on the signature line.
export const physicianSignatureName = (s: PracticeSettings) =>
  [s.physicianName, s.physicianCredentials].filter(Boolean).join(", ");
