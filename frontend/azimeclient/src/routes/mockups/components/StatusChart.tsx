import { useState } from "react";
import type { CaseSummary } from "../data";

// Pain line, work-status band, and treatment markers on one shared time axis.
const W = 760;
const L = 40;
const R = 750;
const t0 = Date.parse("2024-03-01");
const t1 = Date.parse("2026-10-01");
const x = (date: string) => L + ((Date.parse(date) - t0) / (t1 - t0)) * (R - L);
const PAIN_TOP = 10;
const PAIN_H = 120;
const y = (score: number) => PAIN_TOP + PAIN_H - (score / 10) * PAIN_H;
const ticks = ["2024-03-01", "2024-09-01", "2025-03-01", "2025-09-01", "2026-03-01", "2026-09-01"];
const tickLabel = (date: string) => {
  const d = new Date(date);
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${String(d.getUTCFullYear()).slice(2)}`;
};

export default function StatusChart({ summary }: { summary: CaseSummary }) {
  const [hover, setHover] = useState<CaseSummary["pain"][number] | null>(null);
  const path = summary.pain.map((p, i) => `${i ? "L" : "M"}${x(p.date)},${y(p.score)}`).join("");

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} 250`} className="mt-2.5 w-full overflow-visible text-[10.5px]">
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="#eef2f6" />
            <text x={L - 8} y={y(v) + 3} textAnchor="end" className="fill-slate-500">{v}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" />
        {summary.pain.map((p) => (
          <g key={p.date}>
            <circle cx={x(p.date)} cy={y(p.score)} r={4.5} fill="#2563eb" stroke="#fff" strokeWidth={2} />
            <circle
              cx={x(p.date)}
              cy={y(p.score)}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}

        <text x={L - 8} y={162} textAnchor="end" className="fill-slate-500">Work</text>
        {summary.workStatus.map((w) => (
          <g key={w.from}>
            <rect x={x(w.from) + 1} y={150} width={x(w.to) - x(w.from) - 2} height={18} rx={4} fill={w.tone === "off" ? "#fee2e2" : "#fef3c7"} />
            <text x={x(w.from) + 6} y={162.5} className={w.tone === "off" ? "fill-red-800 font-semibold" : "fill-amber-800 font-semibold"}>{w.label}</text>
          </g>
        ))}

        <text x={L - 8} y={194} textAnchor="end" className="fill-slate-500">Tx</text>
        {summary.treatments.map((t) =>
          t.to ? (
            <g key={t.from}>
              <rect x={x(t.from)} y={182} width={x(t.to) - x(t.from)} height={18} rx={4} fill="#dcfce7" />
              <text x={x(t.from) + 5} y={194.5} className="fill-green-800 font-semibold">{t.label}</text>
            </g>
          ) : (
            <g key={t.from}>
              <path d={`M${x(t.from)},184 l7,7 -7,7 -7,-7z`} fill="#475569" />
              <text x={x(t.from) + 10} y={194.5} className="fill-slate-700 font-semibold">{t.label}</text>
            </g>
          ),
        )}

        <line x1={L} x2={R} y1={222} y2={222} stroke="#cbd5e1" />
        {ticks.map((d) => (
          <text key={d} x={x(d)} y={236} textAnchor="middle" className="fill-slate-500">{tickLabel(d)}</text>
        ))}
      </svg>
      {hover ? (
        <div
          className="pointer-events-none absolute whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11.5px] text-white"
          style={{ left: `${(x(hover.date) / W) * 100}%`, top: `${(y(hover.score) / 250) * 100}%`, transform: "translate(-50%, -140%)" }}
        >
          {hover.date} · pain {hover.score}/10 · {hover.label}
        </div>
      ) : null}
    </div>
  );
}
