import type { Region } from "@azime/contracts";
import {
  safeParseStoredExtraction,
  type StoredExtraction,
} from "@azime/contracts";
import type { DocumentType } from "@azime/contracts";
import {
  getDocumentExtractionArtifacts,
  type CaseArtifactProvider,
  type DocumentExtractionArtifact,
  type DocumentExtractionArtifacts,
} from "./caseArtifactQueries.js";

type TreatmentDocumentType =
  "therapy_note" | "encounter" | "intervention_report" | "surgery_report";

type ArtifactOfType<T extends DocumentType> = Omit<
  DocumentExtractionArtifact,
  "documentType" | "extraction"
> & {
  documentType: T;
  extraction: StoredExtraction<T>;
};

export type TreatmentEpisodeRecord<T extends TreatmentDocumentType> = {
  recordId: number;
  eventDate: string | null;
  extraction: StoredExtraction<T>;
};

type TreatmentEpisodeBase<
  TKind extends string,
  TDocumentType extends TreatmentDocumentType,
> = {
  id: string;
  kind: TKind;
  name: string;
  provider: Partial<CaseArtifactProvider> | null;
  documentCount: number;
  records: TreatmentEpisodeRecord<TDocumentType>[];
};

export type TherapyComponent =
  StoredExtraction<"therapy_note">["therapiesPerformed"][number]["type"];

export type TherapyEpisode = TreatmentEpisodeBase<"therapy", "therapy_note"> & {
  therapyComponents: TherapyComponent[];
};
export type ChiropracticEpisode = TreatmentEpisodeBase<
  "chiropractic",
  "encounter"
>;
export type InterventionEpisode = TreatmentEpisodeBase<
  "intervention",
  "intervention_report"
>;
export type SurgeryEpisode = TreatmentEpisodeBase<"surgery", "surgery_report">;

export type TreatmentEpisode =
  TherapyEpisode | ChiropracticEpisode | InterventionEpisode | SurgeryEpisode;

const ofType = <T extends TreatmentDocumentType>(
  artifacts: DocumentExtractionArtifacts,
  documentType: T,
): ArtifactOfType<T>[] =>
  artifacts.flatMap((artifact) => {
    if (artifact.documentType !== documentType) {
      return [];
    }

    const extraction = safeParseStoredExtraction(
      documentType,
      artifact.extraction,
    );

    if (!extraction.success) {
      throw new Error(
        `Stored extraction for record ${artifact.recordId} is invalid`,
      );
    }

    return [{ ...artifact, documentType, extraction: extraction.data }];
  });

const groupByProvider = <T extends DocumentType>(
  artifacts: ArtifactOfType<T>[],
) => {
  const groups = new Map<string, ArtifactOfType<T>[]>();

  for (const artifact of artifacts) {
    const providerKey = artifact.provider?.id ?? "unassigned";
    const group = groups.get(providerKey) ?? [];
    group.push(artifact);
    groups.set(providerKey, group);
  }

  return [...groups.values()];
};

const toEpisodeRecord = <T extends TreatmentDocumentType>(
  artifact: ArtifactOfType<T>,
): TreatmentEpisodeRecord<T> => ({
  recordId: artifact.recordId,
  eventDate: artifact.eventDate,
  extraction: artifact.extraction,
});

export const buildPhysicalTherapyEpisodes = (
  artifacts: DocumentExtractionArtifacts,
  region: Region,
): TherapyEpisode[] =>
  groupByProvider(ofType(artifacts, "therapy_note")).map((records) => {
    const applicable = records.filter((r) =>
      r.extraction.regions.includes(region),
    );
    const provider = applicable[0]?.provider ?? null;
    const firstRecordId = applicable[0].recordId;
    const therapyComponents = [
      ...new Set(
        applicable.flatMap((record) =>
          record.extraction.therapiesPerformed.map(({ type }) => type),
        ),
      ),
    ];
    return {
      id: `therapy:${provider?.id ?? "unassigned"}:${firstRecordId}`,
      kind: "therapy",
      name: provider?.discipline ?? "Therapy",
      provider: {
        name: provider?.name,
        kind: provider?.kind,
        discipline: provider?.discipline,
      },
      documentCount: records.length,
      therapyComponents,
      records: applicable.map(toEpisodeRecord),
    };
  });

export const buildChiropracticEpisodes = (
  artifacts: DocumentExtractionArtifacts,
  region: Region,
): ChiropracticEpisode[] =>
  groupByProvider(
    ofType(artifacts, "encounter").filter(
      (artifact) => artifact.provider?.discipline === "Chiropractic",
    ),
  ).map((records) => {
    const applicable = records.filter((r) =>
      r.extraction.regions.includes(region),
    );
    const provider = applicable[0]?.provider ?? null;
    const firstRecordId = applicable[0].recordId;
    return {
      id: `chiropractic:${provider?.id ?? "unassigned"}:${firstRecordId}`,
      kind: "chiropractic",
      name: "Chiropractic",
      //provider,
      provider: {
        name: provider?.name,
        kind: provider?.kind,
        discipline: provider?.discipline,
      },
      documentCount: records.length,
      records: applicable.map(toEpisodeRecord),
    };
  });

export const buildInterventionEpisodes = (
  artifacts: DocumentExtractionArtifacts,
  region: Region,
): InterventionEpisode[] =>
  ofType(artifacts, "intervention_report")
    .filter((record) => record.extraction.region === region)
    .map((record) => ({
      id: `intervention:${record.recordId}`,
      kind: "intervention",
      name: record.extraction.name,
      provider: {
        name: record.provider?.name,
        kind: record.provider?.kind,
        discipline: record.provider?.discipline,
      },
      documentCount: 1,
      records: [toEpisodeRecord(record)],
    }));

export const buildSurgeryEpisodes = (
  artifacts: DocumentExtractionArtifacts,
): SurgeryEpisode[] =>
  ofType(artifacts, "surgery_report").map((record) => ({
    id: `surgery:${record.recordId}`,
    kind: "surgery",
    name:
      record.extraction.proceduresPerformed
        .map(({ name, bodySite }) => `${name} ${bodySite}`.trim())
        .join("; ") || "Surgery",
    provider: {
      name: record.provider?.name,
      kind: record.provider?.kind,
      discipline: record.provider?.discipline,
    },
    documentCount: 1,
    records: [toEpisodeRecord(record)],
  }));

const firstEpisodeDate = (episode: TreatmentEpisode) =>
  episode.records[0]?.eventDate ?? "9999-12-31";

export const buildTreatmentEpisodes = (
  artifacts: DocumentExtractionArtifacts,
  region: Region,
): TreatmentEpisode[] =>
  [
    ...buildPhysicalTherapyEpisodes(artifacts, region),
    ...buildChiropracticEpisodes(artifacts, region),
    ...buildInterventionEpisodes(artifacts, region),
    ...buildSurgeryEpisodes(artifacts),
  ].sort(
    (left, right) =>
      firstEpisodeDate(left).localeCompare(firstEpisodeDate(right)) ||
      left.id.localeCompare(right.id),
  );

export const getTreatmentEpisodes = async (
  caseId: number,
  region: Region,
): Promise<TreatmentEpisode[]> =>
  buildTreatmentEpisodes(await getDocumentExtractionArtifacts(caseId), region);
