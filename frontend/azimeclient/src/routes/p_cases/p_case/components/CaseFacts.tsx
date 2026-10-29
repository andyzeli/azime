import { useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  MapPin,
  MessageCircleQuestion,
} from "lucide-react";
import { supportedRegions } from "@azime/contracts";
import { cn } from "@/lib/utils";
import type { DbPatientCase } from "../../../cases/queries";
import { AmaModeBadge } from "./AmaExamTasks";

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// Whole months since the injury, e.g. "10 mo" or "1 yr 4 mo".
function sinceInjury(date: string) {
  const injury = new Date(`${date}T00:00:00`);
  const now = new Date();
  let months =
    (now.getFullYear() - injury.getFullYear()) * 12 +
    now.getMonth() -
    injury.getMonth();
  if (now.getDate() < injury.getDate()) months -= 1;
  if (months < 1) return "< 1 mo";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} yr` : "", rest ? `${rest} mo` : ""]
    .filter(Boolean)
    .join(" ");
}

function Fact({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <span
      className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-slate-700"
      title={title}
    >
      <span className="text-slate-400">{icon}</span>
      {children}
    </span>
  );
}

// Case facts the physician needs on every tab, beside the patient name.
export function CaseFacts({ patientCase }: { patientCase: DbPatientCase }) {
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const questions = patientCase.referralQuestions;
  const contact = patientCase.caseContact;

  return (
    <div className="flex min-w-0 items-center gap-4 overflow-hidden border-l border-slate-200 pl-4">
      <Fact icon={<CalendarDays className="size-3.5" />} title="Date of injury">
        {patientCase.dateOfInjury ? (
          <>
            <span className="font-medium">
              {formatDate(patientCase.dateOfInjury)}
            </span>
            <span className="text-slate-400">
              · {sinceInjury(patientCase.dateOfInjury)}
            </span>
          </>
        ) : (
          <span className="text-slate-400">DOI not set</span>
        )}
      </Fact>

      {patientCase.regions.length ? (
        <span className="hidden min-[1200px]:inline-flex">
          <Fact icon={<MapPin className="size-3.5" />} title="Body regions">
            {patientCase.regions
              .map(
                (region) =>
                  supportedRegions.find(({ value }) => value === region)
                    ?.label ?? region,
              )
              .join(", ")}
          </Fact>
        </span>
      ) : null}

      <AmaModeBadge mode={patientCase.amaMode} />

      {contact?.name ? (
        <span className="hidden xl:inline-flex">
          <Fact
            icon={<Building2 className="size-3.5" />}
            title="Referral source"
          >
            {contact.name}
            {contact.type ? (
              <span className="text-slate-400">· {contact.type}</span>
            ) : null}
          </Fact>
        </span>
      ) : null}

      {questions.length ? (
        <span className="relative">
          <button
            type="button"
            onClick={() => setQuestionsOpen(!questionsOpen)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium",
              questionsOpen
                ? "bg-slate-100 text-slate-900"
                : "text-slate-700 hover:bg-slate-100",
            )}
          >
            <MessageCircleQuestion className="size-3.5 text-slate-400" />
            {questions.length} referral question
            {questions.length === 1 ? "" : "s"}
            <ChevronDown
              className={cn(
                "size-3 text-slate-400 transition-transform",
                questionsOpen && "rotate-180",
              )}
            />
          </button>
          {questionsOpen ? (
            <>
              <button
                type="button"
                aria-label="Close referral questions"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setQuestionsOpen(false)}
              />
              <div className="absolute left-0 top-full z-30 mt-2 w-[420px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Referral questions
                </div>
                <ol className="space-y-1.5">
                  {questions.map((question, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[12.5px] leading-relaxed text-slate-800"
                    >
                      <span className="w-4 shrink-0 text-right font-semibold text-slate-400">
                        {i + 1}.
                      </span>
                      {question}
                    </li>
                  ))}
                </ol>
                <p className="mt-2.5 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                  The report answers each one in its addendum.
                </p>
              </div>
            </>
          ) : null}
        </span>
      ) : (
        <Fact
          icon={<MessageCircleQuestion className="size-3.5" />}
          title="Entered on the Case Intake page"
        >
          <span className="text-slate-400">No referral questions</span>
        </Fact>
      )}
    </div>
  );
}
