import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import {
  getProviderDisciplineLabel,
  storedCaseClinicalSummarySchema,
} from "@azime/contracts";
import {
  safeParseStoredExtraction,
  type AnyStoredExtraction,
} from "../ai/gemini/registry.js";
import { db } from "../db/index.js";
import { CaseProviders, PatientCase, Records } from "../db/schema.js";
import { getStoredCaseSummary } from "./caseSummaryQueries.js";

export const caseArtifactTypeSchema = z.enum([
  "document-extractions",
  "case-summary",
]);

export type CaseArtifactType = z.infer<typeof caseArtifactTypeSchema>;

export type CaseArtifactProvider = {
  id: string;
  name: string;
  kind: "individual" | "facility";
  discipline: string;
};

export type DocumentExtractionArtifact = {
  recordId: number;
  documentType: Records["documentType"];
  eventDate: string | null;
  documentMetadata: Records["metadata"];
  provider: CaseArtifactProvider | null;
  extraction: AnyStoredExtraction;
};

export type DocumentExtractionArtifacts = DocumentExtractionArtifact[];

export type CaseSummaryArtifact = {
  caseSummaryId: number;
  summary: z.infer<typeof storedCaseClinicalSummarySchema>;
};

export type CaseArtifactBundle = {
  documentExtractions: DocumentExtractionArtifacts;
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
): Promise<DocumentExtractionArtifacts> => {
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
      documentMetadata: record.metadata,
      provider: record.provider
        ? {
            ...record.provider,
            discipline: getProviderDisciplineLabel(record.provider.discipline),
          }
        : null,
      extraction: extraction.data,
    };
  });
};

export async function getCaseBaseData(
  caseId: number,
): Promise<Partial<PatientCase>> {
  const patientCase = await db.query.PatientCase.findFirst({
    columns: { dateOfInjury: true, injuryType: true, regions: true },
    where: eq(PatientCase.id, caseId),
  });
  if (!patientCase) {
    throw new Error(`Case ${caseId} was not found`);
  }

  return patientCase;
}

export const getCaseSummaryArtifact = async (
  caseId: number,
): Promise<CaseSummaryArtifact | null> => {
  const storedSummary = await getStoredCaseSummary(caseId);

  if (!storedSummary) {
    return null;
  }

  return {
    caseSummaryId: storedSummary.id,
    summary: storedSummary.summary,
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
