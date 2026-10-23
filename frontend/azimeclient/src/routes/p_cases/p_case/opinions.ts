import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  emptyRegionOpinions,
  type CaseOpinionsResponse,
  type Region,
  type RegionOpinions,
  type WorkOpinion,
} from "@azime/contracts";
import { caseOpinionsQueryOptions, saveCaseOpinions } from "../../cases/queries";

// One region's slice of the case opinions document. Saving writes the whole document
// (other regions unchanged) against the saved revision.
export function useRegionOpinions(
  caseId: string,
  region: Region,
  saved: CaseOpinionsResponse | null
) {
  const queryClient = useQueryClient();
  const opinions = saved?.opinions.regions[region] ?? emptyRegionOpinions();
  const mutation = useMutation({
    mutationFn: (regionOpinions: RegionOpinions) =>
      saveCaseOpinions(caseId, {
        opinions: {
          ...saved?.opinions,
          regions: { ...saved?.opinions.regions, [region]: regionOpinions },
        },
        expectedRevision: saved?.revision ?? 0,
      }),
    onSuccess: (response) =>
      queryClient.setQueryData(caseOpinionsQueryOptions(caseId).queryKey, response),
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: caseOpinionsQueryOptions(caseId).queryKey,
      }),
  });
  return {
    opinions,
    save: (patch: Partial<RegionOpinions>) => mutation.mutate({ ...opinions, ...patch }),
    failed: mutation.isError,
  };
}

// The case's work status recommendation; saved the same way, regions unchanged.
export function useWorkOpinion(caseId: string, saved: CaseOpinionsResponse | null) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (work: WorkOpinion | undefined) =>
      saveCaseOpinions(caseId, {
        opinions: { regions: saved?.opinions.regions ?? {}, work },
        expectedRevision: saved?.revision ?? 0,
      }),
    onSuccess: (response) =>
      queryClient.setQueryData(caseOpinionsQueryOptions(caseId).queryKey, response),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: caseOpinionsQueryOptions(caseId).queryKey }),
  });
  return { work: saved?.opinions.work, save: mutation.mutate, failed: mutation.isError };
}
