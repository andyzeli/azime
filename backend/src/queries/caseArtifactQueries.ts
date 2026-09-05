import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { storedCaseClinicalSummarySchema } from "../ai/clinicalSummarySchema.js";
import {
  safeParseStoredExtraction,
  type AnyStoredExtraction,
} from "../ai/gemini/registry.js";
import { db } from "../db/index.js";
import {
  CaseProviders,
  CaseRecordsSummary,
  PatientCase,
  Records,
} from "../db/schema.js";
import type { CaseSummaryProvider } from "../ai/clinicalSummaryPrompt.js";

export const caseArtifactTypeSchema = z.enum([
  "document-extractions",
  "case-summary",
]);

export type CaseArtifactType = z.infer<typeof caseArtifactTypeSchema>;

export type DocumentExtractionArtifact = {
  recordId: number;
  documentType: Records["documentType"];
  eventDate: string | null;
  metadata: Records["metadata"];
  provider: CaseSummaryProvider | null;
  extraction: AnyStoredExtraction;
};

export type CaseSummaryArtifact = {
  caseSummaryId: number;
  summary: z.infer<typeof storedCaseClinicalSummarySchema>;
};

export type CaseArtifactBundle = {
  documentExtractions: DocumentExtractionArtifact[];
  caseSummary: CaseSummaryArtifact | null;
};

export const caseExists = async (caseId: number) => {
  const patientCase = await db.query.PatientCase.findFirst({
    columns: { id: true },
    where: eq(PatientCase.id, caseId),
  });

  return patientCase !== undefined;
};

export const getDocumentExtractionArtifacts = async (
  caseId: number,
): Promise<DocumentExtractionArtifact[]> => {
  const records = await db
    .select({
      id: Records.id,
      documentType: Records.documentType,
      eventDate: Records.eventDate,
      metadata: Records.metadata,
      summary: Records.summary,
      provider: {
        id: CaseProviders.id,
        name: CaseProviders.name,
        kind: CaseProviders.kind,
        discipline: CaseProviders.discipline,
      },
    })
    .from(Records)
    .leftJoin(CaseProviders, eq(Records.providerId, CaseProviders.id))
    .where(
      and(
        eq(Records.caseId, caseId),
        eq(Records.summaryStatus, "completed"),
        isNotNull(Records.summary),
      ),
    )
    .orderBy(asc(Records.eventDate), asc(Records.id));

  return records.map((record) => {
    const extraction = safeParseStoredExtraction(
      record.documentType,
      record.summary,
    );

    if (!extraction.success) {
      throw new Error(`Stored extraction for record ${record.id} is invalid`);
    }

    return {
      recordId: record.id,
      documentType: record.documentType,
      eventDate: record.eventDate,
      metadata: record.metadata,
      provider: record.provider,
      extraction: extraction.data,
    };
  });
};

export const getCaseSummaryArtifact = async (
  caseId: number,
): Promise<CaseSummaryArtifact | null> => {
  const storedSummary = await db.query.CaseRecordsSummary.findFirst({
    where: eq(CaseRecordsSummary.caseId, caseId),
  });

  if (!storedSummary) {
    return null;
  }

  const summary = storedCaseClinicalSummarySchema.parse(storedSummary.summary);

  return {
    caseSummaryId: storedSummary.id,
    summary,
  };
};

export const getCaseArtifact = async (
  caseId: number,
  artifactType: CaseArtifactType,
) => {
  if (artifactType === "document-extractions") {
    return {
      artifactType,
      data: await getDocumentExtractionArtifacts(caseId),
    } as const;
  }

  return {
    artifactType,
    data: await getCaseSummaryArtifact(caseId),
  } as const;
};

export const getCaseArtifactBundle = async (
  caseId: number,
): Promise<CaseArtifactBundle> => {
  const [documentExtractions, caseSummary] = await Promise.all([
    getDocumentExtractionArtifacts(caseId),
    getCaseSummaryArtifact(caseId),
  ]);

  return { documentExtractions, caseSummary };
};
