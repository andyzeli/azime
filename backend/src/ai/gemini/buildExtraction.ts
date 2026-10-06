import type { DocumentType } from "../../records/documentMetadata.js";
import type { DiagnosisExtractionContext } from "./registry.js";

type ExtractionMetadata = {
  documentType: DocumentType;
  date: string | null;
  documentMetadata: Record<string, unknown> | null;
  source?: string | null;
  diagnosisContext?: DiagnosisExtractionContext;
  caseRegions?: string[];
};

export function buildExtractionPrompt(metadata: ExtractionMetadata): string {
  const regionInstructions = metadata.caseRegions
    ? `\n\nAllowed case regions: ${JSON.stringify(metadata.caseRegions)}. Map only anatomical sites explicitly documented as treated or addressed by therapy. Use \"other_body_part\" for a known site outside these regions and \"unclear\" when the region cannot be determined. Do not force an out-of-scope site into a case region.`
    : "";
  const diagnosisInstructions = metadata.diagnosisContext
    ? `\n\nCanonical diagnosis taxonomy for this case's regions:\n${JSON.stringify(
        metadata.diagnosisContext.canonicalDiagnoses,
        null,
        2,
      )}\n\nFor every explicitly documented diagnosis, preserve its stated name and ICD code, then select the single best canonicalDx label from the allowed schema values. Use \"unresolved\" when none of the supplied canonical diagnoses applies. Do not infer an unstated diagnosis or force an unrelated mapping.`
    : "";

  return `Attached is a document of type ${metadata.documentType}.\n\n
  Extract the relevant information from the document and return it in JSON format according to the schema for ${metadata.documentType}.\n\n
  Human-supplied metadata:\n\n
  date: ${metadata.date ?? "N/A"}\n
  ${JSON.stringify(metadata.documentMetadata ?? {}, null, 2)}\n\n
  Use this metadata to orient the extraction, but verify clinical facts from
  the attached document itself.${regionInstructions}${diagnosisInstructions}
  `;
}
