import { useQuery } from "@tanstack/react-query";
import {
  causationCheck,
  type CaseOpinionsResponse,
  type CausationOpinion,
  type PostExamInput,
  type Region,
} from "@azime/contracts";
import { pastMedicalHistoryQueryOptions } from "../../../cases/queries";
import { useRegionOpinions } from "../opinions";
import { NoteField } from "./NoteField";
import { Segmented } from "./shared";

const relationshipOptions: { value: CausationOpinion["relationship"]; label: string }[] = [
  { value: "caused", label: "Caused by the injury" },
  { value: "aggravated", label: "Pre-existing, aggravated" },
  { value: "preexisting_not_aggravated", label: "Pre-existing, not aggravated" },
  { value: "not_related", label: "Not related" },
];

const aggravationOptions: { value: NonNullable<CausationOpinion["aggravation"]>; label: string }[] = [
  { value: "temporary", label: "Temporary" },
  { value: "permanent", label: "Permanent" },
];

// The physician's causation opinion for each supported diagnosis, with the records'
// past medical history beside it. One answer covers causation, pre-existing conditions
// and aggravation; there is no numeric apportionment. Every change saves.
export function Causation({
  caseId,
  region,
  input,
  saved,
}: {
  caseId: string;
  region: Region;
  input: PostExamInput;
  saved: CaseOpinionsResponse | null;
}) {
  const { opinions, save, failed } = useRegionOpinions(caseId, region, saved);
  const { data: history } = useQuery(pastMedicalHistoryQueryOptions(caseId));
  const issues = causationCheck(opinions, input.diagnoses.map((d) => d.canonicalDx));

  const set = (dx: string, opinion: CausationOpinion | null) => {
    const { [dx]: _current, ...rest } = opinions.causation;
    save({ causation: opinion ? { ...rest, [dx]: opinion } : rest });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[10.5px] font-bold tracking-[.05em] text-slate-500">CAUSATION</span>
        <span className="flex-1" />
        {issues.length ? (
          <span className="text-[11.5px] font-semibold text-amber-700">{issues[0]}</span>
        ) : (
          <span className="text-[11.5px] text-slate-500">✓ complete</span>
        )}
      </div>
      <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
        <div className="mb-0.5 text-[11px] font-semibold text-slate-500">
          Past medical history in the records
        </div>
        {history?.length ? (
          <ul className="grid gap-0.5">
            {history.map((h) => (
              <li key={h.recordId}>
                {h.history}{" "}
                <span className="text-slate-500">
                  · {[h.date, h.providerName].filter(Boolean).join(", ") || "undated"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-slate-400">
            {history ? "None documented. Ask the patient and add it to the note's PMH." : "Loading…"}
          </span>
        )}
      </div>
      <div className="grid gap-2">
        {input.diagnoses.map((d) => {
          const opinion = opinions.causation[d.canonicalDx];
          return (
            <div key={d.canonicalDx} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="mb-1.5 text-[12.5px] font-semibold">{d.label}</div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Clicking the active answer clears it. */}
                <Segmented
                  value={opinion?.relationship}
                  onChange={(relationship) =>
                    set(
                      d.canonicalDx,
                      relationship === opinion?.relationship
                        ? null
                        : {
                            relationship,
                            aggravation: relationship === "aggravated" ? (opinion?.aggravation ?? null) : null,
                            note: opinion?.note ?? "",
                          }
                    )
                  }
                  options={relationshipOptions}
                />
                {opinion?.relationship === "aggravated" ? (
                  <Segmented
                    value={opinion.aggravation ?? undefined}
                    onChange={(aggravation) =>
                      set(d.canonicalDx, {
                        ...opinion,
                        aggravation: aggravation === opinion.aggravation ? null : aggravation,
                      })
                    }
                    options={aggravationOptions}
                  />
                ) : null}
              </div>
              {opinion ? (
                <div className="mt-1.5">
                  <NoteField
                    failed={failed}
                    value={opinion.note}
                    onSave={(note) => set(d.canonicalDx, { ...opinion, note })}
                    placeholder="Anything to add (optional)."
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
