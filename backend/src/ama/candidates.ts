import type {
  AmaCandidatesRequest,
  AmaCandidatesResponse,
  AmaDiagnosticRow,
  AmaRatingTable,
  Region,
} from "@azime/contracts";

// Pure so it can be tested without a database. A row is a candidate for a
// diagnosis when it is mapped to it, belongs to the region, and either has no
// nerve roots, the affected roots are unknown, or the roots overlap.
export function selectAmaCandidates(
  region: Region,
  diagnoses: AmaCandidatesRequest["diagnoses"],
  mappings: Map<string, string[]>,
  rows: AmaDiagnosticRow[],
  tableMappings: Map<string, string[]> = new Map(),
  ratingTables: AmaRatingTable[] = []
): AmaCandidatesResponse {
  const rowsById = new Map(
    rows
      .filter((row) => row.region_id === region)
      .map((row) => [row.row_id, row])
  );
  const result = diagnoses.map(({ canonicalDx, affectedRoots }) => {
    const mappedRowIds = mappings.get(canonicalDx) ?? [];
    const candidateRowIds = mappedRowIds.filter((rowId) => {
      const row = rowsById.get(rowId);
      return (
        row !== undefined &&
        (row.nerve_roots.length === 0 ||
          affectedRoots === null ||
          row.nerve_roots.some((root) => affectedRoots.includes(root)))
      );
    });
    const candidateTableIds = [
      ...new Set(tableMappings.get(canonicalDx) ?? []),
    ].filter((id) => ratingTables.some((t) => t.table_id === id));
    return {
      canonicalDx,
      affectedRoots,
      mappedRowIds,
      candidateRowIds,
      candidateTableIds,
    };
  });
  const candidateIds = new Set(result.flatMap((d) => d.candidateRowIds));
  return {
    diagnoses: result,
    ratingTables: ratingTables
      .filter((t) =>
        result.some((d) => d.candidateTableIds.includes(t.table_id))
      )
      .filter(
        (t, i, all) =>
          all.findIndex((other) => other.table_id === t.table_id) === i
      )
      .sort((a, b) => a.table_id.localeCompare(b.table_id)),
    rows: [...rowsById.values()]
      .filter((row) => candidateIds.has(row.row_id))
      .sort((a, b) => a.row_id.localeCompare(b.row_id)),
  };
}

export class OutOfScopeDiagnosisError extends Error {}

export function assertAmaDiagnosisScope(
  diagnoses: AmaCandidatesRequest["diagnoses"],
  scope: string[]
): void {
  const allowed = new Set(scope);
  const outOfScope = diagnoses.filter((d) => !allowed.has(d.canonicalDx));
  if (outOfScope.length)
    throw new OutOfScopeDiagnosisError(
      `Not in the region's diagnosis scope: ${outOfScope.map((d) => d.canonicalDx).join(", ")}`
    );
}
