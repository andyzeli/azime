import { and, eq, inArray } from "drizzle-orm";
import {
  amaRatingTableSchema,
  type AmaRatingTable,
  type AmaRegionRatingResponse,
  type Region,
} from "@azime/contracts";
import { getAMARating } from "../ama/getAMARating.js";
import { toAmaDiagnosticRow } from "../ama/rows.js";
import { db } from "../db/index.js";
import { AmaDiagnosticRows, AmaRatingTables } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { getRegionDiagnosisList } from "./regionDiagnosesQueries.js";
import { getVisitDocumentation } from "./visitDocumentationQueries.js";

// Draft rating of the region's saved visit assessments and rating-table selections.
export async function getAmaRegionRating(
  caseId: number,
  region: Region
): Promise<AmaRegionRatingResponse> {
  const visit = await getVisitDocumentation(caseId);
  if (!visit) throw new MissingPrerequisiteError("Save the visit first");
  const { amaHistory, amaAssessments, amaTableSelections } = visit.documentation;
  const list = await getRegionDiagnosisList(caseId, region);

  const rowIds = [
    ...new Set(amaAssessments.filter((a) => a.region === region).map((a) => a.rowId)),
  ];
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

  const selections = amaTableSelections.filter((s) => s.region === region);
  const tables = selections.length
    ? await db
        .select()
        .from(AmaRatingTables)
        .where(inArray(AmaRatingTables.tableId, selections.map((s) => s.tableId)))
    : [];

  const rating = getAMARating(region, {
    diagnoses: list.diagnoses,
    amaHistory,
    assessments: amaAssessments,
    rows: rows.map(toAmaDiagnosticRow),
    selections,
    tables: tables.map((t) =>
      amaRatingTableSchema.parse({
        table_id: t.tableId,
        description: t.description,
        instructions: t.instructions,
        source_ref: t.sourceRef,
        class_options: t.classOptions,
        mod_options: t.modOptions,
        results: t.results,
      } satisfies AmaRatingTable)
    ),
  });

  return rating;
}
