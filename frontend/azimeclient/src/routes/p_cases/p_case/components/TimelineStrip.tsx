import { Link } from "@tanstack/react-router";
import type { PreExamSnapshotResponse } from "../../../cases/queries";

// A compact "when things happened" strip for one region: injury → treatment → exam.
// It shows when things happened, not what changed (that's the trajectory). Every mark is
// neutral, and empty stretches stay empty: no records is not evidence of a plateau.
// The exam date is the endpoint, so an older analysis doesn't look current.

type Episode = NonNullable<
  PreExamSnapshotResponse["inputSnapshot"]
>["treatmentEpisodes"][number];

const DAY = 86_400_000;
const time = (date: string) => Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
const formatDate = (date: string) =>
  new Date(time(date)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// Whole calendar months between two dates.
function monthsBetween(from: string, to: string) {
  const [y1, m1, d1] = from.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = to.slice(0, 10).split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}
function duration(from: string, to: string) {
  const months = monthsBetween(from, to);
  if (months < 1) return `${Math.round((time(to) - time(from)) / DAY)} days`;
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} years${rest ? ` ${rest} month${rest === 1 ? "" : "s"}` : ""}`;
}

const pointKinds = new Set<Episode["kind"]>(["intervention", "surgery"]);

export function TimelineStrip({
  caseId,
  injuryDate,
  examDate,
  episodes,
  recordDates,
}: {
  caseId: string;
  injuryDate: string | null;
  examDate: string;
  episodes: Episode[];
  // Every dated record in the case, for how recent the evidence is.
  recordDates: string[];
}) {
  const beforeExam = (date: string) => time(date) <= time(examDate);
  const records = recordDates.filter(beforeExam).sort();
  const lastRecord = records.at(-1);
  const lanes = episodes
    .map((episode) => ({
      episode,
      dates: episode.records
        .flatMap((r) => (r.eventDate ? [r.eventDate] : []))
        .filter(beforeExam)
        .sort(),
    }))
    .filter((lane) => lane.dates.length)
    .sort((a, b) => a.dates[0].localeCompare(b.dates[0]));

  const start = [injuryDate, records[0], ...lanes.map((l) => l.dates[0])]
    .filter((d): d is string => !!d)
    .sort()[0];

  const summary = (
    <div className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-slate-600">
      <b className="text-[13px] text-slate-900">
        {injuryDate
          ? `${duration(injuryDate, examDate)} since injury`
          : "Injury date not recorded"}
      </b>
      <span>· Exam {formatDate(examDate)}</span>
      <span>
        ·{" "}
        {lastRecord
          ? `Last record ${formatDate(lastRecord)} (${duration(lastRecord, examDate)} before the exam)`
          : "No dated records"}
      </span>
      <span className="flex-1" />
      <Link
        to="/p_cases/$caseId/summary"
        params={{ caseId }}
        className="text-[11.5px] font-semibold text-blue-700 hover:underline"
      >
        Full chronology in Summary →
      </Link>
    </div>
  );

  // Nothing between injury and exam worth drawing: the line alone says it better.
  if (!lanes.length || !start || time(start) >= time(examDate)) return summary;

  const span = time(examDate) - time(start);
  const at = (date: string) => `${((time(date) - time(start)) / span) * 100}%`;
  const track = "relative h-4";

  return (
    <div className="grid gap-1.5">
      {summary}
      <div className="grid grid-cols-[130px_1fr] items-center gap-x-3 gap-y-1 text-[11px]">
        {lanes.map(({ episode, dates }) => {
          const first = dates[0];
          const last = dates.at(-1)!;
          const asPoints = pointKinds.has(episode.kind) || first === last;
          return [
            <span
              key={`${episode.id}:label`}
              className="truncate text-slate-600"
              title={episode.name}
            >
              {episode.name}
            </span>,
            <div key={episode.id} className={track}>
              <Markers injuryAt={injuryDate ? at(injuryDate) : null} />
              {asPoints ? (
                dates.map((date, i) => (
                  <span
                    key={`${date}:${i}`}
                    title={`${episode.name} · ${formatDate(date)}`}
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500"
                    style={{ left: at(date) }}
                  />
                ))
              ) : (
                <span
                  title={`${episode.name} · ${formatDate(first)} – ${formatDate(last)} · ${dates.length} visits`}
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-400"
                  style={{
                    left: at(first),
                    width: `calc(${at(last)} - ${at(first)} + 2px)`,
                  }}
                />
              )}
            </div>,
          ];
        })}
        <span className="text-slate-400">Records</span>
        <div className={track}>
          <Markers injuryAt={injuryDate ? at(injuryDate) : null} />
          {records.map((date, i) => (
            <span
              key={`${date}:${i}`}
              title={formatDate(date)}
              className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-slate-400"
              style={{ left: at(date) }}
            />
          ))}
        </div>
        <span />
        <div className="relative flex h-4 justify-between text-[10.5px] text-slate-500">
          <span>
            {injuryDate === start ? "Injury " : ""}
            {formatDate(start)}
          </span>
          {injuryDate && injuryDate !== start ? (
            <span
              className="absolute -translate-x-1/2"
              style={{ left: at(injuryDate) }}
            >
              Injury
            </span>
          ) : null}
          <span className="font-semibold text-blue-700">
            Exam {formatDate(examDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Shared vertical guides: a faint baseline, the injury, and the exam at the right edge.
function Markers({ injuryAt }: { injuryAt: string | null }) {
  return (
    <>
      <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
      {injuryAt ? (
        <span
          className="absolute inset-y-0 w-px bg-slate-500"
          style={{ left: injuryAt }}
        />
      ) : null}
      <span className="absolute inset-y-0 right-0 w-0.5 bg-blue-600" />
    </>
  );
}
