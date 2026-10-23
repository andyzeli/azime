import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  mmiCheck,
  remainingCareCandidates,
  type CaseOpinionsResponse,
  type MmiDecision as Mmi,
  type PostExamInput,
  type Region,
} from "@azime/contracts";
import { useRegionOpinions } from "../opinions";
import { AmaImpairment } from "./AmaImpairment";
import { fieldClassName, NoteField } from "./NoteField";
import { Badge, Segmented } from "./shared";

const statusOptions: {
  value: Mmi["status"];
  label: string;
  activeClassName: string;
}[] = [
  { value: "at_mmi", label: "At MMI", activeClassName: "bg-blue-600 text-white" },
  { value: "not_at_mmi", label: "Not at MMI", activeClassName: "bg-slate-700 text-white" },
];

const unitOptions = [
  { value: "weeks" as const, label: "weeks" },
  { value: "months" as const, label: "months" },
];


// The region's MMI opinion. It follows from remaining care: curative care rules out
// At MMI, and is cited as the reason when not at MMI. Every change saves.
export function MmiDecision({
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
  const { careDecided, curative, issues } = mmiCheck(opinions, candidates);
  const mmi = opinions.mmi;
  const examDate = input.visit.examinationDate;
  // At MMI was refused because care is marked curative.
  const [refused, setRefused] = useState(false);

  // Clicking the active option clears it.
  const choose = (status: Mmi["status"]) => {
    setRefused(false);
    if (status === mmi?.status) save({ mmi: undefined });
    else if (status === "at_mmi") {
      if (curative.length) setRefused(true);
      else save({ mmi: { status, date: examDate, note: mmi?.note ?? "" } });
    } else save({ mmi: { status, note: mmi?.note ?? "", reevaluateIn: null } });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[10.5px] font-bold tracking-[.05em] text-slate-500">
          MAXIMUM MEDICAL IMPROVEMENT
        </span>
        <span className="flex-1" />
        {careDecided && mmi ? (
          issues.length ? (
            <span className="text-[11.5px] font-semibold text-amber-700">{issues[0]}</span>
          ) : (
            <span className="text-[11.5px] text-slate-500">✓ complete</span>
          )
        ) : null}
      </div>
      {/* One opinion covers every supported diagnosis in the region. */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500">
        For
        {input.diagnoses.map((d) => (
          <Badge key={d.canonicalDx} className="bg-slate-100 text-slate-700">
            {d.label}
          </Badge>
        ))}
      </div>

      {!careDecided ? (
        <p className="text-[12px] text-slate-500">
          Decide every remaining-care row first. MMI follows from it.
        </p>
      ) : (
        <div className="grid gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
          <div>
            <Segmented value={mmi?.status} onChange={choose} options={statusOptions} />
          </div>

          {refused || (mmi?.status === "at_mmi" && curative.length) ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-900">
              <b>Not at MMI while care is curative.</b> MMI is the point at which a condition
              has stabilized and is unlikely to change substantially in the next year, with or
              without treatment. These are marked curative, meaning still expected to improve
              the condition:{" "}
              <b>{curative.map((c) => c.treatment.treatment).join(", ")}</b>. Mark them
              maintenance or not recommended above, or{" "}
              <Link
                to="/p_cases/$caseId/analysis"
                params={{ caseId }}
                search={{ region }}
                className="font-semibold underline"
              >
                revisit the treatment analysis
              </Link>
              .
            </div>
          ) : null}

          {mmi?.status === "at_mmi" ? (
            <>
              <label className="flex items-center gap-2 text-[12px] text-slate-700">
                MMI date
                <input
                  type="date"
                  value={mmi.date}
                  max={examDate}
                  onChange={(e) => e.target.value && save({ mmi: { ...mmi, date: e.target.value } })}
                  className={fieldClassName}
                />
                <span className="text-[11px] text-slate-500">
                  {mmi.date === examDate ? "exam date" : `exam was ${examDate}`}
                </span>
              </label>
              <NoteField
                failed={failed}
                value={mmi.note}
                onSave={(note) => save({ mmi: { ...mmi, note } })}
                placeholder="Anything to add (optional). The rationale is drawn from the plateau evidence and remaining care."
              />
              <AmaImpairment caseId={caseId} region={region} />
            </>
          ) : null}

          {mmi?.status === "not_at_mmi" ? (
            <>
              {curative.length ? (
                <div className="text-[12px] text-slate-700">
                  Cited as reasons, curative care still expected to help:{" "}
                  <b>{curative.map((c) => c.treatment.treatment).join(", ")}</b>
                </div>
              ) : null}
              <NoteField
                failed={failed}
                value={mmi.note}
                onSave={(note) => save({ mmi: { ...mmi, note } })}
                placeholder={
                  curative.length
                    ? "Anything else: healing time, diagnostics you want, other reasons (optional)."
                    : "Required: no curative care is marked. What is still expected to change? Healing time, diagnostics you want, other reasons."
                }
              />
              <ReevaluateIn
                value={mmi.reevaluateIn}
                onSave={(reevaluateIn) => save({ mmi: { ...mmi, reevaluateIn } })}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

type Reevaluate = Extract<Mmi, { status: "not_at_mmi" }>["reevaluateIn"];

function ReevaluateIn({
  value,
  onSave,
}: {
  value: Reevaluate;
  onSave: (value: Reevaluate) => void;
}) {
  const [amount, setAmount] = useState<string | null>(null);
  const [unit, setUnit] = useState(value?.unit ?? "weeks");
  const saveAmount = () => {
    if (amount === null) return;
    const parsed = Number.parseInt(amount, 10);
    const next = parsed > 0 ? { amount: parsed, unit } : null;
    if (next?.amount !== value?.amount) onSave(next);
  };
  return (
    <div className="flex items-center gap-2 text-[12px] text-slate-700">
      Re-evaluate in
      <input
        type="number"
        min={1}
        value={amount ?? value?.amount ?? ""}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={saveAmount}
        className={`w-16 ${fieldClassName}`}
      />
      <Segmented
        value={unit}
        onChange={(next) => {
          setUnit(next);
          if (value) onSave({ ...value, unit: next });
        }}
        options={unitOptions}
      />
    </div>
  );
}
