import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";

const DEBOUNCE_MS = 800;
const samePath = (a: string, b: string) => a.replace(/\/$/, "") === b.replace(/\/$/, "");

export type AutosaveStatus =
  | { kind: "unsaved" } // nothing saved yet and nothing edited
  | { kind: "saving" } // edited, waiting for the debounce or the request
  | { kind: "saved" }
  | { kind: "error"; error: unknown };

// A document saved 800 ms after the last edit. One request at a time: edits made during
// a save are sent afterwards with the revision that save returned. Leaving the route
// waits for the save; if it fails the physician can stay or discard. Once leaving is
// approved the form ignores edits. `save` returns the new revision.
export function useAutosave<T>({
  initial,
  revision,
  saved,
  save,
  label,
}: {
  initial: T;
  revision: number;
  saved: boolean;
  save: (value: T, expectedRevision: number) => Promise<number>;
  label: string; // e.g. "the visit", in the leave-anyway prompt
}) {
  const [draft, setDraft] = useState(initial);
  const [status, setStatus] = useState<AutosaveStatus>({
    kind: saved ? "saved" : "unsaved",
  });
  // Refs so the save loop and the blocker always see the latest values.
  const draftRef = useRef(draft);
  const savedRef = useRef(draft);
  const revisionRef = useRef(revision);
  const saveRef = useRef(save);
  saveRef.current = save;
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
      const value = draftRef.current;
      setStatus({ kind: "saving" });
      try {
        revisionRef.current = await saveRef.current(value, revisionRef.current);
        savedRef.current = value;
      } catch (error) {
        setStatus({ kind: "error", error });
        return false;
      }
    }
    setStatus({ kind: "saved" });
    return true;
  }, []);

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

  const edit = (fn: (d: T) => T) => {
    if (leaving.current) return;
    draftRef.current = fn(draftRef.current);
    setDraft(draftRef.current);
    setStatus({ kind: "saving" });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useBlocker({
    // Search changes (the record drawer, report views) stay on the route, so autosave
    // carries on.
    shouldBlockFn: async ({ current, next }) => {
      if (samePath(next.pathname, current.pathname)) return false;
      // Back here before the last navigation finished: this form is kept.
      if (samePath(next.pathname, home)) {
        leaving.current = false;
        return false;
      }
      if (leaving.current) return false;
      const leave =
        (await flush()) ||
        window.confirm(
          `Couldn't save ${label}. Leave anyway and lose the unsaved changes?`
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
    flush, // resolves true once everything is saved
    dirty: draft !== savedRef.current,
  };
}
