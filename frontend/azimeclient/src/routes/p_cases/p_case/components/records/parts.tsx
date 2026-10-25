import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Quote, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared building blocks for the per-document-type extraction views.

export type Tone = "sky" | "violet" | "amber" | "emerald" | "purple" | "rose" | "slate";

const toneStyle: Record<Tone, { heading: string; rail: string; chip: string; callout: string }> = {
  sky: {
    heading: "text-sky-700",
    rail: "border-sky-100",
    chip: "bg-sky-50 text-sky-800 ring-sky-200",
    callout: "border-sky-300 bg-sky-50 text-sky-950",
  },
  violet: {
    heading: "text-violet-700",
    rail: "border-violet-100",
    chip: "bg-violet-50 text-violet-800 ring-violet-200",
    callout: "border-violet-300 bg-violet-50 text-violet-950",
  },
  amber: {
    heading: "text-amber-700",
    rail: "border-amber-100",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
    callout: "border-amber-300 bg-amber-50 text-amber-950",
  },
  emerald: {
    heading: "text-emerald-700",
    rail: "border-emerald-100",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    callout: "border-emerald-300 bg-emerald-50 text-emerald-950",
  },
  purple: {
    heading: "text-purple-700",
    rail: "border-purple-100",
    chip: "bg-purple-50 text-purple-800 ring-purple-200",
    callout: "border-purple-300 bg-purple-50 text-purple-950",
  },
  rose: {
    heading: "text-rose-700",
    rail: "border-rose-100",
    chip: "bg-rose-50 text-rose-800 ring-rose-200",
    callout: "border-rose-300 bg-rose-50 text-rose-950",
  },
  slate: {
    heading: "text-slate-600",
    rail: "border-slate-200",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
    callout: "border-slate-300 bg-slate-50 text-slate-900",
  },
};

export const has = (value: string | null | undefined): value is string =>
  !!value && value.trim() !== "";

// Some prompts ask for "None" rather than an empty string.
export const isNone = (value: string) => /^\s*(none|no complications)\.?\s*$/i.test(value);

const labelOverrides: Record<string, string> = {
  psychiatry_psychology: "Psychiatry / psychology",
  bone_scan: "Bone scan",
  not_applicable: "N/A",
};

// snake_case enum value → "Sentence case".
export const humanize = (value: string) =>
  labelOverrides[value] ??
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");

export function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone: Tone;
  children: ReactNode;
}) {
  const style = toneStyle[tone];
  return (
    <section>
      <h3
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider",
          style.heading
        )}
      >
        <Icon className="size-3.5" strokeWidth={2.4} />
        {title}
      </h3>
      <div className={cn("mt-2 space-y-3.5 border-l-2 pl-3", style.rail)}>{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[11.5px] font-semibold text-slate-500">{label}</div>
      {children}
    </div>
  );
}

// Extracted strings may contain Markdown (the prompts allow it).
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "space-y-1.5 text-[13px] leading-relaxed text-slate-800",
        "[&_h1]:text-[12.5px] [&_h1]:font-semibold [&_h2]:text-[12.5px] [&_h2]:font-semibold [&_h3]:text-[12.5px] [&_h3]:font-semibold [&_h4]:font-semibold",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5",
        className
      )}
    >
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

export function TextField({ label, text }: { label: string; text: string }) {
  if (!has(text)) return null;
  return (
    <Field label={label}>
      <Prose text={text} />
    </Field>
  );
}

export function Chip({
  tone = "slate",
  mono,
  className,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded px-1.5 py-px text-[10.5px] font-semibold ring-1 ring-inset",
        mono && "font-mono font-medium",
        toneStyle[tone].chip,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Callout({
  tone,
  label,
  children,
}: {
  tone: Tone;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-md border-l-[3px] px-3 py-2", toneStyle[tone].callout)}>
      <div className="text-[10.5px] font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

type Evidence = { page: number; quote: string };

// A list row with an optional source quote, revealed from its page chip.
export function EvidenceItem({
  evidence,
  children,
}: {
  evidence?: Evidence;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-1.5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {evidence ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            title={open ? "Hide source quote" : "Show source quote"}
            className={cn(
              "mt-px flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[10.5px] font-semibold transition-colors",
              open ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
            )}
          >
            <Quote className="size-2.5" strokeWidth={3} />
            p.{evidence.page}
          </button>
        ) : null}
      </div>
      {open && evidence ? (
        <blockquote className="mt-1.5 rounded-r border-l-2 border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[12px] italic leading-relaxed text-slate-600">
          “{evidence.quote}”
        </blockquote>
      ) : null}
    </li>
  );
}

export function ItemList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-slate-100">{children}</ul>;
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-4 text-[13px] text-slate-800 marker:text-slate-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// Secondary verbatim line, e.g. the order text as printed.
export function SourceText({ text }: { text: string }) {
  if (!has(text)) return null;
  return <div className="mt-0.5 text-[11.5px] italic text-slate-500">“{text}”</div>;
}

export const workStatusStyle = {
  full_duty: { label: "Full duty", tone: "emerald" },
  modified_duty: { label: "Modified duty", tone: "amber" },
  off_work: { label: "Off work", tone: "rose" },
  unknown: { label: "Status not stated", tone: "slate" },
} as const;

export function WorkStatusBlock({
  status,
  restrictions,
}: {
  status: keyof typeof workStatusStyle;
  restrictions: string[];
}) {
  const style = workStatusStyle[status];
  return (
    <div className="space-y-1.5">
      <Chip tone={style.tone} className="text-[11px]">
        {style.label}
      </Chip>
      {restrictions.length > 0 ? <Bullets items={restrictions} /> : null}
    </div>
  );
}

type Diagnosis = {
  evidence: Evidence;
  name: string;
  icd: string | null;
  region: string;
  canonicalDx: string;
};

export function DiagnosisItems({ diagnoses }: { diagnoses: Diagnosis[] }) {
  return (
    <ItemList>
      {diagnoses.map((dx, i) => (
        <EvidenceItem key={i} evidence={dx.evidence}>
          <div className="text-[13px] font-medium text-slate-900">{dx.name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {has(dx.icd) ? <Chip mono>{dx.icd}</Chip> : null}
            {dx.canonicalDx === "unresolved" ? (
              <Chip tone="amber">Unmapped</Chip>
            ) : (
              <Chip tone="amber">
                {humanize(dx.region)} · {humanize(dx.canonicalDx).toLowerCase()}
              </Chip>
            )}
          </div>
        </EvidenceItem>
      ))}
    </ItemList>
  );
}

export function TreatmentChips({
  treatment,
}: {
  treatment: { treatmentType: string; laterality: string; guidanceMethod: string };
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      <Chip tone="rose">{humanize(treatment.treatmentType)}</Chip>
      {treatment.laterality !== "unclear" && treatment.laterality !== "not_applicable" ? (
        <Chip>{humanize(treatment.laterality)}</Chip>
      ) : null}
      {treatment.guidanceMethod !== "unclear" && treatment.guidanceMethod !== "none" ? (
        <Chip>{humanize(treatment.guidanceMethod)} guided</Chip>
      ) : null}
    </div>
  );
}
