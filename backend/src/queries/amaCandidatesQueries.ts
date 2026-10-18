import { amaRatingTableSchema } from "@azime/contracts";
import { and, eq, inArray } from "drizzle-orm";
import type {
  AmaCandidatesRequest,
  AmaCandidatesResponse,
  AmaRatingTable,
  Region,
} from "@azime/contracts";
import {
  assertAmaDiagnosisScope,
  selectAmaCandidates,
} from "../ama/candidates.js";
import { toAmaDiagnosticRow } from "../ama/rows.js";
import { db } from "../db/index.js";
import {
  AmaRatingTables,
  AmaDiagnosticRows,
  CanonicalDiagnoses,
} from "../db/schema.js";
import { getRegionDiagnosisList } from "./regionDiagnosesQueries.js";

export { OutOfScopeDiagnosisError } from "../ama/candidates.js";

export async function getAmaCandidates(
  caseId: number,
  region: Region,
  diagnoses: AmaCandidatesRequest["diagnoses"]
): Promise<AmaCandidatesResponse> {
  // Any diagnosis on the region's list, excluded ones too so their retained findings keep their rows.
  const list = await getRegionDiagnosisList(caseId, region);
  assertAmaDiagnosisScope(
    diagnoses,
    list.diagnoses.map((d) => d.canonicalDx)
  );

  const dxIds = diagnoses.map((d) => d.canonicalDx);
  const mapped = dxIds.length
    ? await db
        .select({
          id: CanonicalDiagnoses.id,
          amaRowIds: CanonicalDiagnoses.amaRowIds,
          amaRatingTableIds: CanonicalDiagnoses.amaRatingTableIds,
        })
        .from(CanonicalDiagnoses)
        .where(
          and(
            eq(CanonicalDiagnoses.regionId, region),
            inArray(CanonicalDiagnoses.id, dxIds)
          )
        )
    : [];
  const rowIds = [...new Set(mapped.flatMap((m) => m.amaRowIds))];
  const rows = rowIds.length
    ? await db
        .select()
        .from(AmaDiagnosticRows)
        .where(
          and(
            eq(AmaDiagnosticRows.regionId, region),
            inArray(AmaDiagnosticRows.rowId, rowIds)
          )
        )
    : [];

  const tableIds = [...new Set(mapped.flatMap((m) => m.amaRatingTableIds))];
  const tables = tableIds.length
    ? await db
        .select()
        .from(AmaRatingTables)
        .where(inArray(AmaRatingTables.tableId, tableIds))
    : [];

  return selectAmaCandidates(
    region,
    diagnoses,
    new Map(mapped.map((m) => [m.id, m.amaRowIds])),
    rows.map(toAmaDiagnosticRow),
    new Map(mapped.map((m) => [m.id, m.amaRatingTableIds])),
    tables.map((t) =>
      amaRatingTableSchema.parse({
        table_id: t.tableId,
        description: t.description,
        instructions: t.instructions,
        source_ref: t.sourceRef,
        class_options: t.classOptions,
        mod_options: t.modOptions,
        results: t.results,
      } satisfies AmaRatingTable)
    )
  );
}
