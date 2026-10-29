import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  remainingCareCandidates,
  type CareDisposition,
  type CaseOpinionsResponse,
  type PostExamInput,
  type Region,
  type RemainingCareCandidate,
  type RemainingCareDecision,
  type RemainingCareReason,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import { useRegionOpinions } from "../opinions";
import { SaveLabel } from "./SaveLabel";
import { Badge, Segmented } from "./shared";

const dispositionOptions: {
  value: CareDisposition;
  label: string;
  activeClassName: string;
}[] = [
  { value: "curative", label: "Curative", activeClassName: "bg-blue-600 text-white" },
  { value: "maintenance", label: "Maintenance", activeClassName: "bg-teal-600 text-white" },
  { value: "not_recommended", label: "Not recommended", activeClassName: "bg-slate-700 text-white" },
];

const reasonLabel: Record<RemainingCareReason, string> = {
  not_exhausted: "Not exhausted",
  exhaustion_unclear: "Exhaustion unclear",
  ongoing: "Exhausted, continuing",
};

// Remaining care for one region, from the reviewed treatments the latest pass 4 used.
// The physician gives each candidate a purpose; q1 and q2 follow from those choices.
// Every change saves; Not recommended saves once its reason is written.
export function RemainingCare({
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
  const candidates = remainingCareCandidates(input.reviewedTreatmentAnalysis);
  const decisions = opinions.remainingCare;
  const dxLabel = (dx: string) =>
    input.diagnoses.find((d) => d.canonicalDx === dx)?.label ?? dx;

  const decide = (rowId: string, decision: RemainingCareDecision | null) => {
    const { [rowId]: _current, ...rest } = decisions;
    save({ remainingCare: decision ? { ...rest, [rowId]: decision } : rest });
  };

  const chosen = candidates.flatMap(
    ({ treatment }) => decisions[treatment.id]?.disposition ?? []
  );
  const undecided = candidates.length - chosen.length;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[10.5px] font-bold tracking-[.05em] text-slate-500">
          REMAINING CARE
        </span>
        {candidates.length ? (
          <span className="text-[11px] text-slate-500">
            {undecided ? `${undecided} of ${candidates.length} undecided` : "all decided"}
          </span>
        ) : null}
        <span className="flex-1" />
        {candidates.length && !undecided ? (
          <span className="text-[11.5px] text-slate-600">
            Further treatment necessary: <b>{chosen.includes("curative") ? "Yes" : "No"}</b>
            {" · "}Maintenance care: <b>{chosen.includes("maintenance") ? "Yes" : "No"}</b>
          </span>
        ) : null}
      </div>

      {candidates.length ? (
        <ul className="grid gap-2">
          {candidates.map((candidate) => (
            <CandidateRow
              key={candidate.treatment.id}
              candidate={candidate}
              decision={decisions[candidate.treatment.id]}
              onDecide={(decision) => decide(candidate.treatment.id, decision)}
              dxLabel={dxLabel}
              failed={failed}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-slate-500">
          No candidates: every applicable treatment is exhausted and none is ongoing. Further
          treatment and maintenance care are not indicated.
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-slate-500">
        From the reviewed treatments this analysis used. To add a treatment,{" "}
        <Link
          to="/p_cases/$caseId/analysis"
          params={{ caseId }}
          search={{ region }}
          className="font-semibold text-blue-700 hover:underline"
        >
          add it in Analysis
        </Link>{" "}
        and re-run the post-exam analysis.
      </p>
    </div>
  );
}

function CandidateRow({
  candidate: { treatment, reason, rationale, applicable, unclear },
  decision,
  onDecide,
  dxLabel,
  failed,
}: {
  candidate: RemainingCareCandidate;
  decision: RemainingCareDecision | undefined;
  onDecide: (decision: RemainingCareDecision | null) => void;
  dxLabel: (dx: string) => string;
  failed: boolean;
}) {
  // Not recommended denies care, so it waits for a reason before saving.
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const savedNote = decision?.disposition === "not_recommended" ? decision.note : null;
  const note = noteDraft ?? savedNote;
  const disposition = noteDraft !== null ? "not_recommended" : decision?.disposition;
  const unsaved = !decision || (noteDraft !== null && noteDraft.trim() !== savedNote);

  // Clicking the active option clears it.
  const choose = (value: CareDisposition) => {
    setNoteDraft(null);
    if (value === disposition) onDecide(null);
    else if (value === "not_recommended") setNoteDraft("");
    else onDecide({ disposition: value });
  };
  const saveNote = () => {
    if (noteDraft === null) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    if (trimmed !== savedNote) onDecide({ disposition: "not_recommended", note: trimmed });
  };

  return (
    <li
      className={cn(
        "rounded-lg border px-3 py-2",
        unsaved ? "border-amber-300" : "border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold">{treatment.treatment}</span>
            {treatment.recordStatus === "Ongoing" ||
            treatment.recordStatus === "To Be Started" ? (
              <Badge className="bg-blue-50 text-blue-700">
                {treatment.recordStatus === "Ongoing" ? "Ongoing" : "Planned"}
              </Badge>
            ) : null}
            {treatment.source === "physician" ? (
              <Badge className="bg-violet-100 text-violet-700">added</Badge>
            ) : treatment.source === "ai" ? (
              <Badge className="bg-slate-100 text-slate-600">AI suggestion</Badge>
            ) : null}
          </div>
          {treatment.recordDetail ? (
            <div className="text-[11.5px] text-slate-500">{treatment.recordDetail}</div>
          ) : null}
          {/* Exhaustion is one judgment per treatment; applicability is per diagnosis. */}
          {reason ? (
            <div className="mt-1 text-[11.5px] text-slate-600">
              <b className="font-semibold text-slate-700">{reasonLabel[reason]}</b>
              {rationale ? ` — ${rationale}` : null}
            </div>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-1">
            {applicable.map((dx) => (
              <Badge key={dx} className="bg-green-50 text-green-700">
                ✓ {dxLabel(dx)}
              </Badge>
            ))}
            {unclear.map(({ canonicalDx }) => (
              <Badge key={canonicalDx} className="bg-amber-50 text-amber-700">
                ? {dxLabel(canonicalDx)}
              </Badge>
            ))}
          </div>
          {unclear.map(({ canonicalDx, rationale }) => (
            <div key={canonicalDx} className="mt-0.5 text-[11.5px] text-slate-600">
              <b className="font-semibold text-slate-700">
                Applicability unclear for {dxLabel(canonicalDx)}
              </b>
              {rationale ? ` — ${rationale}` : null}
            </div>
          ))}
        </div>
        <div className="shrink-0">
          <Segmented value={disposition} onChange={choose} options={dispositionOptions} />
        </div>
      </div>
      {note !== null ? (
        <textarea
          value={note}
          autoFocus={noteDraft === ""}
          onChange={(e) => setNoteDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            saveNote();
          }}
          placeholder="Required: why is this care not recommended?"
          className="mt-2 h-14 w-full resize-none rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px] outline-none focus:border-blue-400"
        />
      ) : null}
      <SaveLabel
        draft={noteDraft}
        saved={savedNote}
        focused={focused}
        failed={failed}
        required
      />
    </li>
  );
}
