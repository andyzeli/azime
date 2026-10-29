import { FileSearch } from "lucide-react";
import type { StoredExtraction } from "@azime/contracts";
import { Callout, Chip, has, humanize, Prose, Section, TextField } from "./parts";

type Imaging = StoredExtraction<"imaging_report">;

export function ImagingView({ data }: { data: Imaging }) {
  const impression = data.radiologistImpression.filter(has);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="purple">{humanize(data.modality)}</Chip>
        {has(data.bodySite) ? <Chip>{data.bodySite}</Chip> : null}
      </div>

      {impression.length > 0 ? (
        <Callout tone="purple" label="Impression">
          <div className="space-y-1">
            {impression.map((line, i) => (
              <Prose key={i} text={line} className="text-[13.5px] font-medium text-purple-950" />
            ))}
          </div>
        </Callout>
      ) : null}

      {has(data.clinicalIndication) || has(data.comparisonStudies) ? (
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <TextField label="Indication" text={data.clinicalIndication} />
          <TextField label="Comparison" text={data.comparisonStudies} />
        </div>
      ) : null}

      {has(data.detailedFindings) ? (
        <Section icon={FileSearch} title="Findings" tone="purple">
          <Prose text={data.detailedFindings} />
        </Section>
      ) : null}
    </div>
  );
}
