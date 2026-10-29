import { HardHat } from "lucide-react";
import type { StoredExtraction } from "@azime/contracts";
import { Bullets, Callout, Chip, has, Section, type Tone } from "./parts";

type JobDescription = StoredExtraction<"job_description">;

const exertionTone: Record<JobDescription["exertionClassification"], Tone> = {
  Sedentary: "emerald",
  Light: "emerald",
  Medium: "amber",
  Heavy: "rose",
  "Very Heavy": "rose",
  Unspecified: "slate",
};

export function JobDescriptionView({ data }: { data: JobDescription }) {
  const demands = data.requiredPhysicalDemands.filter(has);
  return (
    <div className="space-y-5">
      <Callout tone="amber" label="Job">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold">{has(data.jobTitle) ? data.jobTitle : "Title not stated"}</span>
          {data.exertionClassification !== "Unspecified" ? (
            <Chip tone={exertionTone[data.exertionClassification]} className="bg-white">
              {data.exertionClassification} work
            </Chip>
          ) : null}
        </div>
      </Callout>

      {demands.length > 0 ? (
        <Section icon={HardHat} title="Physical demands" tone="amber">
          <Bullets items={demands} />
        </Section>
      ) : null}
    </div>
  );
}
