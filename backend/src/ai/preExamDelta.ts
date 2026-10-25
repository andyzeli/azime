import type {
  PreExamDelta,
  StoredPreExamAnalysis,
} from "@azime/contracts";
import type { PreExamInputSnapshot } from "./preExamInputSnapshot.js";

type Row = StoredPreExamAnalysis["treatmentAnalysis"][number];
type Assessment = Row["assessments"][number];
type Exhaustion = Pick<Row, "aiExhaustion" | "aiExhaustionRationale">;

// Exhaustion is judged across a treatment's applicable diagnoses, so it only changes when
// the new diagnosis may apply. The caller clears the physician's exhaustion review for
// every row in `reassessed`.
const withAssessment = (
  row: Row,
  assessment: Assessment,
  { aiExhaustion, aiExhaustionRationale }: Exhaustion,
  reassessed: Set<string>
): Row => {
  const applies = ["applicable", "unclear"].includes(assessment.aiApplicability);
  if (applies) reassessed.add(row.id);
  return {
    ...row,
    assessments: [
      ...row.assessments.filter((a) => a.canonicalDx !== assessment.canonicalDx),
      assessment,
    ],
    ...(applies ? { aiExhaustion, aiExhaustionRationale } : {}),
  };
};

// Merges a 3A run for one added diagnosis into the existing analysis. Existing rows keep
// their id, prior assessments and steering; they gain an (unreviewed) assessment, and a
// revised exhaustion judgment when the new diagnosis may apply.
//   existing row        → append the new diagnosis's assessment
//   new taxonomy row    → its treatmentId is already a row: add the assessment there
//                         its episodes overlap a record_only row: upgrade that row
//                         otherwise: a new row
//   new ai row          → a new row (the prompt says not to repeat existing rows)
// record_only rows are never created: records don't change when a diagnosis is added.
export function mergePreExamDelta(
  analysis: StoredPreExamAnalysis,
  snapshot: PreExamInputSnapshot,
  delta: PreExamDelta,
  added: StoredPreExamAnalysis["addedDiagnoses"][number],
  ladder: PreExamInputSnapshot["ladder"]
): {
  analysis: StoredPreExamAnalysis;
  snapshot: PreExamInputSnapshot;
  reassessed: string[];
} {
  const { canonicalDx } = added;
  let rows = structuredClone(analysis.treatmentAnalysis);
  const ids = new Set(rows.map((row) => row.id));
  const reassessed = new Set<string>();

  for (const {
    rowId,
    aiExhaustion,
    aiExhaustionRationale,
    ...assessment
  } of delta.existingRowAssessments) {
    if (!ids.has(rowId)) throw new Error(`Delta assessed an unknown row: ${rowId}`);
    rows = rows.map((row) =>
      row.id === rowId
        ? withAssessment(
            row,
            { canonicalDx, ...assessment },
            { aiExhaustion, aiExhaustionRationale },
            reassessed
          )
        : row
    );
  }

  const ladderIds = new Set(ladder.map((entry) => entry.treatmentId));
  let next = rows.length;
  for (const { assessment, ...newRow } of delta.newRows) {
    const scored = { canonicalDx, ...assessment };
    if (newRow.source === "taxonomy" && !ladderIds.has(newRow.treatmentId ?? "")) {
      throw new Error(`Delta row is not in the ladder for ${canonicalDx}: ${newRow.treatmentId}`);
    }
    const sameTreatment =
      newRow.treatmentId !== null &&
      rows.find((row) => row.treatmentId === newRow.treatmentId);
    const recordOnly =
      newRow.source === "taxonomy" &&
      rows.find(
        (row) =>
          row.source === "record_only" &&
          row.episodeIds.some((id) => newRow.episodeIds.includes(id))
      );
    if (sameTreatment) {
      rows = rows.map((row) =>
        row === sameTreatment
          ? withAssessment(row, scored, newRow, reassessed)
          : row
      );
    } else if (recordOnly) {
      rows = rows.map((row) =>
        row === recordOnly
          ? withAssessment(
              {
                ...row,
                treatmentId: newRow.treatmentId,
                treatment: newRow.treatment,
                source: "taxonomy",
                episodeIds: [...new Set([...row.episodeIds, ...newRow.episodeIds])],
              },
              scored,
              newRow,
              reassessed
            )
          : row
      );
    } else {
      while (ids.has(`treatment-${next}`)) next++;
      const id = `treatment-${next}`;
      ids.add(id);
      rows.push({ ...newRow, id, assessments: [scored] });
    }
  }

  return {
    analysis: {
      ...analysis,
      treatmentAnalysis: rows,
      addedDiagnoses: [...analysis.addedDiagnoses, added],
    },
    snapshot: {
      ...snapshot,
      scope: {
        ...snapshot.scope,
        diagnoses: [...snapshot.scope.diagnoses, canonicalDx],
      },
      ladder: [...snapshot.ladder, ...ladder],
    },
    reassessed: [...reassessed],
  };
}
