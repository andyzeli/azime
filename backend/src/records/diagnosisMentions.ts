import type { NewDiagnosisMention, Records } from "../db/schema.js";
import {
  safeParseStoredExtraction,
  type StoredExtraction,
} from "@azime/contracts";

export function buildDiagnosisMentions(
  record: Pick<Records, "id" | "caseId" | "documentType" | "eventDate">,
  summary: unknown,
): NewDiagnosisMention[] {
  if (
    record.documentType !== "encounter" &&
    record.documentType !== "surgery_report"
  ) {
    return [];
  }

  const caseId = record.caseId;
  if (caseId === null) {
    throw new Error("Cannot project diagnosis mentions without a case id");
  }

  let diagnoses: StoredExtraction<"encounter">["diagnoses"];
  if (record.documentType === "encounter") {
    const extraction = safeParseStoredExtraction("encounter", summary);
    if (!extraction.success) {
      throw extraction.error;
    }
    diagnoses = extraction.data.diagnoses;
  } else {
    const extraction = safeParseStoredExtraction("surgery_report", summary);
    if (!extraction.success) {
      throw extraction.error;
    }
    diagnoses = [
      ...extraction.data.preOpDiagnoses,
      ...extraction.data.postOpDiagnoses,
    ];
  }

  return diagnoses.map((diagnosis) => ({
    caseId,
    recordId: record.id,
    name: diagnosis.name,
    icd: diagnosis.icd,
    region: diagnosis.region,
    canonicalDx: diagnosis.canonicalDx,
    evidencePage: diagnosis.evidence.page,
    evidenceQuote: diagnosis.evidence.quote,
    eventDate: record.eventDate,
  }));
}
