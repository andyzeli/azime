import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  CanonicalDiagnoses,
  LadderEntries,
  LadderEntrySources,
  Sources,
  TreatmentAliases,
  Treatments,
  type Treatment,
} from "../db/schema.js";

export type LadderSource = {
  id: string;
  ref: string;
  edition: string;
};

export type LadderContextEntry = {
  id: string;
  region: string | null;
  canonicalDx: string;
  treatmentId: string;
  treatment: string;
  category: Treatment["category"];
  aliases: string[];
  applicability: string | null;
  adequacy: string | null;
  sources: LadderSource[];
};

export const getLadderEntries = async (
  region: string,
  canonicalDxLabels: string[],
): Promise<LadderContextEntry[]> => {
  if (canonicalDxLabels.length === 0) {
    return [];
  }

  return db
    .select({
      id: LadderEntries.id,
      region: LadderEntries.regionId,
      canonicalDx: CanonicalDiagnoses.label,
      treatmentId: Treatments.id,
      treatment: Treatments.label,
      category: Treatments.category,
      aliases: sql<string[]>`
        coalesce(
          (
            select array_agg(${TreatmentAliases.alias} order by ${TreatmentAliases.alias})
            from ${TreatmentAliases}
            where ${TreatmentAliases.treatmentId} = ${Treatments.id}
          ),
          '{}'::text[]
        )
      `,
      applicability: LadderEntries.applicability,
      adequacy: LadderEntries.adequacy,
      sources: sql<LadderSource[]>`
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', ${Sources.id},
                'ref', ${Sources.ref},
                'edition', ${Sources.edition}
              )
              order by ${Sources.id}
            )
            from ${LadderEntrySources}
            inner join ${Sources}
              on ${Sources.id} = ${LadderEntrySources.sourceId}
            where ${LadderEntrySources.ladderEntryId} = ${LadderEntries.id}
          ),
          '[]'::jsonb
        )
      `,
    })
    .from(LadderEntries)
    .innerJoin(
      CanonicalDiagnoses,
      eq(LadderEntries.canonicalDxId, CanonicalDiagnoses.id),
    )
    .innerJoin(Treatments, eq(LadderEntries.treatmentId, Treatments.id))
    .where(
      and(
        eq(LadderEntries.regionId, region),
        eq(CanonicalDiagnoses.regionId, region),
        inArray(CanonicalDiagnoses.label, canonicalDxLabels),
      ),
    )
    .orderBy(
      asc(CanonicalDiagnoses.label),
      asc(Treatments.category),
      asc(Treatments.label),
    );
};
