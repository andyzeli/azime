import type { DocumentExtractionArtifacts } from "../queries/caseArtifactQueries.js";
import { makeProviderSummary } from "./makeProviderSummary.js";
import type { ProviderSummaryInput } from "./providerSummaryPrompt.js";
import {
  storedProviderSummariesSchema,
  type ProviderSummary,
  type StoredProviderSummaries,
} from "@azime/contracts";

const getConcurrency = () => {
  const concurrency = Number(process.env.PROVIDER_SUMMARY_CONCURRENCY ?? 4);

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("PROVIDER_SUMMARY_CONCURRENCY must be a positive integer");
  }

  return concurrency;
};

export const groupDocumentExtractionArtifactsByProvider = (
  input: DocumentExtractionArtifacts
): ProviderSummaryInput[] => {
  const groups = new Map<string, ProviderSummaryInput>();

  for (const record of input) {
    if (!record.provider) {
      continue;
    }

    const existingGroup = groups.get(record.provider.id);

    if (existingGroup) {
      existingGroup.records.push(record);
    } else {
      groups.set(record.provider.id, {
        providerName: record.provider.name,
        providerDiscipline: record.provider.discipline,
        records: [record],
      });
    }
  }

  return [...groups.values()].sort((left, right) =>
    left.providerName.localeCompare(right.providerName)
  );
};

export const makeProviderSummaries = async (
  input: DocumentExtractionArtifacts
): Promise<StoredProviderSummaries> => {
  const providerGroups = groupDocumentExtractionArtifactsByProvider(input);
  const concurrency = getConcurrency();
  const providerSummaries: ProviderSummary[] = [];

  for (let index = 0; index < providerGroups.length; index += concurrency) {
    const batch = providerGroups.slice(index, index + concurrency);
    providerSummaries.push(
      ...(await Promise.all(batch.map(makeProviderSummary)))
    );
  }

  return storedProviderSummariesSchema.parse({
    schemaVersion: "v1",
    providerSummaries,
  });
};
