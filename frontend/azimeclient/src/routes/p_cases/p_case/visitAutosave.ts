import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import type {
  VisitDocumentation,
  VisitDocumentationResponse,
} from "@azime/contracts";
import { saveVisit, visitQueryOptions } from "../../cases/queries";

const DEBOUNCE_MS = 800;
const samePath = (a: string, b: string) => a.replace(/\/$/, "") === b.replace(/\/$/, "");

export type AutosaveStatus =
  | { kind: "unsaved" } // no visit saved yet and nothing edited
  | { kind: "saving" } // edited, waiting for the debounce or the request
  | { kind: "saved" }
  | { kind: "error"; error: unknown };

// The visit draft, saved 800 ms after the last edit. One request at a time: edits made
// during a save are sent afterwards with the revision that save returned. Leaving the
// visit route waits for the save; if it fails the physician can stay or discard. Once
// leaving is approved the form ignores edits.
export function useVisitAutosave(
  caseId: string,
  visit: VisitDocumentationResponse | null,
  initial: () => VisitDocumentation
) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => visit?.documentation ?? initial());
  const [status, setStatus] = useState<AutosaveStatus>({
    kind: visit ? "saved" : "unsaved",
  });
  // Refs so the save loop and the blocker always see the latest values.
  const draftRef = useRef(draft);
  const savedRef = useRef(draft);
  const revisionRef = useRef(visit?.revision ?? 0);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  // Set once leaving is approved (saved, or discarded): the form stays on screen while
  // the next route loads, and nothing more is edited or saved unless we come back.
  const leaving = useRef(false);
  const [home] = useState(() => window.location.pathname);

  const isDirty = () => draftRef.current !== savedRef.current;

  // Saves until the saved draft is the latest one; false if a save fails.
  const run = useCallback(async () => {
    while (isDirty()) {
      const documentation = draftRef.current;
      setStatus({ kind: "saving" });
      try {
        const saved = await saveVisit(caseId, {
          documentation,
          expectedRevision: revisionRef.current,
        });
        revisionRef.current = saved.revision;
        savedRef.current = documentation;
        queryClient.setQueryData(visitQueryOptions(caseId).queryKey, saved);
      } catch (error) {
        setStatus({ kind: "error", error });
        return false;
      }
    }
    setStatus({ kind: "saved" });
    return true;
  }, [caseId, queryClient]);

  // Saves now (or joins the save in progress) and resolves once everything is saved.
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (leaving.current) return Promise.resolve(true);
    if (!inFlight.current) {
      if (!isDirty()) return Promise.resolve(true);
      inFlight.current = run().finally(() => {
        inFlight.current = null;
      });
    }
    return inFlight.current;
  }, [run]);

  const edit = (fn: (d: VisitDocumentation) => VisitDocumentation) => {
    if (leaving.current) return;
    draftRef.current = fn(draftRef.current);
    setDraft(draftRef.current);
    setStatus({ kind: "saving" });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useBlocker({
    // Search changes (the record drawer) stay on the visit, so autosave carries on.
    shouldBlockFn: async ({ current, next }) => {
      if (samePath(next.pathname, current.pathname)) return false;
      // Back to the visit before the last navigation finished: this form is kept.
      if (samePath(next.pathname, home)) {
        leaving.current = false;
        return false;
      }
      if (leaving.current) return false;
      const leave =
        (await flush()) ||
        window.confirm(
          "Couldn't save the visit. Leave anyway and lose the unsaved changes?"
        );
      if (leave) {
        leaving.current = true;
        clearTimeout(timer.current);
      }
      return !leave;
    },
    enableBeforeUnload: () => isDirty() || inFlight.current !== null,
  });

  return {
    draft,
    edit,
    status,
    retry: () => void flush(),
    dirty: draft !== savedRef.current,
  };
}
