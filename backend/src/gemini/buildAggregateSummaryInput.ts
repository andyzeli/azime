import type { PatientCase, Records } from "../db/schema.js";
import {
  aggregateSummaryInputSchema,
  storedRecordSummarySchema,
} from "./schemas.js";

type AggregateInputRecord = Pick<
  Records,
  "id" | "name" | "providerName" | "documentType" | "summary"
>;

export const buildAggregateSummaryInput = ({
  patientCase,
  records,
}: {
  patientCase: PatientCase;
  records: AggregateInputRecord[];
}) => {
  const providerSummaries = records.map((record) => ({
    recordId: record.id,
    fileName: record.name ?? "",
    providerName: record.providerName ?? "",
    documentType: record.documentType ?? "",
    summary: storedRecordSummarySchema.parse(record.summary),
  }));

  return aggregateSummaryInputSchema.parse({
    case: {
      caseId: patientCase.id,
      patientName: patientCase.patientName ?? "",
      patientLastName: patientCase.patientLastName ?? "",
      caseType: patientCase.caseType ?? "",
      caseStatus: patientCase.caseStatus ?? "",
    },
    providerSummaries,
  });
};
