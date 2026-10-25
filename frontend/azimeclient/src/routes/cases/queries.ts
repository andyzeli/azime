import axios from "redaxios";
import { queryOptions } from "@tanstack/react-query";
import {
  CaseContacts,
  PatientQuestionnaireInstance,
  PatientCase,
  Records,
} from "../../../../../backend/src/db/schema";
import {
  caseProviderListSchema,
  caseProviderSchema,
  caseInjuryDetailsSchema,
  caseSummaryResponseSchema,
  caseSummaryCardResponseSchema,
  refinedAnalysisResponseSchema,
  physicianSteeringResponseSchema,
  savePhysicianSteeringRequestSchema,
  preExamAnalysisResponseSchema,
  providerSummariesResponseSchema,
  type CaseSummaryResponse,
  type Region,
  type StoredCaseClinicalSummary,
  type CaseInjuryDetails,
  type CaseProviderDto,
  type CreateCaseProviderInput,
  type SavePhysicianSteeringRequest,
  type PhysicianAddedTreatment,
  visitDocumentationResponseSchema,
  regionDiagnosesResponseSchema,
  saveRegionDiagnosesRequestSchema,
  type SaveRegionDiagnosesRequest,
  canonicalDiagnosisListSchema,
  saveVisitDocumentationRequestSchema,
  generatePostExamAnalysisRequestSchema,
  postExamAnalysisResponseSchema,
  type SaveVisitDocumentationRequest,
  type AmaCandidatesRequest,
  type AmaMode,
  type AmaCandidatesResponse,
  caseOpinionsResponseSchema,
  amaRegionRatingResponseSchema,
  reportInputResponseSchema,
  pastMedicalHistorySchema,
  caseReportResponseSchema,
  saveCaseOpinionsRequestSchema,
  type SaveCaseOpinionsRequest,
} from "@azime/contracts";
import type {
  QuestionnaireDefinition,
  QuestionnaireType,
} from "../../../../../backend/src/questionnaires/definitions";
import type { CompleteRecordUploadInput } from "../../../../../backend/src/records/documentMetadata";
import {
  safeParseStoredExtraction,
  type AnyStoredExtraction,
} from "../../../../../backend/src/ai/gemini/registry";
import { NewPatientCase } from "./case/components/NewCaseForm";
export class NotFoundError extends Error {}

type CaseType = PatientCase;
type Provider = {
  id: string;
  name: string;
  type: string;
};
export type DbPatientCase = {
  id: number;
  patientName: string | null;
  patientLastName: string | null;
  providerName: Provider;
  caseContact: Partial<CaseContacts>;
  caseType: string | null;
  status: string | null;
  amaMode: AmaMode;
  referralQuestions: string[];
} & CaseInjuryDetails;

export type PatientQuestionnaireDefinition = Omit<
  QuestionnaireDefinition,
  "scoreResponses"
>;

export type PatientQuestionnaireWithDefinition =
  PatientQuestionnaireInstance & {
    definition: PatientQuestionnaireDefinition | null;
  };

export type PatientQuestionnaireWithCase =
  PatientQuestionnaireWithDefinition & {
    patientCase: {
      id: number;
      patientName: string | null;
      patientLastName: string | null;
    } | null;
  };

export type RecordWithProvider = Records & {
  provider: CaseProviderDto | null;
};

export type RecordWithParsedSummary = RecordWithProvider & {
  parsedSummary: AnyStoredExtraction | null;
  summaryParseError: string | null;
};

export type CaseSummaryWithParsedAggregate = {
  parsedAggregateSummary: CaseSummaryResponse["summary"] | null;
  aggregateSummaryParseError: string | null;
};

const fetchCases = async () => {
  console.info("Fetching cases...");
  await new Promise((r) => setTimeout(r, 500));
  const response = await axios.get<Array<CaseType>>(`${API_BASE_URL}/cases`);
  return response.data;
};
const API_BASE_URL = "http://localhost:4000";

export const fetchMessage = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return axios.get<{ message: string }>(API_BASE_URL).then((r) => r.data);
};
export const fetOpts = () =>
  queryOptions({
    queryKey: ["foo"],
    queryFn: () => fetchMessage(),
  });

const fetchCase = async (caseId: string) => {
  console.info(`Fetching case with id ${caseId}...`);
  await new Promise((r) => setTimeout(r, 500));
  const post = await axios
    .get<DbPatientCase>(`${API_BASE_URL}/cases/${caseId}`)
    .then((r) => r.data);

  if (!post) {
    throw new NotFoundError(`Post with id "${caseId}" not found!`);
  }

  return post;
};

export const caseQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["cases", { caseId }],
    queryFn: () => fetchCase(caseId),
  });

export const casesQueryOptions = queryOptions({
  queryKey: ["cases"],
  queryFn: () => fetchCases(),
});

export const createCase = async (newcase: NewPatientCase) =>
  axios
    .post<{ id: number }>(`${API_BASE_URL}/cases`, newcase)
    .then((response) => response.data);

export const updateCaseInjuryDetails = async (
  caseId: string,
  input: CaseInjuryDetails
) =>
  axios
    .put<unknown>(`${API_BASE_URL}/cases/${caseId}`, input)
    .then((response) => caseInjuryDetailsSchema.parse(response.data));

export const updateAmaMode = async (caseId: string, amaMode: AmaMode) =>
  axios
    .put<{ amaMode: AmaMode }>(`${API_BASE_URL}/cases/${caseId}/ama-mode`, { amaMode })
    .then((response) => response.data);

export const updateReferralQuestions = async (
  caseId: string,
  referralQuestions: string[]
) =>
  axios
    .put<{ referralQuestions: string[] }>(
      `${API_BASE_URL}/cases/${caseId}/referral-questions`,
      { referralQuestions }
    )
    .then((response) => response.data);

export const fetchCaseSummary = async (caseId: string) => {
  return axios
    .get<unknown>(`${API_BASE_URL}/cases/${caseId}/case-summary`)
    .then((r): CaseSummaryWithParsedAggregate | null => {
      if (!r.data) {
        return null;
      }

      const parsedAggregate = caseSummaryResponseSchema.safeParse(r.data);

      return {
        parsedAggregateSummary: parsedAggregate.success
          ? parsedAggregate.data.summary
          : null,
        aggregateSummaryParseError: parsedAggregate.success
          ? null
          : (parsedAggregate.error.issues[0]?.message ??
            "Invalid aggregate summary payload"),
      };
    });
};
export const caseSummaryQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["caseSummary", { caseId }],
    queryFn: () => fetchCaseSummary(caseId),
  });

export const caseSummaryCardQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["caseSummaryCard", { caseId }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/case-summary/card`)
        .then((response) => caseSummaryCardResponseSchema.parse(response.data)),
  });

export const fetchProviderSummaries = async (caseId: string) =>
  axios
    .get<unknown>(`${API_BASE_URL}/cases/${caseId}/provider-summaries`)
    .then((response) =>
      providerSummariesResponseSchema.nullable().parse(response.data)
    );

export const providerSummariesQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["providerSummaries", { caseId }],
    queryFn: () => fetchProviderSummaries(caseId),
  });

export const fetchPreExamAnalysis = async (caseId: string, region: Region) =>
  axios
    .get<unknown>(`${API_BASE_URL}/cases/${caseId}/pre-exam-analysis/${region}`)
    .then((response) =>
      preExamAnalysisResponseSchema.nullable().parse(response.data)
    );

export const preExamAnalysisQueryOptions = (caseId: string, region: Region) =>
  queryOptions({
    queryKey: ["preExamAnalysis", { caseId, region }],
    queryFn: () => fetchPreExamAnalysis(caseId, region),
  });

export const takePreExamSnapshot = async (
  caseId: string,
  region: Region,
  selectedDiagnoses?: string[]
) =>
  axios.post(
    `${API_BASE_URL}/cases/${caseId}/pre-exam-analysis/${region}/snapshot`,
    selectedDiagnoses === undefined ? {} : { selectedDiagnoses }
  );

// Treatment analysis for one listed diagnosis the run doesn't cover; keeps rows and steering.
export const analyzeAddedDiagnosis = async (
  caseId: string,
  region: Region,
  canonicalDx: string
) =>
  axios.post(
    `${API_BASE_URL}/cases/${caseId}/pre-exam-analysis/${region}/diagnoses`,
    { canonicalDx }
  );

interface InputSnapshot {
  scope: {
    region: Region;
    diagnoses: string[];
  };
  ladder: {
    canonicalDx: string;
    treatmentId: string;
    treatment: string;
    category: PhysicianAddedTreatment["category"];
  }[];
  treatmentEpisodes: {
    id: string;
    kind: "therapy" | "chiropractic" | "intervention" | "surgery";
    name: string;
    records: { recordId: number; eventDate: string | null }[];
  }[];
  currentMedications: unknown[];
  completedStudies: unknown[];
  workStatusHistory: unknown[];
  supportingRecords: unknown[];
}

export type PreExamSnapshotResponse = {
  caseId: number;
  region: Region;
  inputSnapshot: InputSnapshot | null;
  availableDiagnoses: string[];
};

export const fetchPreExamSnapshot = async (caseId: string, region: Region) =>
  axios
    .get<PreExamSnapshotResponse>(
      `${API_BASE_URL}/cases/${caseId}/pre-exam-analysis/${region}/snapshot`
    )
    .then((response) => response.data);

export const preExamSnapshotQueryOptions = (caseId: string, region: Region) =>
  queryOptions({
    queryKey: ["preExamSnapshot", { caseId, region }],
    queryFn: () => fetchPreExamSnapshot(caseId, region),
  });

export const generatePreExamAnalysis = async (caseId: string, region: Region) =>
  axios.post(`${API_BASE_URL}/cases/${caseId}/pre-exam-analysis/${region}`);

export const fetchPhysicianSteering = async (caseId: string, region: Region) =>
  axios
    .get<unknown>(
      `${API_BASE_URL}/cases/${caseId}/physician-steering/${region}`
    )
    .then((response) =>
      physicianSteeringResponseSchema.nullable().parse(response.data)
    );

export const physicianSteeringQueryOptions = (
  caseId: string,
  region: Region,
  preExamAnalysisUpdatedAt?: string
) =>
  queryOptions({
    queryKey: [
      "physicianSteering",
      { caseId, region },
      preExamAnalysisUpdatedAt,
    ],
    queryFn: () => fetchPhysicianSteering(caseId, region),
  });

export const savePhysicianSteering = async (
  caseId: string,
  region: Region,
  input: SavePhysicianSteeringRequest
) =>
  axios
    .put<unknown>(
      `${API_BASE_URL}/cases/${caseId}/physician-steering/${region}`,
      savePhysicianSteeringRequestSchema.parse(input)
    )
    .then((response) => physicianSteeringResponseSchema.parse(response.data));

export const fetchRefinedAnalysis = async (caseId: string, region: Region) =>
  axios
    .get<unknown>(`${API_BASE_URL}/cases/${caseId}/refined-analysis/${region}`)
    .then((response) =>
      refinedAnalysisResponseSchema.nullable().parse(response.data)
    );

export const refinedAnalysisQueryOptions = (caseId: string, region: Region) =>
  queryOptions({
    queryKey: ["refinedAnalysis", { caseId, region }],
    queryFn: () => fetchRefinedAnalysis(caseId, region),
  });

// Builds the input from saved steering, runs exam prep, and replaces the region's
// current result only when the run succeeds.
export const generateRefinedAnalysis = async (caseId: string, region: Region) =>
  axios
    .post<unknown>(`${API_BASE_URL}/cases/${caseId}/refined-analysis/${region}`)
    .then((response) => refinedAnalysisResponseSchema.parse(response.data));

export const recordsQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["records", { caseId }],
    queryFn: () => fetchRecords(caseId),
  });

export const fetchCaseProviders = async (caseId: number) =>
  axios
    .get<unknown>(`${API_BASE_URL}/cases/${caseId}/providers`)
    .then((response) => caseProviderListSchema.parse(response.data));

export const caseProvidersQueryOptions = (caseId: number) =>
  queryOptions({
    queryKey: ["caseProviders", { caseId }],
    queryFn: () => fetchCaseProviders(caseId),
  });

export const createCaseProvider = async (
  caseId: number,
  input: CreateCaseProviderInput
) =>
  axios
    .post<unknown>(`${API_BASE_URL}/cases/${caseId}/providers`, input)
    .then((response) => caseProviderSchema.parse(response.data));

export const createRecordUpload = async (payload: {
  caseId: number;
  fileName: string;
  contentType: string;
}) => {
  return axios
    .post<{
      objectKey: string;
      uploadUrl: string;
    }>(`${API_BASE_URL}/uploads/sign`, payload)
    .then((r) => r.data);
};

export const completeRecordUpload = async (
  payload: CompleteRecordUploadInput
) => {
  return axios
    .post(`${API_BASE_URL}/uploads/complete`, payload)
    .then((r) => r.data);
};

export type TestRecordFixtureSummary = {
  id: string;
  label: string;
  description: string;
  documentType: string;
  eventDate: string;
};

export const fetchTestRecordFixtures = async () =>
  axios
    .get<
      TestRecordFixtureSummary[]
    >(`${API_BASE_URL}/test-data/record-fixtures`)
    .then((response) => response.data);

export const createTestRecord = async (payload: {
  caseId: number;
  fixtureId: string;
}) =>
  axios
    .post(`${API_BASE_URL}/test-data/records`, payload)
    .then((response) => response.data);

export const fetchRecordDownloadUrl = async (recordId: number) => {
  return axios
    .get<{ url: string }>(`${API_BASE_URL}/records/${recordId}/download-url`)
    .then((r) => r.data);
};

export const summarizeRecord = async (recordId: number) => {
  return axios
    .post<{
      recordId: number;
      summaryStatus: string;
      summary: unknown;
    }>(`${API_BASE_URL}/records/${recordId}/summarize`)
    .then((r) => r.data);
};
export const deleteRecord = async (recordId: number) => {
  return axios
    .delete<{
      recordId: number;
      deleted: boolean;
    }>(`${API_BASE_URL}/records/${recordId}`)
    .then((r) => r.data);
};
export const summarizeCase = async (caseId: number) => {
  return axios
    .post<{
      caseId: number;
      sourceRecordCount: number;
      aggregateSummary: StoredCaseClinicalSummary;
      storage: {
        caseSummaryId: number | null;
      };
    }>(`${API_BASE_URL}/cases/${caseId}/aggregate-summary`)
    .then((r) => r.data);
};

export const fetchPatientQuestionnaires = async (caseId: string) => {
  return axios
    .get<
      Array<PatientQuestionnaireWithDefinition>
    >(`${API_BASE_URL}/cases/${caseId}/questionnaires`)
    .then((r) => r.data);
};

export const patientQuestionnairesQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["patientQuestionnaires", { caseId }],
    queryFn: () => fetchPatientQuestionnaires(caseId),
  });

export const createPatientQuestionnaire = async (payload: {
  caseId: number;
  type: QuestionnaireType;
  appointmentId?: number | null;
}) => {
  return axios
    .post<PatientQuestionnaireWithDefinition>(
      `${API_BASE_URL}/cases/${payload.caseId}/questionnaires`,
      {
        type: payload.type,
        appointmentId: payload.appointmentId ?? null,
      }
    )
    .then((r) => r.data);
};

export const fetchPatientQuestionnaireByToken = async (accessToken: string) => {
  return axios
    .get<PatientQuestionnaireWithCase>(
      `${API_BASE_URL}/questionnaires/${accessToken}`
    )
    .then((r) => r.data);
};

export const patientQuestionnaireByTokenQueryOptions = (accessToken: string) =>
  queryOptions({
    queryKey: ["patientQuestionnaire", { accessToken }],
    queryFn: () => fetchPatientQuestionnaireByToken(accessToken),
  });

export const submitPatientQuestionnaire = async (payload: {
  accessToken: string;
  responses: Array<{ itemId: string; score: number }>;
}) => {
  return axios
    .post<PatientQuestionnaireWithDefinition>(
      `${API_BASE_URL}/questionnaires/${payload.accessToken}/submit`,
      { responses: payload.responses }
    )
    .then((r) => r.data);
};

export const deletePatientQuestionnaire = async (questionnaireId: number) => {
  return axios
    .delete<{
      questionnaireId: number;
      deleted: boolean;
    }>(`${API_BASE_URL}/questionnaires/${questionnaireId}`)
    .then((r) => r.data);
};

const fetchRecords = async (caseId: string) => {
  console.info(`Fetching case with id ${caseId}...`);
  //await new Promise((r) => setTimeout(r, 500));
  const post = await axios
    .get<Array<RecordWithProvider>>(`${API_BASE_URL}/records?caseId=${caseId}`)
    .then((r) => r.data);

  if (!post) {
    throw new NotFoundError(`Post with id "${caseId}" not found!`);
  }

  return post.map<RecordWithParsedSummary>((record) => {
    if (record.summary == null) {
      return {
        ...record,
        parsedSummary: null,
        summaryParseError: null,
      };
    }
    const parsedSummary = safeParseStoredExtraction(
      record.documentType,
      record.summary
    );

    if (!parsedSummary.success && record.summary != null) {
      console.warn("Record summary did not match storedRecordSummarySchema", {
        recordId: record.id,
        issues: parsedSummary.error.issues,
      });
    }

    return {
      ...record,
      parsedSummary: parsedSummary.success ? parsedSummary.data : null,
      summaryParseError: parsedSummary.success
        ? null
        : (parsedSummary.error.issues[0]?.message ?? "Invalid summary payload"),
    };
  });
};

export const canonicalDiagnosesQueryOptions = (region: Region) =>
  queryOptions({
    queryKey: ["canonicalDiagnoses", { region }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/regions/${region}/canonical-diagnoses`)
        .then((response) => canonicalDiagnosisListSchema.parse(response.data)),
    staleTime: Infinity,
  });

// Read-only lookup of AMA rows for diagnoses in the region's Analysis scope.
export const amaCandidatesQueryOptions = (
  caseId: string,
  region: Region,
  diagnoses: AmaCandidatesRequest["diagnoses"]
) =>
  queryOptions({
    queryKey: ["amaCandidates", { caseId, region }, diagnoses],
    queryFn: () =>
      axios
        .post<AmaCandidatesResponse>(
          `${API_BASE_URL}/cases/${caseId}/ama-candidates/${region}`,
          { diagnoses }
        )
        .then((response) => response.data),
  });

// The region's diagnosis list: scope for analysis and exam tasks, plus the physician's conclusions.
export const regionDiagnosesQueryOptions = (caseId: string, region: Region) =>
  queryOptions({
    queryKey: ["regionDiagnoses", { caseId, region }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/diagnoses/${region}`)
        .then((response) => regionDiagnosesResponseSchema.parse(response.data)),
  });

export const saveRegionDiagnoses = (
  caseId: string,
  region: Region,
  input: SaveRegionDiagnosesRequest
) =>
  axios
    .put<unknown>(
      `${API_BASE_URL}/cases/${caseId}/diagnoses/${region}`,
      saveRegionDiagnosesRequestSchema.parse(input)
    )
    .then((response) => regionDiagnosesResponseSchema.parse(response.data));

export const visitQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["visit", { caseId }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/visit`)
        .then((response) =>
          visitDocumentationResponseSchema.nullable().parse(response.data)
        ),
  });

export const saveVisit = (
  caseId: string,
  input: SaveVisitDocumentationRequest
) =>
  axios
    .put<unknown>(
      `${API_BASE_URL}/cases/${caseId}/visit`,
      saveVisitDocumentationRequestSchema.parse(input)
    )
    .then((response) => visitDocumentationResponseSchema.parse(response.data));

// Draft AMA rating of the region's saved visit assessments.
export const amaRatingQueryOptions = (caseId: string, region: Region) =>
  queryOptions({
    queryKey: ["amaRating", { caseId, region }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/ama-rating/${region}`)
        .then((response) => amaRegionRatingResponseSchema.parse(response.data)),
  });

// The report drafter's input as the builder shows it, or what blocks it.
export const reportInputQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["reportInput", { caseId }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/report-input`)
        .then((response) => reportInputResponseSchema.parse(response.data)),
  });

// The latest report generation (null before the first).
export const caseReportQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["caseReport", { caseId }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/report`)
        .then((response) => caseReportResponseSchema.nullable().parse(response.data)),
  });

// What Generate would send the model, without calling it or saving.
export const generateCaseReportDryRun = (caseId: string) =>
  axios
    .post<{ input: unknown; variant: string; systemPrompt: string; userPrompt: string }>(
      `${API_BASE_URL}/cases/${caseId}/report?dryRun=1`
    )
    .then((response) => response.data);

export const generateCaseReport = (caseId: string) =>
  axios
    .post<unknown>(`${API_BASE_URL}/cases/${caseId}/report`)
    .then((response) => caseReportResponseSchema.parse(response.data));

// Past medical history documented in the records, for the causation questions.
export const pastMedicalHistoryQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["pastMedicalHistory", { caseId }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/past-medical-history`)
        .then((response) => pastMedicalHistorySchema.parse(response.data)),
  });

export const caseOpinionsQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["opinions", { caseId }],
    queryFn: () =>
      axios
        .get<unknown>(`${API_BASE_URL}/cases/${caseId}/opinions`)
        .then((response) =>
          caseOpinionsResponseSchema.nullable().parse(response.data)
        ),
  });

export const saveCaseOpinions = (
  caseId: string,
  input: SaveCaseOpinionsRequest
) =>
  axios
    .put<unknown>(
      `${API_BASE_URL}/cases/${caseId}/opinions`,
      saveCaseOpinionsRequestSchema.parse(input)
    )
    .then((response) => caseOpinionsResponseSchema.parse(response.data));

export const postExamAnalysisQueryOptions = (
  caseId: string,
  region: Region,
  snapshotId?: number
) =>
  queryOptions({
    queryKey: ["postExamAnalysis", { caseId, region, snapshotId }],
    queryFn: () =>
      axios
        .get<unknown>(
          `${API_BASE_URL}/cases/${caseId}/post-exam-analysis/${region}${snapshotId === undefined ? "" : `?snapshotId=${snapshotId}`}`
        )
        .then((response) =>
          postExamAnalysisResponseSchema.nullable().parse(response.data)
        ),
  });

// The note, PDQ and questionnaires come from the case's saved visit.
export const takePostExamSnapshot = (caseId: string, region: Region) =>
  axios
    .post<unknown>(
      `${API_BASE_URL}/cases/${caseId}/post-exam-analysis/${region}/snapshot`
    )
    .then((response) => postExamAnalysisResponseSchema.parse(response.data));

export const generatePostExamAnalysis = (
  caseId: string,
  region: Region,
  snapshotId: number
) =>
  axios
    .post<unknown>(
      `${API_BASE_URL}/cases/${caseId}/post-exam-analysis/${region}`,
      generatePostExamAnalysisRequestSchema.parse({ snapshotId })
    )
    .then((response) => postExamAnalysisResponseSchema.parse(response.data));

// Freezes the current inputs, then runs pass 4 on them. The snapshot is kept even if the run fails.
export const runPostExamAnalysis = async (caseId: string, region: Region) =>
  generatePostExamAnalysis(
    caseId,
    region,
    (await takePostExamSnapshot(caseId, region)).id
  );
