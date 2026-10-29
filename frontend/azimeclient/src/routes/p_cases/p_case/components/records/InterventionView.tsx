import { ListChecks, Syringe } from "lucide-react";
import type { StoredExtraction } from "@azime/contracts";
import {
  Callout,
  Chip,
  Field,
  has,
  humanize,
  isNone,
  ItemList,
  EvidenceItem,
  Prose,
  Section,
  TextField,
  TreatmentChips,
} from "./parts";

type Intervention = StoredExtraction<"intervention_report">;

export function InterventionView({ data }: { data: Intervention }) {
  const region = data.region !== "unclear" ? data.region : null;
  const procedure =
    data.medicationsInjected.length > 0 || has(data.immediate_response) || has(data.complications);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <TreatmentChips treatment={data} />
        {region ? <Chip className="mt-1">{humanize(region)}</Chip> : null}
      </div>

      <Callout tone="rose" label="Procedure">
        <div className="text-[13.5px] font-medium text-rose-950">
          {data.name}
          {has(data.bodySite) ? (
            <span className="font-normal text-rose-900/70"> · {data.bodySite}</span>
          ) : null}
        </div>
      </Callout>

      <TextField label="Indication" text={data.indication} />

      {procedure ? (
        <Section icon={Syringe} title="Details" tone="rose">
          {data.medicationsInjected.length > 0 ? (
            <Field label="Injected">
              <ItemList>
                {data.medicationsInjected.map((med, i) => (
                  <EvidenceItem key={i}>
                    <span className="text-[13px] font-medium text-slate-900">{med.name}</span>
                    {has(med.dose) ? <span className="text-[12.5px] text-slate-600"> · {med.dose}</span> : null}
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
          <TextField label="Immediate response" text={data.immediate_response} />
          {has(data.complications) ? (
            <Field label="Complications">
              <Prose
                text={data.complications}
                className={isNone(data.complications) ? "text-slate-500" : "font-medium text-rose-700"}
              />
            </Field>
          ) : null}
        </Section>
      ) : null}

      {has(data.followUpPlan) ? (
        <Section icon={ListChecks} title="Plan" tone="emerald">
          <Prose text={data.followUpPlan} />
        </Section>
      ) : null}
    </div>
  );
}
