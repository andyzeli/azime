import { eq, inArray } from "drizzle-orm";
import {
  causationCheck,
  emptyRegionOpinions,
  mmiCheck,
  workCheck,
  remainingCareCandidates,
  steeringMatchesAnalysis,
  legacyReportInputSchema as reportInputSchema,
  reportBaseInputSchema,
  type ReportBaseInput,
  type ReportCareForUnsupportedDiagnosis,
  type ReportInputResponse as NewReportInputResponse,
  type CaseOpinionsResponse,
  type CaseSummaryResponse,
  type PostExamInput,
  type Region,
  type ReportBlocker,
  type LegacyReportDiscussionRegion as ReportDiscussionRegion,
  type LegacyReportInput as ReportInput,
  type LegacyReportInputResponse as ReportInputResponse,
  type VisitDocumentationResponse,
} from "@azime/contracts";
import { combineRegionalRatings } from "../ama/combineImpairment.js";
import { db } from "../db/index.js";
import { PatientCase, Treatments } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import {
  collapseMedications,
  collapseWorkStatus,
  compactAmaFindings,
  compactQuestionnaire,
} from "../report/history.js";
import {
  buildReportRegion,
  reportQuestionnaire,
  reportAmaFindings,
} from "../report/input.js";
import { buildReportVariantInput } from "../report/inputs/index.js";
import { careForUnsupportedDiagnoses } from "../report/careForUnsupportedDiagnoses.js";
import { getAmaRegionRating } from "./amaRatingQueries.js";
import { getCanonicalDiagnoses } from "./canonicalDiagnosesQueries.js";
import { getCaseOpinions } from "./caseOpinionsQueries.js";
import { getStoredCaseSummary } from "./caseSummaryQueries.js";
import { getCompletedStudies } from "./completedStudies.js";
import { getMedicationHistory } from "./medicationHistory.js";
import { getPhysicianSteering } from "./physicianSteeringQueries.js";
import { getStoredPostExamAnalysis } from "./postExamAnalysisQueries.js";
import { getStoredPreExamAnalysis } from "./preExamAnalysisQueries.js";
import { getRegionDiagnosisList } from "./regionDiagnosesQueries.js";
import { getVisitDocumentation } from "./visitDocumentationQueries.js";
import { getWorkStatusHistory } from "./workStatusHistory.js";

type RegionResult =
  | {
      ok: true;
      diagnoses: ReportInput["diagnoses"][number];
      discussion: ReportDiscussionRegion;
      postExamInput: PostExamInput;
      careForUnsupportedDiagnoses: ReportCareForUnsupportedDiagnosis[];
      label: (dx: string) => string;
    }
  | { ok: false; blocker: ReportBlocker };

// One region's report material, or the first thing blocking it. The region is read
// from its latest post-exam analysis, which must still match the saved work.
async function regionReport(
  caseId: number,
  region: Region,
  shared: {
    caseSummary: CaseSummaryResponse | null;
    visit: VisitDocumentationResponse | null;
    opinions: CaseOpinionsResponse | null;
    impairmentRequested: boolean;
  },
): Promise<RegionResult> {
  const block = (message: string, tab: ReportBlocker["tab"]): RegionResult => ({
    ok: false,
    blocker: { region, message, tab },
  });
  const [stored, list, steering, canonical] = await Promise.all([
    getStoredPostExamAnalysis(caseId, region),
    getRegionDiagnosisList(caseId, region),
    getPhysicianSteering(caseId, region),
    getCanonicalDiagnoses(region),
  ]);
  const label = (dx: string) =>
    canonical.find((d) => d.canonicalDx === dx)?.label ?? dx;

  if (!stored) return block("Run the post-exam analysis.", "analysis");
  if (!stored.analysis)
    return block(
      "The post-exam analysis didn't finish. Run it again.",
      "analysis",
    );
  const { input, basedOn } = stored.inputSnapshot;
  const changed = [
    list.revision !== basedOn.diagnosesRevision && "diagnoses",
    steering?.revision !== basedOn.physicianSteeringRevision &&
      "treatment review",
    shared.visit?.revision !== basedOn.visitDocumentationRevision && "visit",
    shared.caseSummary?.id !== basedOn.caseSummaryId && "case summary",
  ].filter(Boolean);
  if (changed.length)
    return block(
      `The ${changed.join(", ")} changed since the post-exam analysis ran. Re-run it.`,
      "analysis",
    );

  // Report-only history: the supported-only pass 4 input cannot supply these rows.
  let unsupportedCare: ReportCareForUnsupportedDiagnosis[] = [];
  if (list.diagnoses.some((d) => d.status === "not_supported")) {
    const preExam = await getStoredPreExamAnalysis(caseId, region);
    if (
      !preExam?.analysis ||
      preExam.id !== basedOn.preExamAnalysisId ||
      preExam.updatedAt.toISOString() !== basedOn.preExamAnalysisUpdatedAt ||
      !steering ||
      steering.id !== basedOn.physicianSteeringId ||
      !steeringMatchesAnalysis(steering.steering, {
        id: preExam.id,
        updatedAt: preExam.updatedAt.toISOString(),
      })
    )
      return block(
        "The treatment analysis changed since the post-exam analysis ran. Re-run it.",
        "analysis",
      );
    unsupportedCare = careForUnsupportedDiagnoses(
      preExam.analysis,
      steering.steering,
      list.diagnoses,
      label,
    );
  }

  const opinions =
    shared.opinions?.opinions.regions[region] ?? emptyRegionOpinions();
  const candidates = remainingCareCandidates(input.reviewedTreatmentAnalysis);
  const { issues } = mmiCheck(opinions, candidates);
  if (issues.length) return block(issues[0]!, "mmi");
  const mmi = opinions.mmi!;
  const supported = input.diagnoses.map((d) => d.canonicalDx);
  const causationIssues = causationCheck(opinions, supported);
  if (causationIssues.length) return block(causationIssues[0]!, "mmi");

  let impairment: ReportDiscussionRegion["impairment"] = null;
  if (shared.impairmentRequested && mmi.status === "at_mmi") {
    const rating = await getAmaRegionRating(caseId, region);
    if (!rating.combined)
      return block(
        `Impairment is pending: ${rating.combinationIssues[0] ?? "resolve the AMA findings"}`,
        "mmi",
      );
    impairment = {
      components: rating.components.flatMap((c) =>
        c.status === "rated" && c.wpi !== null
          ? [
              {
                diagnoses: c.canonicalDxIds.map(label),
                basis: c.description,
                nerveRoot: c.method === "diagnostic_row" ? c.nerveRoot : null,
                side: c.method === "diagnostic_row" ? c.side : null,
                entryId: c.method === "diagnostic_row" ? c.entryId : null,
                zeroReason: c.zeroReason,
                wpi: c.wpi,
              },
            ]
          : [],
      ),
      wpi: rating.combined.wpi,
      rationale: rating.combined.rationale,
    };
  }

  return {
    ok: true,
    postExamInput: input,
    careForUnsupportedDiagnoses: unsupportedCare,
    label,
    diagnoses: {
      region,
      diagnoses: list.diagnoses.flatMap((d) =>
        d.status === "working"
          ? []
          : [
              {
                label: label(d.canonicalDx),
                status: d.status,
                reason: d.reason,
              },
            ],
      ),
    },
    discussion: {
      region,
      supportedDiagnoses: input.diagnoses.map((d) => d.label),
      treatmentAnalysis: input.reviewedTreatmentAnalysis.treatments.map(
        (t) => ({
          treatment: t.treatment,
          recordStatus: t.recordStatus,
          recordDetail: t.recordDetail,
          assessments: t.assessments.map((a) => ({
            diagnosis: label(a.canonicalDx),
            applicability: a.applicability.value,
            rationale: a.applicability.rationale,
          })),
          exhaustion: t.exhaustion.value,
          exhaustionRationale: t.exhaustion.rationale,
        }),
      ),
      trajectory: stored.analysis.trajectory,
      causation: input.diagnoses.map((d) => ({
        diagnosis: d.label,
        ...opinions.causation[d.canonicalDx]!,
      })),
      mmi,
      plateauEvidence:
        mmi.status === "at_mmi"
          ? stored.analysis.plateauEvidence.supporting
          : stored.analysis.plateauEvidence.opposing,
      remainingCare: candidates.map(({ treatment }) => {
        const decision = opinions.remainingCare[treatment.id]!;
        return {
          treatment: treatment.treatment,
          category: treatment.category,
          disposition: decision.disposition,
          note:
            decision.disposition === "not_recommended" ? decision.note : null,
        };
      }),
      impairment,
    },
  };
}

// The report drafter's input (see contracts report.ts), or what still blocks it.
export async function _getReportInput(
  caseId: number,
): Promise<ReportInputResponse> {
  const {
    blockers,
    regions,
    work,
    impairmentRequested,
    studies,
    workStatus,
    medications,
  } = await loadReportSources(caseId);
  if (blockers.length || !regions.length) return { input: null, blockers };
  return {
    blockers,
    input: assembleLegacyInput({
      regions,
      work,
      impairmentRequested,
      studies,
      workStatus,
      medications,
    }),
  };
}

async function loadReportSources(caseId: number) {
  const patientCase = await db.query.PatientCase.findFirst({
    where: eq(PatientCase.id, caseId),
  });
  if (!patientCase) throw new MissingPrerequisiteError("Case not found");
  const impairmentRequested = patientCase.amaMode === "rating";

  const [caseSummary, visit, opinions, studies, workStatus, medications] =
    await Promise.all([
      getStoredCaseSummary(caseId),
      getVisitDocumentation(caseId),
      getCaseOpinions(caseId),
      getCompletedStudies(caseId),
      getWorkStatusHistory(caseId),
      getMedicationHistory(caseId),
    ]);
  const blockers: ReportBlocker[] = [];
  if (!caseSummary)
    blockers.push({
      region: null,
      message: "Generate the case summary.",
      tab: "summary",
    });
  if (!visit)
    blockers.push({ region: null, message: "Save the visit.", tab: "visit" });
  if (!patientCase.regions.length)
    blockers.push({
      region: null,
      message: "The case has no regions.",
      tab: "summary",
    });

  const results = await Promise.all(
    patientCase.regions.map((region) =>
      regionReport(caseId, region, {
        caseSummary,
        visit,
        opinions,
        impairmentRequested,
      }),
    ),
  );
  const regions = results.flatMap((r) => (r.ok ? [r] : []));
  blockers.push(...results.flatMap((r) => (r.ok ? [] : [r.blocker])));
  const work = opinions?.opinions.work;
  const workIssues = workCheck(work);
  if (workIssues.length)
    blockers.push({ region: null, message: workIssues[0]!, tab: "mmi" });
  return {
    blockers,
    regions,
    work,
    impairmentRequested,
    studies,
    workStatus,
    medications,
    referralQuestions: patientCase.referralQuestions,
  };
}

function assembleLegacyInput({
  regions,
  work,
  impairmentRequested,
  studies,
  workStatus,
  medications,
}: Omit<
  Awaited<ReturnType<typeof loadReportSources>>,
  "blockers" | "referralQuestions"
>): ReportInput {
  // Every region's analysis matches the current case summary and visit, so any one
  // supplies the case-level material.
  const shared = regions[0]!.postExamInput;
  const discussion = regions.map((r) => r.discussion);
  return reportInputSchema.parse({
    intro: {
      ...shared.caseContext,
      examinationDate: shared.visit.examinationDate,
      impairmentRequested,
    },
    background: {
      medications: collapseMedications(medications),
      psychosocialFactors: shared.caseSummary.psychosocialFactors,
    },
    historyOfPresentIllness: {
      incidentNarrative: shared.caseSummary.incidentNarrative,
      caseWideSummary: shared.caseSummary.caseWideSummary,
    },
    imaging: studies.map((s) => ({
      date: s.date,
      modality: s.modality,
      bodySite: s.bodySite,
      impression: s.radiologistImpression,
    })),
    workStatus: collapseWorkStatus(workStatus),
    diagnoses: regions.map((r) => r.diagnoses),
    examination: {
      date: shared.visit.examinationDate,
      note: shared.visit.note,
      pdq:
        shared.visit.pdq &&
        compactQuestionnaire(
          "Pain and disability questionnaire",
          shared.visit.pdq,
        ),
      questionnaires: shared.visit.questionnaires.map((q) =>
        compactQuestionnaire(q.title, q),
      ),
      amaFindings: regions.map((r) => ({
        region: r.discussion.region,
        findings: r.postExamInput.visit.amaFindings.map((f) =>
          compactAmaFindings(f, r.label),
        ),
      })),
    },
    discussion: {
      regions: discussion,
      work: work!,
      wholePerson: {
        allAtMmi: discussion.every((r) => r.mmi.status === "at_mmi"),
        impairment: impairmentRequested
          ? combineRegionalRatings(
              discussion.map((r) => ({
                region: r.region,
                is_mmi: r.mmi.status === "at_mmi",
                wpi: r.impairment?.wpi ?? null,
              })),
            )
          : null,
      },
    },
  });
}

// Same source queries and readiness checks as _getReportInput; only the deterministic
// projection differs. The old builder remains available for side-by-side comparison.
export async function getReportInput(
  caseId: number,
): Promise<NewReportInputResponse> {
  const sources = await loadReportSources(caseId);
  if (sources.blockers.length || !sources.regions.length)
    return { input: null, blockers: sources.blockers };

  const treatmentIds = [
    ...new Set(
      sources.regions.flatMap((r) =>
        r.postExamInput.reviewedTreatmentAnalysis.treatments.flatMap((t) =>
          t.treatmentId ? [t.treatmentId] : [],
        ),
      ),
    ),
  ];
  const categories = treatmentIds.length
    ? await db
        .select({ id: Treatments.id, category: Treatments.category })
        .from(Treatments)
        .where(inArray(Treatments.id, treatmentIds))
    : [];
  const base = assembleReportInput(
    sources,
    new Map(categories.map((t) => [t.id, t.category])),
  );
  return { blockers: [], input: buildReportVariantInput(base) };
}

// Shared sections for the four new builders. No legacy report is assembled here.
function assembleReportInput(
  {
    regions,
    work,
    impairmentRequested,
    studies,
    workStatus,
    medications,
    referralQuestions,
  }: Omit<Awaited<ReturnType<typeof loadReportSources>>, "blockers">,
  categories: ReadonlyMap<string, string>,
): ReportBaseInput {
  // Every region's analysis matches the current case summary and visit, so any one
  // supplies the case-level material.
  const shared = regions[0]!.postExamInput;
  const discussion = regions.map((r) => r.discussion);
  return reportBaseInputSchema.parse({
    schemaVersion: "report-v2",
    referralQuestions,
    intro: {
      ...shared.caseContext,
      examinationDate: shared.visit.examinationDate,
      impairmentRequested,
    },
    background: {
      recordedMedications: collapseMedications(medications),
      psychosocialFactors: shared.caseSummary.psychosocialFactors,
    },
    historyOfPresentIllness: {
      incidentNarrative: shared.caseSummary.incidentNarrative,
      caseWideSummary: shared.caseSummary.caseWideSummary,
    },
    imaging: studies.map((s) => ({
      date: s.date,
      modality: s.modality,
      bodySite: s.bodySite,
      impression: s.radiologistImpression,
    })),
    workStatus: workStatus.map(({ date, status, restrictions }) => ({
      documentedOn: date,
      status,
      restrictions,
    })),
    diagnoses: regions.map((r) => r.diagnoses),
    examination: {
      date: shared.visit.examinationDate,
      note: shared.visit.note,
      pdq:
        shared.visit.pdq &&
        reportQuestionnaire(
          "Pain and disability questionnaire",
          shared.visit.pdq,
        ),
      questionnaires: shared.visit.questionnaires.map((q) =>
        reportQuestionnaire(q.title, q),
      ),
      amaFindings: regions.map((r) => ({
        region: r.discussion.region,
        findings: r.postExamInput.visit.amaFindings.map((f) =>
          reportAmaFindings(f, r.label),
        ),
      })),
    },
    discussion: {
      regions: regions.map((r) => ({
        ...buildReportRegion(r.discussion, r, categories),
        care_for_unsupported_diagnoses: r.careForUnsupportedDiagnoses,
      })),
      work: work!,
      wholePerson: {
        allAtMmi: discussion.every((r) => r.mmi.status === "at_mmi"),
        impairment: impairmentRequested
          ? combineRegionalRatings(
              discussion.map((r) => ({
                region: r.region,
                is_mmi: r.mmi.status === "at_mmi",
                wpi: r.impairment?.wpi ?? null,
              })),
            )
          : null,
      },
    },
  });
}
