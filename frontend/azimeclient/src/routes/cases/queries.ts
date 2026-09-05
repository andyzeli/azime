import axios from "redaxios";
import { queryOptions } from "@tanstack/react-query";
import {
  CaseContacts,
  CaseProvider,
  CaseRecordsSummary,
  PatientQuestionnaireInstance,
  PatientCase,
  Records,
} from "../../../../../backend/src/db/schema";
import type {
  QuestionnaireDefinition,
  QuestionnaireType,
} from "../../../../../backend/src/questionnaires/definitions";
import type { CompleteRecordUploadInput } from "../../../../../backend/src/records/documentMetadata";
import type { CreateCaseProviderInput } from "../../../../../backend/src/providers/caseProvider";
import {
  safeParseStoredExtraction,
  type AnyStoredExtraction,
} from "../../../../../backend/src/ai/gemini/registry";
import {
  storedCaseClinicalSummarySchema,
  type StoredCaseClinicalSummary,
} from "../../../../../backend/src/ai/clinicalSummarySchema";
import {
  storedPreExamAnalysisSchema,
  type StoredPreExamAnalysis,
} from "../../../../../backend/src/ai/preExamAnalysisSchema";
import {
  storedRefinedAnalysisSchema,
  type StoredRefinedAnalysis,
} from "../../../../../backend/src/ai/refinedAnalysisSchema";
import { NewPatientCase } from "./case/components/NewCaseForm";
export class NotFoundError extends Error {}

type CaseType = PatientCase;
type Provider = {
  id: string;
  name: string;
  type: string;
};
type DbPatientCase = {
  id: number;
  patientName: string | null;
  patientLastName: string | null;
  providerName: Provider;
  caseContact: Partial<CaseContacts>;
  caseType: string | null;
  status: string | null;
};

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
  provider: Pick<CaseProvider, "id" | "name" | "kind" | "discipline"> | null;
};

export type RecordWithParsedSummary = RecordWithProvider & {
  parsedSummary: AnyStoredExtraction | null;
  summaryParseError: string | null;
};

export type CaseSummaryWithParsedAggregate = CaseRecordsSummary & {
  parsedAggregateSummary: StoredCaseClinicalSummary | null;
  aggregateSummaryParseError: string | null;
};

type StoredAnalysisResponse = {
  id: number;
  caseId: number;
  analysis: unknown;
  createdAt: string;
  updatedAt: string;
};

export type PreExamAnalysisWithParsedArtifact = StoredAnalysisResponse & {
  parsedAnalysis: StoredPreExamAnalysis | null;
  analysisParseError: string | null;
};

export type RefinedAnalysisWithParsedArtifact = StoredAnalysisResponse & {
  parsedAnalysis: StoredRefinedAnalysis | null;
  analysisParseError: string | null;
};

const fetchCases = async () => {
  console.info("Fetching cases...");
  await new Promise((r) => setTimeout(r, 500));
  const response = await axios.get<Array<CaseType>>(`${API_BASE_URL}/cases`);
  console.log("Cases response:", response.data);
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

export const createCase = async (newcase: NewPatientCase) => {
  return axios.post(`${API_BASE_URL}/cases`, newcase);
};

export const fetchCaseSummary = async (caseId: string) => {
  return axios
    .get<CaseRecordsSummary | null>(
      `${API_BASE_URL}/casesummaries?caseId=${caseId}`,
    )
    .then((r): CaseSummaryWithParsedAggregate | null => {
      if (!r.data) {
        return null;
      }

      const parsedAggregate = storedCaseClinicalSummarySchema.safeParse(
        r.data.summary,
      );

      return {
        ...r.data,
        parsedAggregateSummary: parsedAggregate.success
          ? parsedAggregate.data
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

export const fetchPreExamAnalysis = async (caseId: string) => {
  return axios
    .get<StoredAnalysisResponse | null>(
      `${API_BASE_URL}/cases/${caseId}/pre-exam-analysis`,
    )
    .then((response): PreExamAnalysisWithParsedArtifact | null => {
      if (!response.data) {
        return null;
      }

      const parsedAnalysis = storedPreExamAnalysisSchema.safeParse(
        response.data.analysis,
      );

      return {
        ...response.data,
        parsedAnalysis: parsedAnalysis.success ? parsedAnalysis.data : null,
        analysisParseError: parsedAnalysis.success
          ? null
          : (parsedAnalysis.error.issues[0]?.message ??
            "Invalid pre-exam analysis payload"),
      };
    });
};

export const preExamAnalysisQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["preExamAnalysis", { caseId }],
    queryFn: () => fetchPreExamAnalysis(caseId),
  });

export const fetchRefinedAnalysis = async (caseId: string) => {
  return axios
    .get<StoredAnalysisResponse | null>(
      `${API_BASE_URL}/cases/${caseId}/refined-analysis`,
    )
    .then((response): RefinedAnalysisWithParsedArtifact | null => {
      if (!response.data) {
        return null;
      }

      const parsedAnalysis = storedRefinedAnalysisSchema.safeParse(
        response.data.analysis,
      );

      return {
        ...response.data,
        parsedAnalysis: parsedAnalysis.success ? parsedAnalysis.data : null,
        analysisParseError: parsedAnalysis.success
          ? null
          : (parsedAnalysis.error.issues[0]?.message ??
            "Invalid refined analysis payload"),
      };
    });
};

export const refinedAnalysisQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["refinedAnalysis", { caseId }],
    queryFn: () => fetchRefinedAnalysis(caseId),
  });

export const recordsQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["records", { caseId }],
    queryFn: () => fetchRecords(caseId),
  });

export const fetchCaseProviders = async (caseId: number) =>
  axios
    .get<CaseProvider[]>(`${API_BASE_URL}/cases/${caseId}/providers`)
    .then((response) => response.data);

export const caseProvidersQueryOptions = (caseId: number) =>
  queryOptions({
    queryKey: ["caseProviders", { caseId }],
    queryFn: () => fetchCaseProviders(caseId),
  });

export const createCaseProvider = async (
  caseId: number,
  input: CreateCaseProviderInput,
) =>
  axios
    .post<CaseProvider>(`${API_BASE_URL}/cases/${caseId}/providers`, input)
    .then((response) => response.data);

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
  payload: CompleteRecordUploadInput,
) => {
  return axios
    .post(`${API_BASE_URL}/uploads/complete`, payload)
    .then((r) => r.data);
};

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
      },
    )
    .then((r) => r.data);
};

export const fetchPatientQuestionnaireByToken = async (accessToken: string) => {
  return axios
    .get<PatientQuestionnaireWithCase>(
      `${API_BASE_URL}/questionnaires/${accessToken}`,
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
      { responses: payload.responses },
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
      record.summary,
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
