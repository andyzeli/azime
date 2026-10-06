import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Briefcase,
  FileText,
  ScanLine,
  Stethoscope,
  Syringe,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventKind } from "../recordPresentation";

const eventStyle: Record<
  EventKind,
  { icon: typeof Activity; className: string }
> = {
  incident: { icon: TriangleAlert, className: "bg-amber-700" },
  visit: { icon: Stethoscope, className: "bg-sky-700" },
  imaging: { icon: ScanLine, className: "bg-purple-700" },
  therapy: { icon: Activity, className: "bg-green-700" },
  injection: { icon: Syringe, className: "bg-red-700" },
  work: { icon: Briefcase, className: "bg-yellow-700" },
  surgery: { icon: Activity, className: "bg-pink-700" },
  procedure: { icon: Activity, className: "bg-red-700" },
  document: { icon: FileText, className: "bg-slate-600" },
};

export function EventDot({
  kind,
  className,
}: {
  kind: EventKind;
  className?: string;
}) {
  const { icon: Icon, className: color } = eventStyle[kind];
  return (
    <div
      className={cn(
        "z-10 grid size-7 shrink-0 place-items-center rounded-full text-white ring-[3px] ring-white",
        color,
        className
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.4} />
    </div>
  );
}

// A record citation. Opens the record drawer by setting ?record= on the current route.
export function Cite({
  recordId,
  children,
}: {
  recordId?: string;
  children: ReactNode;
}) {
  if (!recordId) return <>{children}</>;
  return (
    <Link
      to="."
      search={(prev) => ({ ...prev, record: recordId })}
      className="whitespace-nowrap border-b border-dotted border-blue-600 text-blue-600 hover:border-solid"
    >
      {children}
    </Link>
  );
}

export function CiteText({
  parts,
}: {
  parts: { text: string; recordId?: string }[];
}) {
  return (
    <>
      {parts.map((part, i) =>
        part.recordId ? (
          <Cite key={i} recordId={part.recordId}>
            {part.text}
          </Cite>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Btn({
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: { value: T; label: ReactNode; activeClassName?: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white font-semibold">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "border-l border-slate-300 text-slate-600 first:border-l-0",
            size === "sm"
              ? "px-2.5 py-1 text-[11.5px]"
              : "px-3.5 py-1.5 text-[12.5px]",
            option.value === value &&
              (option.activeClassName ?? "bg-slate-900 text-white")
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
