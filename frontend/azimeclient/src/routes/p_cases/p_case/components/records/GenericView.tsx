import { Quote } from "lucide-react";
import type { StoredExtraction } from "@azime/contracts";
import { has, Prose, Section } from "./parts";

// Generic documents and legal summaries share one extraction schema.
type Generic = StoredExtraction<"generic">;

export function GenericView({ data }: { data: Generic }) {
  return (
    <div className="space-y-5">
      {has(data.summary) ? <Prose text={data.summary} /> : null}

      {data.evidence.length > 0 ? (
        <Section icon={Quote} title="Supporting quotes" tone="slate">
          <ul className="space-y-2">
            {data.evidence.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-px shrink-0 rounded bg-slate-100 px-1.5 py-px text-[10.5px] font-semibold text-slate-500">
                  p.{item.page}
                </span>
                <blockquote className="text-[12.5px] italic leading-relaxed text-slate-600">“{item.quote}”</blockquote>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
