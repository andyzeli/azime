import {
  lookupAmaRatingResult,
  type AmaAssessment,
  type AmaDiagnosticRow,
  type AmaNotRatedReason,
  type AmaRatingTable,
  type AmaRegionRatingResponse,
  type AmaRowComponent,
  type AmaTableComponent,
  type AmaRule,
  type AmaTableSelection,
  type DiagnosisState,
  type Region,
  type VisitAmaHistory,
} from "@azime/contracts";
import { amaAssessmentProblems } from "./assessments.js";
import { combineImpairment, type ImpairmentKind } from "./combineImpairment.js";

type RuleResult = {
  status: "met" | "not_met" | "unresolved";
  unresolvedQuestionIds: string[];
};

/** Evaluate the supplied criteria literally. Missing answers never mean false. */
export function evaluateAmaRule(
  rule: AmaRule,
  answers: AmaAssessment["answers"]
): RuleResult {
  if ("field" in rule) {
    const answer = answers[rule.field];
    return answer == null
      ? { status: "unresolved", unresolvedQuestionIds: [rule.field] }
      : {
          status: answer === rule.equals ? "met" : "not_met",
          unresolvedQuestionIds: [],
        };
  }
  const children =
    "all" in rule ? rule.all : "any" in rule ? rule.any : rule.of;
  const results = children.map((child) => evaluateAmaRule(child, answers));
  const required =
    "all" in rule ? children.length : "any" in rule ? 1 : rule.at_least;
  const met = results.filter((r) => r.status === "met").length;
  const unknown = results.filter((r) => r.status === "unresolved");
  const status =
    met >= required
      ? "met"
      : met + unknown.length < required
        ? "not_met"
        : "unresolved";
  return {
    status,
    unresolvedQuestionIds:
      status === "unresolved"
        ? [...new Set(unknown.flatMap((r) => r.unresolvedQuestionIds))]
        : [],
  };
}

// Only supported diagnoses are rated. Their findings are evaluated once the AMA history
// is confirmed at the visit; a "no" rates 0% without them; an unasked question leaves
// the component pending.
type Eligibility =
  | {
      status: "eligible" | "pending_history" | "history_not_confirmed";
      canonicalDxIds: string[];
    }
  | { status: "not_rated"; reason: AmaNotRatedReason };

function eligibility(
  region: Region,
  canonicalDxIds: string[],
  input: AmaRatingInput
): Eligibility {
  if (!canonicalDxIds.length) return { status: "not_rated", reason: "unlinked" };
  const supported = canonicalDxIds.filter((dx) =>
    input.diagnoses.some((d) => d.canonicalDx === dx && d.status === "supported")
  );
  if (!supported.length)
    return { status: "not_rated", reason: "diagnosis_not_supported" };
  const history = (dx: string) =>
    input.amaHistory.find((h) => h.region === region && h.canonicalDx === dx)
      ?.confirmed;
  const confirmed = supported.filter((dx) => history(dx) === true);
  if (confirmed.length) return { status: "eligible", canonicalDxIds: confirmed };
  const unasked = supported.filter((dx) => history(dx) === undefined);
  return unasked.length
    ? { status: "pending_history", canonicalDxIds: unasked }
    : { status: "history_not_confirmed", canonicalDxIds: supported };
}

type AmaComponentBase = Pick<
  AmaRowComponent,
  "description" | "canonicalDxIds" | "status" | "notRatedReason" | "zeroReason" | "wpi"
>;

function componentBase(
  description: string,
  canonicalDxIds: string[],
  e: Eligibility
): AmaComponentBase {
  const base = { description, notRatedReason: null, zeroReason: null, wpi: null };
  switch (e.status) {
    case "not_rated":
      return {
        ...base,
        canonicalDxIds: [...canonicalDxIds],
        status: "not_rated",
        notRatedReason: e.reason,
      };
    case "history_not_confirmed":
      return {
        ...base,
        canonicalDxIds: e.canonicalDxIds,
        status: "rated",
        zeroReason: "history_not_confirmed",
        wpi: 0,
      };
    case "pending_history":
      return { ...base, canonicalDxIds: e.canonicalDxIds, status: "pending_history" };
    case "eligible":
      // The evaluator sets the result.
      return { ...base, canonicalDxIds: e.canonicalDxIds, status: "unresolved" };
  }
}

/** Assumes a validated assessment/reference pair; percentages come only from the row. */
export function evaluateAmaAssessment(
  row: AmaDiagnosticRow,
  assessment: AmaAssessment,
  e: Eligibility
): AmaRowComponent {
  const result: AmaRowComponent = {
    ...componentBase(row.description, assessment.canonicalDxIds, e),
    method: "diagnostic_row",
    assessmentId: assessment.id,
    rowId: assessment.rowId,
    nerveRoot: assessment.nerveRoot,
    side: assessment.side,
    entryId: null,
    unresolvedQuestionIds: [],
  };
  if (e.status !== "eligible") return result;

  // Handoff §5: descending numeric class, then grade. An unknown higher entry
  // blocks a definitive lower entry; this is not a maximum-percentage lookup.
  const entries = [...row.entries].sort(
    (a, b) =>
      parseInt(b.entry_id, 10) - parseInt(a.entry_id, 10) ||
      b.entry_id.slice(-1).localeCompare(a.entry_id.slice(-1))
  );
  for (const entry of entries) {
    const evaluation = evaluateAmaRule(entry.criteria, assessment.answers);
    if (evaluation.status === "not_met") continue;
    if (evaluation.status === "unresolved")
      return {
        ...result,
        status: "unresolved",
        unresolvedQuestionIds: evaluation.unresolvedQuestionIds,
      };
    return {
      ...result,
      status: "rated",
      entryId: entry.entry_id,
      wpi: entry.impairment.value,
    };
  }
  // Every entry answered and none met: the Guides' 0% rows.
  return { ...result, status: "rated", zeroReason: "no_criteria_met", wpi: 0 };
}

// Table selections are saved on the Visit (contracts AmaTableSelection), linked to
// diagnoses like assessments, so the same eligibility applies.
// For CNS tables, the physician directly chooses A/B/C. modOptionId selects that
// existing table value; no automatic BOTC/adaptive grade derivation is needed.

function evaluateAmaTableSelection(
  table: AmaRatingTable,
  selection: AmaTableSelection,
  e: Eligibility
): AmaTableComponent {
  if (
    selection.classValue !== null &&
    !table.class_options.some((o) => o.value === selection.classValue)
  )
    throw new Error(`Invalid AMA class: ${selection.tableId}`);
  if (
    selection.modOptionId !== null &&
    !table.mod_options.options.some((o) => o.id === selection.modOptionId)
  )
    throw new Error(`Invalid AMA modifier: ${selection.tableId}`);
  const { canonicalDxIds, ...rest } = selection;
  const result: AmaTableComponent = {
    ...componentBase(table.description, canonicalDxIds, e),
    ...rest,
    method: "class_modifier_table",
    missingAnswers: [],
  };
  if (e.status !== "eligible") return result;

  const missingAnswers: ("classValue" | "modOptionId")[] = [];
  if (selection.classValue === null) missingAnswers.push("classValue");
  if (selection.modOptionId === null) missingAnswers.push("modOptionId");
  const wpi = lookupAmaRatingResult(
    table,
    selection.classValue,
    selection.modOptionId
  );
  if (!missingAnswers.length && wpi === null)
    throw new Error(`Missing AMA table result: ${selection.tableId}`);
  return {
    ...result,
    status: missingAnswers.length ? "unresolved" : "rated",
    wpi,
    missingAnswers,
  };
}

// Diagnostic rows and class/modifier tables together: a region can need both
// (e.g. radiculopathy rows plus a myelopathy table).
export type AmaRatingInput = {
  // The region's diagnosis list and the visit's AMA history answers.
  diagnoses: Pick<DiagnosisState, "canonicalDx" | "status">[];
  amaHistory: VisitAmaHistory[];
  assessments: AmaAssessment[];
  rows: AmaDiagnosticRow[];
  selections: AmaTableSelection[];
  tables: AmaRatingTable[];
};

/**
 * Isolated draft reference evaluation and regional combination; no IO or MMI approval.
 * Caller supplies the region's diagnosis list, the visit's AMA history and
 * reference data; eligibility is decided here.
 * Reuse saved Visit amaAssessments; no need to select their rows again.
 * Empty components means nothing selected, never 0% WPI.
 */
export function getAMARating(
  region: Region,
  input: AmaRatingInput
): AmaRegionRatingResponse {
  const assessments = input.assessments.filter((a) => a.region === region);
  const rows = new Map(input.rows.map((row) => [row.row_id, row]));
  const problems = amaAssessmentProblems(assessments, rows);
  if (problems.length) throw new Error(problems.join("; "));

  const selections = input.selections.filter((s) => s.region === region);
  const seen = new Set<string>();
  const tableComponents = selections.map((selection) => {
    if (seen.has(selection.tableId))
      throw new Error(`Duplicate AMA table selection: ${selection.tableId}`);
    seen.add(selection.tableId);
    const table = input.tables.find((t) => t.table_id === selection.tableId);
    if (!table) throw new Error(`Unknown AMA table: ${selection.tableId}`);
    return evaluateAmaTableSelection(
      table,
      selection,
      eligibility(region, selection.canonicalDxIds, input)
    );
  });

  const components = [
      ...assessments.map((a) =>
        evaluateAmaAssessment(
          rows.get(a.rowId)!,
          a,
          eligibility(region, a.canonicalDxIds, input)
        )
      ),
      ...tableComponents,
    ];
  const counted = components.filter((c) => c.status !== "not_rated");
  const combination = combineImpairment(region, counted.map((c) => ({
    kind: c.method === "diagnostic_row"
      ? diagnosticRowKind(c.rowId, c.nerveRoot)
      : input.tables.find((t) => t.table_id === c.tableId)?.source_ref.chapter === "13"
        ? "cns" : "unsupported",
    root: c.method === "diagnostic_row" ? c.nerveRoot : null,
    side: c.method === "diagnostic_row" ? c.side : null,
    canonicalDxIds: c.canonicalDxIds,
    wpi: c.status === "rated" ? c.wpi : null,
    label: c.description,
  })));
  return {
    region,
    components,
    combined: combination.wpi === null ? null : { wpi: combination.wpi, rationale: combination.rationale },
    combinationIssues: combination.wpi === null ? combination.rationale : [],
  };
}

// Explicit reference identities, never a diagnosis-name or description heuristic.
function diagnosticRowKind(rowId: string, root: string | null): ImpairmentKind {
  if (root) return "radiculopathy";
  if (["17-19-11", "17-19-12", "17-20-05", "17-21-09"].includes(rowId)) return "fracture";
  if (["17-19-13", "17-19-14", "17-20-06", "17-20-07", "17-21-11", "17-21-12"].includes(rowId)) return "aomsi";
  if (rowId === "17-21-10") return "etiology";
  return "unsupported";
}
