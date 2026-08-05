import type { DocumentType } from "../records/documentMetadata.js";

type ExtractionMetadata = {
  documentType: DocumentType;
  date: string | null;
  documentMetadata: Record<string, unknown> | null;
  source: string | null;
};

export function buildExtractionPrompt(metadata: ExtractionMetadata): string {
  return `Attached is a document of type ${metadata.documentType}.\n\n
  Extract the relevant information from the document and return it in JSON format according to the schema for ${metadata.documentType}.\n\n
  Human-supplied metadata:\n\n
  date: ${metadata.date ?? "N/A"}\n
  ${JSON.stringify(metadata.documentMetadata ?? {}, null, 2)}\n\n
  Use this metadata to orient the extraction, but verify clinical facts from
  the attached document itself.
  `;
}
