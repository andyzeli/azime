import type { PatientCase, Records } from "../db/schema.js";
import { getDocumentSourceName } from "../records/documentMetadata.js";
import {
  aggregateSummaryInputSchema,
  storedRecordSummarySchema,
} from "./schemas_old.js";

type AggregateInputRecord = Pick<
  Records,
  "id" | "name" | "providerName" | "documentType" | "metadata" | "summary"
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
    providerName:
      getDocumentSourceName(record.metadata) || record.providerName || "",
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
