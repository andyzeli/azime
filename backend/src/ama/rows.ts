import type { AmaDiagnosticRow } from "@azime/contracts";
import type { AmaDiagnosticRow as StoredAmaDiagnosticRow } from "../db/schema.js";

// Stored rows use camelCase columns; the reference contract keeps the upload's shape.
export const toAmaDiagnosticRow = (row: StoredAmaDiagnosticRow): AmaDiagnosticRow => ({
  row_id: row.rowId,
  region_id: row.regionId,
  description: row.description,
  nerve_roots: row.nerveRoots,
  help: row.help,
  questions: row.questions,
  entries: row.entries,
  examination_tasks: row.examinationTasks,
});
