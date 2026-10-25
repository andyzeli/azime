import assert from "node:assert/strict";
import test from "node:test";
import { reportBaseInputSchema } from "@azime/contracts";
import { careForUnsupportedDiagnoses } from "../dist/report/careForUnsupportedDiagnoses.js";
import { buildReportVariantInput } from "../dist/report/inputs/index.js";
import { buildReportDraftRequest } from "../dist/ai/reportDraftPrompt.js";

const diagnoses = [
  {
    canonicalDx: "strain",
    status: "supported",
    source: "records",
    reason: null,
  },
  {
    canonicalDx: "sij",
    status: "not_supported",
    source: "records",
    reason: "Negative tests",
  },
  {
    canonicalDx: "disc",
    status: "not_supported",
    source: "records",
    reason: null,
  },
];
const label = (dx) =>
  ({ strain: "Strain", sij: "SI joint dysfunction", disc: "Disc disorder" })[
    dx
  ];
const assessment = (canonicalDx, aiApplicability = "not_applicable") => ({
  canonicalDx,
  aiApplicability,
  aiApplicabilityRationale: "Saved assessment",
});
const row = (
  id,
  assessments,
  recordStatus = "Completed",
  recordDetail = "Saved record text",
) => ({
  id,
  treatment: id,
  treatmentId: null,
  source: "record_only",
  suggestionReasoning: "",
  suggestionReason: null,
  assessments,
  recordStatus,
  recordDetail,
  episodeIds: [],
  aiExhaustion: "exhausted",
  aiExhaustionRationale: "Saved exhaustion",
});
const analysis = (rows) => ({
  treatmentAnalysis: rows,
  inconsistencies: [],
  evidenceGaps: [],
});
const steering = (treatments = {}) => ({
  preExamAnalysisId: 1,
  preExamAnalysisUpdatedAt: "2026-10-23T00:00:00.000Z",
  treatments,
  addedTreatments: [],
  inconsistencies: {},
  evidenceGaps: {},
  notes: null,
});

test("unsupported applicability does not gate recorded history; supported applicable care stays out", () => {
  const rows = [
    row("SI injection", [assessment("sij"), assessment("strain")]),
    row("Therapy", [assessment("sij"), assessment("strain", "applicable")]),
    row("Proposed surgery", [assessment("sij")], "To Be Started"),
    row("Undocumented care", [assessment("sij")], "Not Documented"),
    row("Pruned care", [assessment("sij")]),
    row("Unrelated care", [assessment("removed")]),
  ];
  const source = analysis(rows);
  const review = steering({ "Pruned care": { disposition: "prune" } });
  const before = structuredClone({ source, review });
  assert.deepEqual(
    careForUnsupportedDiagnoses(source, review, diagnoses, label),
    [
      {
        diagnosis: "SI joint dysfunction",
        treatments: [
          {
            treatment: "SI injection",
            documentedHistory: {
              status: "Completed",
              detail: "Saved record text",
            },
          },
        ],
      },
    ],
  );
  assert.deepEqual({ source, review }, before);
});

test("physician overrides of supported applicability control selection in both directions", () => {
  const source = analysis([
    row("Include", [assessment("sij"), assessment("strain", "applicable")]),
    row("Exclude", [assessment("sij"), assessment("strain")]),
  ]);
  const override = (value) => ({
    assessments: {
      strain: {
        applicability: {
          action: "override",
          value,
          rationale: "Physician judgment",
        },
      },
    },
  });
  const result = careForUnsupportedDiagnoses(
    source,
    steering({
      Include: override("not_applicable"),
      Exclude: override("applicable"),
    }),
    diagnoses,
    label,
  );
  assert.deepEqual(
    result[0].treatments.map((t) => t.treatment),
    ["Include"],
  );
});

test("multiple unsupported diagnoses retain exact history, including uncertainty, without inventing an opinion", () => {
  const detail =
    "Modified duty with lifting and sitting restrictions (no lifting over 15 lbs).";
  const source = analysis([
    row(
      "Modified duty",
      [
        assessment("sij", "unclear"),
        assessment("disc", "contraIndicated"),
        assessment("strain", "unclear"),
      ],
      "Ongoing",
      detail,
    ),
    row("Unclear course", [assessment("disc")], "Unclear", null),
  ]);
  const result = careForUnsupportedDiagnoses(
    source,
    steering(),
    diagnoses,
    label,
  );
  assert.deepEqual(result, [
    {
      diagnosis: "SI joint dysfunction",
      treatments: [
        {
          treatment: "Modified duty",
          documentedHistory: { status: "Ongoing", detail },
        },
      ],
    },
    {
      diagnosis: "Disc disorder",
      treatments: [
        {
          treatment: "Modified duty",
          documentedHistory: { status: "Ongoing", detail },
        },
        {
          treatment: "Unclear course",
          documentedHistory: { status: "Unclear", detail: null },
        },
      ],
    },
  ]);
  assert.deepEqual(
    careForUnsupportedDiagnoses(source, steering(), [diagnoses[0]], label),
    [],
  );
});

function reportBase(atMmi, rating, care) {
  const trajectory = {
    direction: "Stable",
    evidenceQuality: "Moderate",
    interpretation: "Stable course",
  };
  return reportBaseInputSchema.parse({
    schemaVersion: "report-v2",
    intro: {
      caseType: "IME",
      injuryType: "specific",
      dateOfInjury: null,
      examinationDate: "2026-10-23",
      impairmentRequested: rating,
    },
    background: { recordedMedications: [], psychosocialFactors: null },
    historyOfPresentIllness: {
      incidentNarrative: "Injury",
      caseWideSummary: "Course",
    },
    imaging: [],
    workStatus: [],
    diagnoses: [],
    referralQuestions: [],
    examination: {
      date: "2026-10-23",
      note: "Exam",
      pdq: null,
      questionnaires: [],
      amaFindings: [],
    },
    discussion: {
      regions: [
        {
          region: "lumbar_spine",
          treatments: [],
          ...(care === undefined
            ? {}
            : { care_for_unsupported_diagnoses: care }),
          priorAnalysis: {
            trajectory: {
              subjective: trajectory,
              objective: trajectory,
              functional: trajectory,
            },
            plateauEvidence: [],
          },
          physicianDecisions: {
            causation: [],
            impairment: null,
            mmi: atMmi
              ? { status: "at_mmi", date: "2026-10-23", note: "" }
              : {
                  status: "not_at_mmi",
                  note: "Healing",
                  reevaluateIn: { amount: 6, unit: "weeks" },
                },
          },
        },
      ],
      work: { status: "full_duty", restrictions: [], duration: null },
      wholePerson: { allAtMmi: atMmi, impairment: null },
    },
  });
}

test("historical care survives all report variants and model prompt validation as a separate section", () => {
  const care = careForUnsupportedDiagnoses(
    analysis([row("SI injection", [assessment("sij")])]),
    steering(),
    diagnoses,
    label,
  );
  for (const atMmi of [true, false]) {
    for (const rating of [true, false]) {
      const input = buildReportVariantInput(reportBase(atMmi, rating, care));
      const region = input.discussion.regions[0];
      assert.deepEqual(region.care_for_unsupported_diagnoses, care);
      assert.deepEqual(region.care_marked_inappropriate, []);
      assert.deepEqual(region.care_marked_exhausted, []);
      const request = buildReportDraftRequest(input);
      assert.match(request.userPrompt, /"care_for_unsupported_diagnoses"/);
      assert.match(
        request.systemPrompt,
        /Inclusion is not a judgment that care was inappropriate or medically unnecessary/,
      );
      // Older snapshots can still omit the additive section.
      assert.doesNotThrow(() =>
        buildReportVariantInput(reportBase(atMmi, rating)),
      );
    }
  }
});
