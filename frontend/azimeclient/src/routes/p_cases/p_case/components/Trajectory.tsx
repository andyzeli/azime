import {
  Activity,
  CircleHelp,
  MoveRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { StoredRefinedAnalysis } from "@azime/contracts";
import { cn } from "@/lib/utils";

// The pre-exam and post-exam analyses share one trajectory schema.
type Trajectory = StoredRefinedAnalysis["trajectoryAnalysis"]["subjectiveTrajectory"];

const direction: Record<
  Trajectory["direction"],
  { icon: typeof Activity; className: string }
> = {
  Improving: { icon: TrendingUp, className: "bg-green-50 text-green-700" },
  Stable: { icon: MoveRight, className: "bg-slate-100 text-slate-700" },
  Worsening: { icon: TrendingDown, className: "bg-red-50 text-red-700" },
  Fluctuating: { icon: Activity, className: "bg-amber-50 text-amber-700" },
  "Insufficient Data": {
    icon: CircleHelp,
    className: "bg-slate-50 text-slate-500",
  },
};

// Bars for the ordinal levels; "Conflicting" isn't a level, so it gets its own treatment.
const evidenceBars: Record<Trajectory["evidenceQuality"], number> = {
  Strong: 3,
  Moderate: 2,
  Sparse: 1,
  Absent: 0,
  Conflicting: 0,
};

// Direction pill + evidence-quality bars, shared by the prep sheet and Opinions.
// The prep-* classes are hooks for the prep sheet's print CSS.
export function TrajectoryBadges({ t }: { t: Trajectory }) {
  const { icon: Icon, className } = direction[t.direction];
  const conflicting = t.evidenceQuality === "Conflicting";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span
        className={cn(
          "prep-direction flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold",
          className
        )}
      >
        <Icon className="size-4" strokeWidth={2.4} />
        {t.direction}
      </span>
      <span
        className="prep-evidence flex items-center gap-1.5 text-[11px] text-slate-500"
        title="Evidence quality"
      >
        <span className="prep-evidence-bars flex items-end gap-[2px]">
          {[1, 2, 3].map((level) => (
            <span
              key={level}
              className={cn(
                "w-1 rounded-sm",
                level === 1 ? "h-1.5" : level === 2 ? "h-2.5" : "h-3.5",
                conflicting
                  ? "bg-amber-400"
                  : level <= evidenceBars[t.evidenceQuality]
                    ? "bg-slate-700"
                    : "bg-slate-200"
              )}
            />
          ))}
        </span>
        <span className={cn(conflicting && "font-semibold text-amber-700")}>
          {t.evidenceQuality}
        </span>
      </span>
    </div>
  );
}
