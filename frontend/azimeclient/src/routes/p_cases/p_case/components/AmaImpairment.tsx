import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  type AmaNotRatedReason,
  type AmaZeroReason,
  type AmaRegionRating,
  type Region,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import {
  amaRatingQueryOptions,
  canonicalDiagnosesQueryOptions,
  caseQueryOptions,
} from "../../../cases/queries";

const notRatedLabel: Record<AmaNotRatedReason, string> = {
  unlinked: "Not rated: not linked to a diagnosis",
  diagnosis_not_supported: "Not rated: diagnosis not supported",
};

const zeroLabel: Record<AmaZeroReason, string> = {
  history_not_confirmed: "0% WPI · history not confirmed",
  no_criteria_met: "0% WPI · no class criteria met",
};

function resultLabel(c: AmaRegionRating["components"][number]) {
  switch (c.status) {
    case "rated":
      if (c.zeroReason) return zeroLabel[c.zeroReason];
      return `${c.method === "diagnostic_row" ? `Class ${c.entryId} · ` : ""}${c.wpi}% WPI`;
    case "unresolved":
      return c.method === "diagnostic_row"
        ? `${c.unresolvedQuestionIds.length} unanswered in Visit`
        : "Class or modifier not chosen";
    case "pending_history":
      return "History question not answered in Visit";
    case "not_rated":
      return notRatedLabel[c.notRatedReason!];
  }
}

// The region's draft impairment from the saved visit, shown once the region is at MMI.
// Only when the case requests a rating.
export function AmaImpairment({ caseId, region }: { caseId: string; region: Region }) {
  const { data: patientCase } = useQuery(caseQueryOptions(caseId));
  const rating = useQuery({
    ...amaRatingQueryOptions(caseId, region),
    enabled: patientCase?.amaMode === "rating",
  });
  const { data: labels } = useQuery(canonicalDiagnosesQueryOptions(region));
  const dxLabel = (dx: string) => labels?.find((d) => d.canonicalDx === dx)?.label ?? dx;
  if (patientCase?.amaMode !== "rating") return null;

  return (
    <div className="border-t border-slate-200 pt-2.5">
      <div className="mb-1.5 text-[10.5px] font-bold tracking-[.05em] text-slate-500">
        IMPAIRMENT
      </div>
      {rating.isPending ? (
        <p className="text-[12px] text-slate-500">Rating…</p>
      ) : rating.isError ? (
        <p className="text-[12px] text-red-700">Could not rate this region from the saved visit.</p>
      ) : !rating.data.components.length ? (
        <p className="text-[12px] text-slate-500">
          No AMA findings recorded for this region in the Visit.
        </p>
      ) : (
        <>
          <ul className="grid gap-1">
            {rating.data.components.map((c) => (
              <li
                key={c.method === "diagnostic_row" ? c.assessmentId : c.tableId}
                className="flex items-baseline gap-3 text-[12px]"
              >
                {/* Rows are named for what they rate (a herniation is rated through the
                    radiculopathy rows), so the linked diagnosis leads. */}
                <span className="min-w-0 flex-1">
                  {c.canonicalDxIds.length ? (
                    <span className="font-semibold">{c.canonicalDxIds.map(dxLabel).join(", ")} </span>
                  ) : null}
                  <span className="text-slate-500">
                    rated via {c.description}
                    {c.method === "diagnostic_row" && c.side ? ` · ${c.side}` : null}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0",
                    c.status === "rated"
                      ? "font-semibold text-slate-900"
                      : c.status === "not_rated"
                        ? "text-slate-500"
                        : "text-amber-700"
                  )}
                >
                  {resultLabel(c)}
                </span>
              </li>
            ))}
          </ul>
          {rating.data.combined ? (
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-[12.5px]">
                Regional impairment: <b>{rating.data.combined.wpi}% WPI</b>
              </div>
              <ul className="mt-0.5 grid gap-0.5 text-[11.5px] text-slate-600">
                {rating.data.combined.rationale.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-1.5 text-[11.5px] text-slate-500">
            {rating.data.combined
              ? null
              : rating.data.components.some((c) => c.status === "unresolved" || c.status === "pending_history")
                ? "Regional value pending: resolve the items above. "
                : "No component rated, so no regional value. "}
            <Link
              to="/p_cases/$caseId/visit"
              params={{ caseId }}
              className="font-semibold text-blue-700 hover:underline"
            >
              Edit findings in Visit
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
