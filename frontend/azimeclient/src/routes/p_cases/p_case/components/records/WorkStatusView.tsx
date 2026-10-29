import { CalendarRange, ShieldAlert } from "lucide-react";
import type { StoredExtraction } from "@azime/contracts";
import { Bullets, Callout, has, Section, workStatusStyle } from "./parts";

type WorkStatus = StoredExtraction<"workstatus">;

export function WorkStatusView({ data }: { data: WorkStatus }) {
  const style = workStatusStyle[data.status];
  const dated = has(data.effectiveFrom) || has(data.effectiveThrough);

  return (
    <div className="space-y-5">
      <Callout tone={style.tone} label="Work status">
        <div className="text-[15px] font-semibold">{style.label}</div>
        {dated ? (
          <div className="mt-1 flex items-center gap-1.5 text-[12.5px] opacity-80">
            <CalendarRange className="size-3.5" />
            {has(data.effectiveFrom) ? data.effectiveFrom : "Start not stated"}
            <span aria-hidden>→</span>
            {has(data.effectiveThrough) ? data.effectiveThrough : "until further notice"}
          </div>
        ) : null}
      </Callout>

      {data.restrictions.length > 0 ? (
        <Section icon={ShieldAlert} title="Restrictions" tone={style.tone}>
          <Bullets items={data.restrictions} />
        </Section>
      ) : null}
    </div>
  );
}
