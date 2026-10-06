import {
  and,
  asc,
  count,
  eq,
  max,
  min,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "../db/index.js";
import { CaseProviders, DiagnosisMentions, Records } from "../db/schema.js";

export type DxSupport = {
  region: string;
  canonicalDx: string;
  mentions: number;
  firstDos: string | null;
  lastDos: string | null;
  providers: string[];
  rawNames: string[];
  imagingOnly: boolean;
};

export const getDxSupport = async (caseId: number): Promise<DxSupport[]> =>
  db
    .select({
      region: DiagnosisMentions.region,
      canonicalDx: DiagnosisMentions.canonicalDx,
      mentions: count(),
      firstDos: min(Records.eventDate),
      lastDos: max(Records.eventDate),
      providers: sql<string[]>`
        coalesce(
          array_agg(distinct ${CaseProviders.name} order by ${CaseProviders.name})
            filter (where ${CaseProviders.name} is not null),
          '{}'::text[]
        )
      `,
      rawNames: sql<string[]>`
        array_agg(distinct ${DiagnosisMentions.name} order by ${DiagnosisMentions.name})
      `,
      imagingOnly: sql<boolean>`
        bool_and(${Records.documentType} = 'imaging_report')
      `,
    })
    .from(DiagnosisMentions)
    .innerJoin(Records, eq(DiagnosisMentions.recordId, Records.id))
    .leftJoin(CaseProviders, eq(Records.providerId, CaseProviders.id))
    .where(
      and(
        eq(DiagnosisMentions.caseId, caseId),
        notInArray(DiagnosisMentions.region, ["other_body_part", "unclear"]),
        ne(DiagnosisMentions.canonicalDx, "unresolved"),
      ),
    )
    .groupBy(DiagnosisMentions.region, DiagnosisMentions.canonicalDx)
    .orderBy(asc(DiagnosisMentions.region), asc(DiagnosisMentions.canonicalDx));
