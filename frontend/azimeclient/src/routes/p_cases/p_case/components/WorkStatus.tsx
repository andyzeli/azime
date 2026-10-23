import { useQuery } from "@tanstack/react-query";
import {
  workCheck,
  type CaseOpinionsResponse,
  type WorkOpinion,
} from "@azime/contracts";
import { caseSummaryCardQueryOptions } from "../../../cases/queries";
import { useWorkOpinion } from "../opinions";
import { NoteField } from "./NoteField";
import { Segmented } from "./shared";

const statusOptions: { value: WorkOpinion["status"]; label: string }[] = [
  { value: "full_duty", label: "Full duty" },
  { value: "modified_duty", label: "Modified duty" },
  { value: "off_work", label: "Off work" },
];

const durationOptions: { value: NonNullable<WorkOpinion["duration"]>; label: string }[] = [
  { value: "temporary", label: "Temporary" },
  { value: "permanent", label: "Permanent" },
];

// The physician's work status recommendation, once for the case. Modified duty starts
// from the most recent restrictions in the records. Every change saves.
export function WorkStatus({
  caseId,
  saved,
}: {
  caseId: string;
  saved: CaseOpinionsResponse | null;
}) {
  const { work, save, failed } = useWorkOpinion(caseId, saved);
  const { data: card } = useQuery(caseSummaryCardQueryOptions(caseId));
  const recordRestrictions = card?.currentWorkStatus?.restrictions ?? [];
  const issues = workCheck(work);

  const choose = (status: WorkOpinion["status"]) => {
    if (status === work?.status) return save(undefined);
    save({
      status,
      restrictions:
        status === "modified_duty"
          ? work?.restrictions.length
            ? work.restrictions
            : recordRestrictions
          : [],
      duration: status === "full_duty" ? null : (work?.duration ?? null),
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
        <h2 className="text-[13.5px] font-semibold">Work status recommendation</h2>
        <span className="text-[11px] text-slate-500">One for the case, across regions</span>
        <span className="flex-1" />
        {issues.length ? (
          <span className="text-[11.5px] font-semibold text-amber-700">{issues[0]}</span>
        ) : (
          <span className="text-[11.5px] text-slate-500">✓ complete</span>
        )}
      </div>
      <div className="grid gap-2.5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={work?.status} onChange={choose} options={statusOptions} />
          {work && work.status !== "full_duty" ? (
            <Segmented
              value={work.duration ?? undefined}
              onChange={(duration) =>
                save({ ...work, duration: duration === work.duration ? null : duration })
              }
              options={durationOptions}
            />
          ) : null}
        </div>
        {work?.status === "modified_duty" ? (
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-500">
              Restrictions, one per line
              {recordRestrictions.length ? " (started from the most recent in the records)" : ""}
            </div>
            <NoteField
              failed={failed}
              value={work.restrictions.join("\n")}
              onSave={(text) =>
                save({ ...work, restrictions: text.split("\n").map((r) => r.trim()).filter(Boolean) })
              }
              placeholder="e.g. No lifting over 20 pounds"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
