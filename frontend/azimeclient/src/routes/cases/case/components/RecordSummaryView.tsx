import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { StoredRecordSummary } from "../../../../../../../backend/src/gemini/recordSummarySchema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Markdown from "react-markdown";
type RecordSummaryViewProps = {
  summary: StoredRecordSummary | null;
  parseError?: string | null;
};

type DetailField = {
  label: string;
  value: string;
};

type ListItem = Record<string, string>;

const hasText = (value: string | null | undefined) =>
  (value?.trim().length ?? 0) > 0;

const Section = ({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <section className="rounded-lg border border-slate-200 bg-slate-50">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            {title}
          </h4>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="border-t border-slate-200 pt-3">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};

const DetailGrid = ({ fields }: { fields: DetailField[] }) => {
  const visibleFields = fields.filter((field) => hasText(field.value));

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {visibleFields.map((field) => (
        <div key={field.label}>
          <dt className="text-xs font-xl uppercase tracking-wide text-blue-500">
            {field.label}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
            <Markdown>{field.value}</Markdown>
          </dd>
        </div>
      ))}
    </dl>
  );
};

const ListSection = ({
  items,
  emptyLabel,
}: {
  items: ListItem[];
  emptyLabel: string;
}) => {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${Object.values(item).join("-")}-${index}`}
          className="rounded-md border border-slate-200 bg-white p-3"
        >
          <DetailGrid
            fields={Object.entries(item).map(([label, value]) => ({
              label,
              value,
            }))}
          />
        </div>
      ))}
    </div>
  );
};

const RecordSummaryView = ({ summary, parseError }: RecordSummaryViewProps) => {
  if (parseError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Structured summary could not be displayed because it did not match the
        current schema.
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        No structured summary is available for this record yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* <Section title="Overview" defaultOpen>
        <DetailGrid
          fields={[
            {
              label: "Dates of Service",
              value: summary.datesOfService.join(", "),
            },
            {
              label: "Provider", 
              value: summary.sourceMetadata.providerName,
            },
            {
              label: "Document Type",
              value: summary.sourceMetadata.documentType,
            },
          ]}
        />
      </Section>

      <Section title="Background">
        <DetailGrid
          fields={[
            {
              label: "Incident Date",
              value: summary.background.incidentDate || "",
            },
            {
              label: "Incident Description",
              value: summary.background.incidentDescription || "",
            },
            {
              label: "Past Medical History",
              value: summary.background.pastMedicalHistory || "",
            },
            {
              label: "Allergies",
              value: summary.background.allergies || "" ,
            },
          ]}
        />
      </Section>

      <Section title="Findings">
        <DetailGrid
          fields={[
            { label: "Subjective", value: summary.findings.subjective },
            { label: "Objective", value: summary.findings.objective },
            { label: "Plan", value: summary.findings.plan },
            { label: "Outcome", value: summary.findings.outcome },
          ]}
        />
      </Section>

      <Section title="Diagnoses">
        <ListSection
          items={summary.diagnoses.map((diagnosis) => ({
            Name: diagnosis.name,
            ICD: diagnosis.icd,
            Description: diagnosis.description,
          }))}
          emptyLabel="No diagnoses captured."
        />
      </Section>

      <Section title="Treatments Tried">
        <ListSection
          items={summary.treatmentsTried.map((treatment) => ({
            Treatment: treatment.treatment,
            Status: treatment.status,
            Outcome: treatment.outcome,
          }))}
          emptyLabel="No treatments captured."
        />
      </Section>

      <Section title="Medications">
        <ListSection
          items={summary.medications.map((medication) => ({
            Name: medication.name,
            Dose: medication.dose,
            Frequency: medication.frequency,
          }))}
          emptyLabel="No medications captured."
        />
      </Section>

      <Section title="Imaging Findings">
        <ListSection
          items={summary.imagingFindings.map((finding) => ({
            Modality: finding.modality,
            Date: finding.date,
            Finding: finding.finding,
          }))}
          emptyLabel="No imaging findings captured."
        />
      </Section>

      <Section title="Functional Limitations">
        <ListSection
          items={summary.functionalLimitations.map((limitation) => ({
            Limitation: limitation.limitation,
            Status: limitation.status,
          }))}
          emptyLabel="No functional limitations captured."
        />
      </Section>

      <Section title="Work Status">
        <ListSection
          items={summary.workStatus.map((status) => ({
            "As Of": status.asOfdate,
            Status: status.status,
          }))}
          emptyLabel="No work status captured."
        />
      </Section> */}
    </div>
  );
};

export default RecordSummaryView;
