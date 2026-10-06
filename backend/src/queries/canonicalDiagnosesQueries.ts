import { asc, eq } from "drizzle-orm";
import type { CanonicalDiagnosis, Region } from "@azime/contracts";
import { db } from "../db/index.js";
import { CanonicalDiagnoses } from "../db/schema.js";

export const getCanonicalDiagnoses = async (
  region: Region,
): Promise<CanonicalDiagnosis[]> =>
  db
    .select({
      canonicalDx: CanonicalDiagnoses.id,
      label: CanonicalDiagnoses.label,
      icdPrefixes: CanonicalDiagnoses.icdPrefixes,
    })
    .from(CanonicalDiagnoses)
    .where(eq(CanonicalDiagnoses.regionId, region))
    .orderBy(asc(CanonicalDiagnoses.label));
