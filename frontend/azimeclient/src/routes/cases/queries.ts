import axios from "redaxios";
import { queryOptions } from "@tanstack/react-query";
import {
  CaseContacts,
  CaseRecordsSummary,
  NewCaseRecordsSummary,
  PatientQuestionnaireInstance,
  PatientCase,
  Records,
} from "../../../../../backend/src/db/schema";
import type {
  QuestionnaireDefinition,
  QuestionnaireType,
} from "../../../../../backend/src/questionnaires/definitions";
import type { CompleteRecordUploadInput } from "../../../../../backend/src/records/documentMetadata";
import {
  storedAggregateSummarySchema,
  type StoredAggregateSummary,
} from "../../../../../backend/src/gemini/aggregateSummarySchema";
import {
  storedRecordSummarySchema,
  type StoredRecordSummary,
} from "../../../../../backend/src/gemini/recordSummarySchema";
import { NewPatientCase } from "./case/components/NewCaseForm";
export class NotFoundError extends Error {}

export const AGGREGATE_SUMMARY_SECTION = "ai_aggregate_summary";

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

export type RecordWithParsedSummary = Records & {
  parsedSummary: StoredRecordSummary | null;
  summaryParseError: string | null;
};

export type CaseSummaryWithParsedAggregate = CaseRecordsSummary & {
  isAggregateSummary: boolean;
  parsedAggregateSummary: StoredAggregateSummary | null;
  aggregateSummaryParseError: string | null;
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
  return axios.get<any>(API_BASE_URL).then((r) => r.data);
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

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

export const fetchCaseSummaries = async (caseId: string) => {
  return axios
    .get<
      Array<CaseRecordsSummary>
    >(`${API_BASE_URL}/casesummaries?caseId=${caseId}`)
    .then((r) =>
      r.data.map<CaseSummaryWithParsedAggregate>((summary) => {
        if (summary.section !== AGGREGATE_SUMMARY_SECTION) {
          return {
            ...summary,
            isAggregateSummary: false,
            parsedAggregateSummary: null,
            aggregateSummaryParseError: null,
          };
        }

        try {
          const parsedJson = JSON.parse(summary.summary ?? "null") as unknown;
          const parsedAggregate =
            storedAggregateSummarySchema.safeParse(parsedJson);

          return {
            ...summary,
            isAggregateSummary: true,
            parsedAggregateSummary: parsedAggregate.success
              ? parsedAggregate.data
              : null,
            aggregateSummaryParseError: parsedAggregate.success
              ? null
              : parsedAggregate.error.issues[0]?.message ??
                "Invalid aggregate summary payload",
          };
        } catch {
          return {
            ...summary,
            isAggregateSummary: true,
            parsedAggregateSummary: null,
            aggregateSummaryParseError: "Aggregate summary is not valid JSON",
          };
        }
      }),
    );
};
export const createManualCaseSummary = async (
  caseSummary: NewCaseRecordsSummary,
) => {
  return axios.post(`${API_BASE_URL}/casesummaries`, caseSummary);
};
export const deleteManualCaseSummary = async (caseSummary: number) => {
  return axios.delete(`${API_BASE_URL}/casesummaries/${caseSummary}`);
};
export const caseSummaryQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["caseSummary", { caseId }],
    queryFn: () => fetchCaseSummaries(caseId),
  });

export const recordsQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["records", { caseId }],
    queryFn: () => fetchRecords(caseId),
  });

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
    .delete<{ recordId: number; deleted: boolean }>(
      `${API_BASE_URL}/records/${recordId}`,
    )
    .then((r) => r.data);
};
export const summarizeCase = async (caseId: number) => {
  return axios
    .post<{
      caseId: number;
      providerSummaryCount: number;
      aggregateSummary: StoredAggregateSummary;
      storage: {
        caseSummaryId: number | null;
        section: string;
      };
    }>(`${API_BASE_URL}/cases/${caseId}/aggregate-summary`)
    .then((r) => r.data);
};

export const fetchPatientQuestionnaires = async (caseId: string) => {
  return axios
    .get<Array<PatientQuestionnaireWithDefinition>>(
      `${API_BASE_URL}/cases/${caseId}/questionnaires`,
    )
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

export const patientQuestionnaireByTokenQueryOptions = (
  accessToken: string,
) =>
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
    .delete<{ questionnaireId: number; deleted: boolean }>(
      `${API_BASE_URL}/questionnaires/${questionnaireId}`,
    )
    .then((r) => r.data);
};

const fetchRecords = async (caseId: string) => {
  console.info(`Fetching case with id ${caseId}...`);
  //await new Promise((r) => setTimeout(r, 500));
  const post = await axios
    .get<Array<Records>>(`${API_BASE_URL}/records?caseId=${caseId}`)
    .then((r) => r.data);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!post) {
    throw new NotFoundError(`Post with id "${caseId}" not found!`);
  }

  return post.map<RecordWithParsedSummary>((record) => {
    const parsedSummary = storedRecordSummarySchema.safeParse(record.summary);

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
        : parsedSummary.error.issues[0]?.message ?? "Invalid summary payload",
    };
  });
};
