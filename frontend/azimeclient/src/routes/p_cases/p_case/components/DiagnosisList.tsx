import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import type {
  CanonicalDiagnosis,
  DiagnosisState,
  Region,
  RegionDiagnosesResponse,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import {
  regionDiagnosesQueryOptions,
  saveRegionDiagnoses,
} from "../../../cases/queries";
import { Badge, Segmented } from "./shared";

export const diagnosisStatusLabel: Record<DiagnosisState["status"], string> = {
  working: "Working",
  supported: "Supported",
  not_supported: "Not supported",
};

export const diagnosisStatusTone: Record<DiagnosisState["status"], string> = {
  working: "bg-blue-100 text-blue-800",
  supported: "bg-green-100 text-green-700",
  not_supported: "bg-amber-100 text-amber-800",
};

const statusOptions = (
  Object.keys(diagnosisStatusLabel) as DiagnosisState["status"][]
).map((value) => ({
  value,
  label: diagnosisStatusLabel[value],
  activeClassName: diagnosisStatusTone[value],
}));

// The region's diagnosis list, editable before or after the exam. Every change saves.
// Excluding a diagnosis is a status, never a deletion; only added ones can be removed.
export function DiagnosisList({
  caseId,
  region,
  list,
  addable,
  dxLabel,
  icdCodes,
}: {
  caseId: string;
  region: Region;
  list: RegionDiagnosesResponse;
  addable: CanonicalDiagnosis[];
  dxLabel: (dx: string) => string;
  icdCodes: (dx: string) => string[];
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const save = useMutation({
    mutationFn: (diagnoses: DiagnosisState[]) =>
      saveRegionDiagnoses(caseId, region, {
        diagnoses,
        expectedRevision: list.revision,
      }),
    onSuccess: (saved) =>
      queryClient.setQueryData(
        regionDiagnosesQueryOptions(caseId, region).queryKey,
        saved
      ),
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: regionDiagnosesQueryOptions(caseId, region).queryKey,
      }),
  });
  const update = (dx: string, patch: Partial<DiagnosisState> | null) =>
    save.mutate(
      list.diagnoses.flatMap((d) =>
        d.canonicalDx !== dx ? [d] : patch ? [{ ...d, ...patch }] : []
      )
    );

  return (
    <div className="flex flex-col gap-1.5">
      {list.diagnoses.map((d) => {
        const codes = icdCodes(d.canonicalDx);
        const excluded = d.status === "not_supported";
        return (
          <div key={d.canonicalDx} className="flex items-center gap-2 text-[12.5px]">
            <span
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2",
                excluded && "text-slate-400 line-through decoration-slate-300"
              )}
            >
              {codes.length ? (
                <span title={codes.join(", ")} className="flex shrink-0">
                  <Badge className="max-w-[140px] truncate rounded bg-slate-100 text-slate-600">
                    {codes.join(", ")}
                  </Badge>
                </span>
              ) : null}
              <span className="truncate font-semibold">{dxLabel(d.canonicalDx)}</span>
              {d.source === "added" ? (
                <span className="text-[10.5px] font-semibold text-violet-700">added</span>
              ) : null}
            </span>
            {d.status !== "working" ? (
              <ReasonInput
                key={`${d.canonicalDx}:${d.reason ?? ""}`}
                value={d.reason}
                placeholder={
                  d.status === "supported" ? "Basis (optional)" : "Reason"
                }
                onSave={(reason) => update(d.canonicalDx, { reason })}
              />
            ) : null}
            <Segmented
              value={d.status}
              onChange={(status) =>
                status !== d.status && update(d.canonicalDx, { status })
              }
              options={statusOptions}
            />
            {d.source === "added" ? (
              <button
                type="button"
                title="Remove (added by mistake)"
                onClick={() => update(d.canonicalDx, null)}
                className="text-slate-400 hover:text-red-600"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <span className="w-3.5" />
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        {adding ? (
          <select
            autoFocus
            value=""
            onChange={(e) => {
              save.mutate([
                ...list.diagnoses,
                {
                  canonicalDx: e.target.value,
                  source: "added",
                  status: "working",
                  reason: null,
                },
              ]);
              setAdding(false);
            }}
            onBlur={() => setAdding(false)}
            className="rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-[12.5px]"
          >
            <option value="" disabled>
              Choose a diagnosis…
            </option>
            {addable.map((d) => (
              <option key={d.canonicalDx} value={d.canonicalDx}>
                {d.label}
                {d.icdPrefixes.length ? ` (${d.icdPrefixes.join(", ")})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            disabled={!addable.length || save.isPending}
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[12px] text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            <Plus className="size-3.5" /> add diagnosis
          </button>
        )}
        {save.isError ? (
          <span className="text-[11px] font-semibold text-red-700">
            {(save.error as { data?: { error?: string } })?.data?.error ??
              "Save failed"}
          </span>
        ) : save.isPending ? (
          <span className="text-[11px] text-slate-400">Saving…</span>
        ) : null}
      </div>
    </div>
  );
}

// Saves on blur so typing doesn't save every keystroke.
function ReasonInput({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  onSave: (reason: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => (draft.trim() || null) !== value && onSave(draft.trim() || null)}
      placeholder={placeholder}
      className="w-56 rounded-md border border-slate-300 px-2 py-1 text-[12px] outline-none focus:border-blue-400"
    />
  );
}
