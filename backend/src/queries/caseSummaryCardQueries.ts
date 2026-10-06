import { and, asc, eq } from "drizzle-orm";
import type { CaseSummaryCardResponse } from "@azime/contracts";
import { db } from "../db/index.js";
import { CanonicalDiagnoses, DiagnosisMentions } from "../db/schema.js";
import { getWorkStatusHistory, selectLatestWorkStatus } from "./workStatusHistory.js";

type CardRow = {
  canonicalDx: string;
  label: string | null;
  icdPrefixes: string[] | null;
};

export function consolidateDiagnosisCard(
  rows: CardRow[]
): CaseSummaryCardResponse["diagnoses"] {
  const diagnoses = new Map<string, Set<string>>();
  const labels = new Map<string, string>();
  for (const row of rows) {
    const prefixes = diagnoses.get(row.canonicalDx) ?? new Set<string>();
    for (const prefix of row.icdPrefixes ?? []) prefixes.add(prefix);
    diagnoses.set(row.canonicalDx, prefixes);
    if (row.label) labels.set(row.canonicalDx, row.label);
  }
  return [...diagnoses]
    .map(([canonicalDx, prefixes]) => ({
      canonicalDx,
      label: labels.get(canonicalDx) ?? canonicalDx,
      icdPrefixes: [...prefixes].sort(),
    }))
    .sort((a, b) => a.canonicalDx.localeCompare(b.canonicalDx));
}

export async function getCaseSummaryCard(
  caseId: number
): Promise<CaseSummaryCardResponse> {
  const rows = await db
    .selectDistinct({
      canonicalDx: DiagnosisMentions.canonicalDx,
      label: CanonicalDiagnoses.label,
      icdPrefixes: CanonicalDiagnoses.icdPrefixes,
    })
    .from(DiagnosisMentions)
    .leftJoin(
      CanonicalDiagnoses,
      and(
        eq(DiagnosisMentions.region, CanonicalDiagnoses.regionId),
        eq(DiagnosisMentions.canonicalDx, CanonicalDiagnoses.id)
      )
    )
    .where(eq(DiagnosisMentions.caseId, caseId))
    .orderBy(asc(DiagnosisMentions.canonicalDx));

  const history = await getWorkStatusHistory(caseId);
  return {
    caseId,
    diagnoses: consolidateDiagnosisCard(rows),
    currentWorkStatus: selectLatestWorkStatus(history),
  };
}
