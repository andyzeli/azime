import { TriangleAlert } from "lucide-react";
import type { StoredExtraction } from "../../../../../../../../backend/src/ai/gemini/registry";
import { Bullets, Callout, Chip, has, Prose, Section } from "./parts";

type Incident = StoredExtraction<"incident_report">;

export function IncidentView({ data }: { data: Incident }) {
  const injuries = data.initialReportedInjuries.filter(has);
  return (
    <div className="space-y-5">
      {has(data.dateOfIncident) ? (
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="amber">Incident {data.dateOfIncident}</Chip>
        </div>
      ) : null}

      {has(data.mechanismOfInjury) ? (
        <Callout tone="amber" label="Mechanism of injury">
          <Prose text={data.mechanismOfInjury} className="text-[13.5px] font-medium text-amber-950" />
        </Callout>
      ) : null}

      {injuries.length > 0 ? (
        <Section icon={TriangleAlert} title="Initially reported injuries" tone="amber">
          <Bullets items={injuries} />
        </Section>
      ) : null}
    </div>
  );
}
