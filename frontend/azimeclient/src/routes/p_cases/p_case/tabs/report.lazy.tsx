import { useState, type ReactNode } from "react";
import { createLazyRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  reportFactCheck,
  reportVariantLabels,
  supportedRegions,
  type CaseReportResponse,
  type ReportBlocker,
  type ReportDiscussionRegion,
  type ReportInput,
  type ReportQuestionnaire,
  type Region,
} from "@azime/contracts";
import {
  caseReportQueryOptions,
  generateCaseReport,
  caseReportPdfUrl,
  reopenCaseReport,
  reportInputQueryOptions,
  saveCaseReport,
  signCaseReport,
} from "../../../cases/queries";
import { cn } from "@/lib/utils";
import { Badge, Btn } from "../components/shared";
import { ReportEditor } from "../components/ReportEditor";
import { aiMutationKey } from "../aiRuns";
import { useAutosave } from "../autosave";
import { SaveStatus } from "../components/SaveStatus";

// Two views. Input: the drafter's input, rendered section by section in report order
// (docs/ime-report.md); what is shown is exactly what Generate sends. Draft: the latest
// draft, edited in place and autosaved.

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;
const words = (value: string) => value.replace(/_/g, " ");
const pct = (n: number) => `${Number(n.toFixed(2))}%`;

const apiErrorMessage = (error: unknown) =>
  (error as { data?: { error?: string } } | null)?.data?.error ??
  "Request failed";

// Stored JSON comes back with its keys reordered, so compare with sorted keys.
const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]])
        )
      : v
  );

const linkButton =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-50";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const relationshipLabel = {
  caused: "Caused by the injury",
  aggravated: "Pre-existing, aggravated",
  preexisting_not_aggravated: "Pre-existing, not aggravated",
  not_related: "Not related",
} as const;

function Tab() {
  const { caseId } = Route.useParams();
  const { view: requested } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery(
    reportInputQueryOptions(caseId)
  );
  const { data: latest } = useQuery(caseReportQueryOptions(caseId));
  const generate = useMutation({
    mutationKey: aiMutationKey(caseId, "report"),
    mutationFn: () => generateCaseReport(caseId),
    onSuccess: (saved) => {
      queryClient.setQueryData(caseReportQueryOptions(caseId).queryKey, saved);
      void navigate({ to: ".", search: { view: "draft" } });
    },
    // A failed run still leaves its frozen row; show it.
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: caseReportQueryOptions(caseId).queryKey,
      }),
  });
  // The draft no longer matches what the builder would send now.
  const outOfDate =
    !!latest &&
    (!data?.input || stableJson(latest.input) !== stableJson(data.input));
  const view = requested ?? (latest ? "draft" : "input");
  const regenerate = () => {
    // Always asked once a draft exists: edits may not have saved yet, and none carry over.
    if (
      latest &&
      !window.confirm(
        "Regenerating writes a new draft to replace this one. Edits to this draft won't carry over. Continue?"
      )
    )
      return;
    generate.mutate();
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <nav className="sticky top-0 z-20 flex items-center gap-1 border-b border-slate-200 bg-slate-100/95 px-5 pt-2 backdrop-blur">
        <ViewTab to="input" active={view === "input"}>
          Input
          {data && !data.input ? (
            <Badge className="bg-amber-100 text-amber-800">
              {data.blockers.length} to resolve
            </Badge>
          ) : null}
        </ViewTab>
        <ViewTab to="draft" active={view === "draft"}>
          Draft
          {!latest ? (
            <span className="text-[11px] font-normal text-slate-400">none yet</span>
          ) : latest.signedAt ? (
            <Badge className="bg-green-100 text-green-800">Signed</Badge>
          ) : outOfDate ? (
            <Badge className="bg-amber-100 text-amber-800">Out of date</Badge>
          ) : null}
        </ViewTab>
      </nav>
      <div className={cn("flex flex-col gap-4 px-5 py-4", view !== "input" && "hidden")}>
        {isPending ? (
          <p className="text-[12.5px] text-slate-500">
            Assembling the report input…
          </p>
        ) : isError ? (
          <p className="text-[12.5px] text-red-700">
            Could not assemble the report input.
          </p>
        ) : data.input ? (
          <Builder input={data.input} />
        ) : (
          <Blockers caseId={caseId} blockers={data.blockers} />
        )}
      </div>
      <div className={cn("px-5 py-4", view !== "draft" && "hidden")}>
        {latest ? (
          <Review
            key={latest.id}
            caseId={caseId}
            report={latest}
            outOfDate={outOfDate}
            generating={generate.isPending}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-[12.5px] text-slate-500">
            {generate.isPending
              ? "Drafting…"
              : "No draft yet. Generate one once the input is ready."}
          </p>
        )}
      </div>
      <footer className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-slate-200 bg-white px-5 py-2.5 shadow-[0_-6px_16px_rgba(15,23,42,.05)]">
        <span className="text-[11px] text-slate-500">
          {data?.input
            ? "Ready. The Input view is the drafter's full input."
            : data
              ? `${data.blockers.length} item${data.blockers.length === 1 ? "" : "s"} to resolve before generating`
              : null}
        </span>
        <span className="flex-1" />
        {generate.isError ? (
          <span role="alert" className="text-[11px] font-semibold text-red-700">
            {apiErrorMessage(generate.error)}
          </span>
        ) : null}
        <Btn
          variant="primary"
          disabled={!data?.input || generate.isPending}
          onClick={regenerate}
        >
          {generate.isPending
            ? "Generating draft…"
            : latest
              ? "Regenerate draft"
              : "Generate draft"}
        </Btn>
      </footer>
    </main>
  );
}

function ViewTab({
  to,
  active,
  children,
}: {
  to: "input" | "draft";
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to="."
      search={{ view: to }}
      className={cn(
        "-mb-px flex items-center gap-2 rounded-t-lg border border-b-0 px-3.5 py-1.5 text-[12.5px] font-semibold",
        active
          ? "border-slate-200 bg-white text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      )}
    >
      {children}
    </Link>
  );
}

function Review({
  caseId,
  report,
  outOfDate,
  generating,
}: {
  caseId: string;
  report: CaseReportResponse;
  outOfDate: boolean;
  generating: boolean;
}) {
  return (
    <section className="rounded-xl border-2 border-slate-300 bg-white">
      <div className="flex items-baseline gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Report draft</h2>
        <span className="text-[11px] text-slate-500">
          {report.source
            ? `drafted ${formatTime(report.createdAt)} · ${report.source.model}`
            : `started ${formatTime(report.createdAt)}`}
          {report.revision ? ` · edited ${formatTime(report.updatedAt)}` : ""}
        </span>
        <span className="flex-1" />
        {outOfDate ? (
          <Badge className="bg-amber-100 text-amber-800">Out of date</Badge>
        ) : null}
      </div>
      {outOfDate ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
          The case changed since this draft. The Input view shows what a new
          draft would use.
        </p>
      ) : null}
      {report.report !== null ? (
        <EditableDraft
          caseId={caseId}
          report={{ ...report, report: report.report }}
          generating={generating}
          outOfDate={outOfDate}
        />
      ) : (
        <p className="px-4 py-3 text-[12.5px] text-slate-500">
          {generating
            ? "Drafting…"
            : "This draft didn't finish. Generate again."}
        </p>
      )}
    </section>
  );
}

// Edits save 800 ms after the last keystroke, against the draft's revision.
function EditableDraft({
  caseId,
  report,
  generating,
  outOfDate,
}: {
  caseId: string;
  report: CaseReportResponse & { report: string };
  generating: boolean;
  outOfDate: boolean;
}) {
  const queryClient = useQueryClient();
  const setLatest = (saved: CaseReportResponse) =>
    queryClient.setQueryData(caseReportQueryOptions(caseId).queryKey, saved);
  const { draft, edit, status, retry, flush } = useAutosave({
    initial: report.report,
    revision: report.revision,
    saved: true,
    label: "the report draft",
    save: async (markdown, expectedRevision) => {
      const saved = await saveCaseReport(caseId, report.id, {
        report: markdown,
        expectedRevision,
      });
      // A save that lands after a regeneration must not bring this draft back.
      queryClient.setQueryData(
        caseReportQueryOptions(caseId).queryKey,
        (current) => (current?.id === saved.id ? saved : current)
      );
      return saved.revision;
    },
  });
  // Checked against the text as edited, so a deleted value shows up right away.
  const missing = reportFactCheck(report.input, draft);
  const signed = report.signedAt !== null;
  const pdfUrl = caseReportPdfUrl(caseId, report.id);
  // Editing is frozen from the click until signing settles, so what is signed is
  // exactly what is on screen.
  const [signing, setSigning] = useState(false);
  const sign = useMutation({
    mutationFn: (revision: number) => signCaseReport(caseId, report.id, revision),
    onSuccess: setLatest,
    onSettled: () => setSigning(false),
  });
  const reopen = useMutation({
    mutationFn: () => reopenCaseReport(caseId, report.id),
    onSuccess: setLatest,
  });
  // The PDF is built from the saved text, so pending edits are saved first.
  const preview = async () => {
    const tab = window.open("", "_blank");
    if (await flush()) tab?.location.assign(pdfUrl);
    else tab?.close();
  };
  const signReport = async () => {
    setSigning(true);
    if (!(await flush())) return setSigning(false);
    // The revision just saved here (the prop is from before the save).
    const revision =
      queryClient.getQueryData(caseReportQueryOptions(caseId).queryKey)?.revision ??
      report.revision;
    const warnings = [
      outOfDate && "The case changed since this draft was written.",
      missing.length && `${missing.length} decided value${missing.length === 1 ? " is" : "s are"} not in the text.`,
    ].filter(Boolean);
    if (
      window.confirm(
        [
          ...warnings,
          "Sign this report? It becomes final: the PDF is stored for staff to send, and further changes need Reopen.",
        ].join("\n\n")
      )
    )
      sign.mutate(revision);
    else setSigning(false);
  };
  const actionError = sign.error ?? reopen.error;

  return (
    <>
      {missing.length ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-900">
          <b>Check the draft: these decided values are not in the text.</b>
          <ul className="mt-0.5 list-disc pl-4">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {signed ? (
        <div className="flex items-center gap-3 border-b border-green-200 bg-green-50 px-4 py-2 text-[12.5px] text-green-900">
          <span className="flex-1">
            <b>Signed.</b> Electronically signed by {report.signedBy} on{" "}
            {formatTime(report.signedAt!)}. This draft is final.
          </span>
          <a href={pdfUrl} download className={linkButton}>
            Download PDF
          </a>
          <button
            type="button"
            disabled={reopen.isPending}
            onClick={() =>
              window.confirm(
                "Reopen for edits? The signed PDF is kept; you'll continue on an unsigned copy that needs signing again."
              ) && reopen.mutate()
            }
            className={linkButton}
          >
            {reopen.isPending ? "Reopening…" : "Reopen for edits"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-1.5">
          <SaveStatus status={status} onRetry={retry} />
          <span className="flex-1" />
          <button type="button" onClick={() => void preview()} className={linkButton}>
            Preview PDF
          </button>
          <Btn
            variant="primary"
            disabled={generating || signing}
            onClick={() => void signReport()}
          >
            {signing ? "Signing…" : "Sign report"}
          </Btn>
        </div>
      )}
      {actionError ? (
        <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-800">
          {apiErrorMessage(actionError)}
          {apiErrorMessage(actionError).includes("Settings") ? (
            <>
              {" "}
              <Link to="/settings" className="font-semibold underline">
                Open Settings →
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <ReportEditor
        markdown={report.report}
        onChange={(md) => edit(() => md)}
        // Read-only once signed, and while a new draft is written (edits would be replaced).
        editable={!generating && !signed && !signing}
      />
    </>
  );
}

function Blockers({
  caseId,
  blockers,
}: {
  caseId: string;
  blockers: ReportBlocker[];
}) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <h2 className="text-[13.5px] font-semibold text-amber-900">
        Before the report can be built
      </h2>
      <ul className="mt-1.5 grid gap-1 text-[12.5px] text-amber-900">
        {blockers.map((b) => (
          <li
            key={`${b.region}:${b.message}`}
            className="flex items-baseline gap-2"
          >
            {b.region ? <b>{regionLabel(b.region)}:</b> : null}
            <span className="flex-1">{b.message}</span>
            <BlockerLink caseId={caseId} blocker={b} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BlockerLink({
  caseId,
  blocker: { tab, region },
}: {
  caseId: string;
  blocker: ReportBlocker;
}) {
  const className = "shrink-0 font-semibold underline";
  switch (tab) {
    case "summary":
      return (
        <Link
          to="/p_cases/$caseId/summary"
          params={{ caseId }}
          className={className}
        >
          Summary →
        </Link>
      );
    case "analysis":
      return (
        <Link
          to="/p_cases/$caseId/analysis"
          params={{ caseId }}
          search={{ region: region ?? undefined }}
          className={className}
        >
          Analysis →
        </Link>
      );
    case "visit":
      return (
        <Link
          to="/p_cases/$caseId/visit"
          params={{ caseId }}
          className={className}
        >
          Visit →
        </Link>
      );
    case "mmi":
      return (
        <Link
          to="/p_cases/$caseId/mmi"
          params={{ caseId }}
          className={className}
        >
          Opinions →
        </Link>
      );
  }
}

function Builder({ input }: { input: ReportInput }) {
  const {
    intro,
    background,
    historyOfPresentIllness: hpi,
    examination,
    discussion,
  } = input;
  return (
    <>
      <Section n={1} title="Intro" hint="Templated from the case facts">
        <Facts
          items={[
            ["Report", reportVariantLabels[input.variant]],
            ["Case type", intro.caseType ? words(intro.caseType) : "—"],
            ["Injury", words(intro.injuryType)],
            ["Date of injury", intro.dateOfInjury ?? "—"],
            ["Examination", intro.examinationDate],
            [
              "Impairment rating",
              intro.impairmentRequested ? "Requested" : "Not requested",
            ],
          ]}
        />
      </Section>

      <Section
        n={2}
        title="Background"
        hint="Past medical history comes from the visit note"
      >
        <Sub title="Medications documented in records">
          {background.recordedMedications.length ? (
            <ul className="grid gap-0.5">
              {background.recordedMedications.map((m) => (
                <li key={m.medication}>
                  <b>{m.medication}</b> {m.doses.join(", ")}{" "}
                  <span className="text-slate-500">
                    · {dateRange(m.firstDate, m.lastDate)} · last{" "}
                    {m.lastAction.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <None />
          )}
        </Sub>
        <Sub title="Psychosocial">
          {background.psychosocialFactors ?? <None />}
        </Sub>
      </Section>

      <Section
        n={3}
        title="Chief complaint and history of present illness"
        hint="Chief complaint comes from the visit note"
      >
        <Sub title="Incident">{hpi.incidentNarrative || <None />}</Sub>
        <Sub title="Summary">{hpi.caseWideSummary}</Sub>
      </Section>

      <Section n={4} title="Imaging reviews">
        {input.imaging.length ? (
          <ul className="grid gap-1.5">
            {input.imaging.map((s, i) => (
              <li key={i}>
                <b>
                  {s.modality} {s.bodySite}
                </b>{" "}
                <span className="text-slate-500">· {s.date ?? "undated"}</span>
                <div className="text-slate-600">{s.impression.join(" ")}</div>
              </li>
            ))}
          </ul>
        ) : (
          <None />
        )}
      </Section>

      <Section n={5} title="Work status history">
        {input.workStatus.length ? (
          <ul className="grid gap-1.5">
            {input.workStatus.map((w, i) => (
              <li key={i}>
                <b>{words(w.status)}</b>{" "}
                <span className="text-slate-500">
                  · documented {w.documentedOn ?? "undated"}
                </span>
                {w.restrictions.length ? (
                  <div className="text-slate-600">
                    {w.restrictions.join("; ")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <None />
        )}
      </Section>

      <Section n={6} title="Diagnoses">
        {input.diagnoses.map(({ region, diagnoses }) => (
          <Sub key={region} title={regionLabel(region)}>
            <ul className="grid gap-0.5">
              {diagnoses.map((d) => (
                <li key={d.label} className="flex items-baseline gap-2">
                  <Badge
                    className={
                      d.status === "supported"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-600"
                    }
                  >
                    {d.status === "supported" ? "Supported" : "Not supported"}
                  </Badge>
                  <span>
                    {d.label}
                    {d.reason ? (
                      <span className="text-slate-500"> · {d.reason}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Sub>
        ))}
      </Section>

      <Section n={7} title="Today's examination" hint={examination.date}>
        <Sub title="Visit note">
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans">
            {examination.note}
          </pre>
        </Sub>
        <Sub title="Questionnaires">
          {examination.questionnaires_completed.length ? (
            <ul className="grid gap-0.5">
              {examination.questionnaires_completed.map((q, i) => (
                <Questionnaire key={i} q={q} />
              ))}
            </ul>
          ) : (
            <None />
          )}
        </Sub>
        {supportedRegions.map(({ value: region }) => {
          const findings = examination[`${region}_findings`];
          return findings?.length ? (
            <Sub
              key={region}
              title={`Examination findings · ${regionLabel(region)}`}
            >
              <ul className="grid gap-0.5">
                {findings.map((f, index) => (
                  <li key={index}>
                    <b>{f.finding ?? `${f.nerveRoot} nerve root`}</b>
                    {f.side ? (
                      <span className="text-slate-500"> · {f.side}</span>
                    ) : null}
                    <div className="text-slate-600">
                      {f.tests.map((t, i) => (
                        <div key={i}>
                          {t.test}: {t.result}
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Sub>
          ) : null;
        })}
      </Section>

      <Section n={8} title="Discussion">
        {discussion.regions.map((r) => (
          <DiscussionRegion key={r.region} r={r} />
        ))}
        <Sub title="Work status recommendation">
          <b>{words(discussion.recommended_work_status.status)}</b>
          {discussion.recommended_work_status.duration
            ? `, ${discussion.recommended_work_status.duration}`
            : ""}
          {discussion.recommended_work_status.restrictions.length ? (
            <div className="text-slate-600">
              {discussion.recommended_work_status.restrictions.join("; ")}
            </div>
          ) : null}
        </Sub>
        {"mmi_status_by_region" in discussion ? (
          <Sub title="MMI by region">
            {Object.entries(discussion.mmi_status_by_region).map(
              ([region, status]) => (
                <div key={region}>
                  {words(region)}: {words(status)}
                </div>
              )
            )}
          </Sub>
        ) : null}
        {discussion.whole_person_impairment ? (
          <Sub title="Whole person impairment">
            <div>
              {discussion.whole_person_impairment.percentage === null
                ? "Not available"
                : `${pct(discussion.whole_person_impairment.percentage)} WPI`}
            </div>
            <div>Scope: {words(discussion.whole_person_impairment.scope)}</div>
            <div>
              Included:{" "}
              {discussion.whole_person_impairment.included_regions
                .map(words)
                .join(", ") || "None"}
            </div>
            <div>
              Excluded:{" "}
              {discussion.whole_person_impairment.excluded_regions
                .map(words)
                .join(", ") || "None"}
            </div>
          </Sub>
        ) : null}
      </Section>

    </>
  );
}

function DiscussionRegion({ r }: { r: ReportDiscussionRegion }) {
  const { mmi, causation, impairment } = r.physicianDecisions;
  const trajectory = {
    subjective: r.patient_subjective_trajectory,
    objective: r.patient_objective_trajectory,
    functional: r.patient_functional_trajectory,
  };
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[12.5px] font-semibold">
          {regionLabel(r.region)}
        </span>
      </div>
      <div className="grid gap-2.5">
        {r.care_marked_inappropriate ? (
          <Sub
            title={`Care marked inappropriate (${r.care_marked_inappropriate.length})`}
          >
            {r.care_marked_inappropriate.length ? (
              <ul className="grid gap-2">
                {r.care_marked_inappropriate.map((t, i) => (
                  <li key={i}>
                    <b>{t.treatment}</b>
                    {t.category ? ` · ${t.category}` : ""}
                    <div>{t.diagnoses_considered.join(", ")}</div>
                    <div className="text-slate-600">
                      {words(t.decision_basis)} ·{" "}
                      {t.inappropriateness_rationale || "No rationale supplied"}
                    </div>
                    <div className="text-slate-500">
                      Records: {t.documentedHistory.status ?? "Not documented"}
                      {t.documentedHistory.detail
                        ? ` · ${t.documentedHistory.detail}`
                        : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-slate-500">
                No treatments meet this section’s criteria.
              </span>
            )}
          </Sub>
        ) : null}
        {r.care_marked_exhausted ? (
          <Sub
            title={`Care marked exhausted (${r.care_marked_exhausted.length})`}
          >
            {r.care_marked_exhausted.length ? (
              <ul className="grid gap-2">
                {r.care_marked_exhausted.map((t, i) => (
                  <li key={i}>
                    <b>{t.treatment}</b>
                    {t.category ? ` · ${t.category}` : ""}
                    <div>
                      {t.diagnoses_addressed.join(", ") ||
                        "No applicable diagnosis supplied"}
                    </div>
                    <div className="text-slate-600">
                      {t.exhaustion_rationale}
                    </div>
                    <div className="text-slate-500">
                      Records: {t.documentedHistory.status ?? "Not documented"}
                      {t.documentedHistory.detail
                        ? ` · ${t.documentedHistory.detail}`
                        : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-slate-500">
                No treatments marked exhausted.
              </span>
            )}
          </Sub>
        ) : null}
        {(
          [
            ["Remaining curative care", r.remaining_curative_care],
            ["Remaining maintenance care", r.remaining_maintenance_care],
          ] as const
        ).map(([title, care]) =>
          care ? (
            <Sub key={title} title={`${title} (${care.length})`}>
              {care.length ? (
                <ul className="grid gap-2">
                  {care.map((t, i) => (
                    <li key={i}>
                      <b>{t.treatment}</b>
                      {t.category ? ` · ${t.category}` : ""}
                      <div className="text-slate-500">
                        Records:{" "}
                        {t.documentedHistory.status ?? "Not documented"}
                        {t.documentedHistory.detail
                          ? ` · ${t.documentedHistory.detail}`
                          : ""}
                      </div>
                      {t.applicability_rationales.map((a, j) => (
                        <div key={j}>
                          <b>{a.diagnosis}:</b>{" "}
                          {a.applicability
                            ? `${words(a.applicability)} · `
                            : ""}
                          {a.rationale}
                        </div>
                      ))}
                      <div>
                        {words(t.exhaustion_status)}: {t.exhaustion_rationale}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500">None recommended.</span>
              )}
            </Sub>
          ) : null
        )}
        <Sub title="Earlier trajectory analysis">
          <ul className="grid gap-0.5">
            {(["subjective", "functional", "objective"] as const).map((k) => (
              <li key={k}>
                <b className="capitalize">{k}</b>: {trajectory[k].direction}
                <span className="text-slate-500">
                  {" "}
                  · {trajectory[k].evidenceQuality} evidence
                </span>
                <div className="text-slate-600">
                  {trajectory[k].interpretation}
                </div>
              </li>
            ))}
          </ul>
        </Sub>
        <Sub title="Causation">
          <ul className="grid gap-0.5">
            {causation.map((c) => (
              <li key={c.diagnosis}>
                <b>{c.diagnosis}</b>: {relationshipLabel[c.relationship]}
                {c.aggravation ? `, ${c.aggravation}` : ""}
                {c.note ? (
                  <span className="text-slate-500"> · {c.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Sub>
        <Sub title="MMI">
          {mmi.status === "at_mmi" ? (
            <>
              <b>At MMI</b> as of {mmi.date}
            </>
          ) : (
            <>
              <b>Not at MMI</b>
              {mmi.reevaluateIn
                ? `, re-evaluate in ${mmi.reevaluateIn.amount} ${mmi.reevaluateIn.unit}`
                : ""}
            </>
          )}
          {mmi.note ? <div className="text-slate-600">{mmi.note}</div> : null}
        </Sub>
        <Sub
          title={`Analysis supporting the MMI decision (${mmi.supporting_analysis.length})`}
        >
          <ul className="list-disc space-y-0.5 pl-4">
            {mmi.supporting_analysis.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Sub>
        {impairment ? (
          <Sub title="Impairment">
            <div className="mt-1">
              Regional impairment: <b>{pct(impairment.wpi)} WPI</b>
            </div>
          </Sub>
        ) : null}
      </div>
    </div>
  );
}

function Questionnaire({ q }: { q: ReportQuestionnaire }) {
  return (
    <li>
      <b>{q.name}</b>{" "}
      <span className="text-slate-500">
        · {q.total_score ?? "Score unavailable"} · {q.answers.length} answers
        {q.completed_on ? ` · completed ${q.completed_on}` : ""}
      </span>
      <details className="mt-1">
        <summary className="cursor-pointer text-slate-500">
          Patient-reported responses
        </summary>
        {q.question_description ? (
          <p className="mt-1 text-slate-600">{q.question_description}</p>
        ) : null}
        <ul className="mt-1 grid gap-0.5">
          {q.answers.map((a, i) => (
            <li key={i}>
              {a.question}: {a.score}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-baseline gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <span className="text-[11px] font-bold text-slate-400">{n}</span>
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        {hint ? (
          <span className="text-[11px] text-slate-500">{hint}</span>
        ) : null}
      </div>
      <div className="grid gap-3 px-4 py-3 text-[12.5px] text-slate-800">
        {children}
      </div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-500">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="capitalize">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function None() {
  return <span className="text-slate-400">None in the records.</span>;
}

const dateRange = (from: string | null, to: string | null) =>
  !from && !to
    ? "undated"
    : from === to || !to
      ? (from ?? "")
      : `${from ?? "?"} to ${to}`;

export const Route = createLazyRoute("/p_cases/$caseId/report")({
  component: Tab,
});
