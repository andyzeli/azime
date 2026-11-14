import { useQueryClient } from "@tanstack/react-query";
import type {
  VisitDocumentation,
  VisitDocumentationResponse,
} from "@azime/contracts";
import {
  reportInputQueryOptions,
  saveVisit,
  visitQueryOptions,
} from "../../cases/queries";
import { useAutosave } from "./autosave";

// The visit draft, autosaved (see useAutosave).
export function useVisitAutosave(
  caseId: string,
  visit: VisitDocumentationResponse | null,
  initial: () => VisitDocumentation
) {
  const queryClient = useQueryClient();
  return useAutosave({
    initial: visit?.documentation ?? initial(),
    revision: visit?.revision ?? 0,
    saved: !!visit,
    label: "the visit",
    save: async (documentation, expectedRevision) => {
      const saved = await saveVisit(caseId, { documentation, expectedRevision });
      queryClient.setQueryData(visitQueryOptions(caseId).queryKey, saved);
      // A visit edit can make the post-exam analysis out of date: refresh the tab badges.
      void queryClient.invalidateQueries({
        queryKey: reportInputQueryOptions(caseId).queryKey,
      });
      return saved.revision;
    },
  });
}
