import { ClipboardCheck, ClipboardList, Scissors } from "lucide-react";
import type { StoredExtraction } from "../../../../../../../../backend/src/ai/gemini/registry";
import {
  Bullets,
  Callout,
  Chip,
  DiagnosisItems,
  Field,
  has,
  humanize,
  isNone,
  Prose,
  Section,
  TextField,
} from "./parts";

type Surgery = StoredExtraction<"surgery_report">;

export function SurgeryView({ data }: { data: Surgery }) {
  const regions = [
    ...new Set(
      data.proceduresPerformed
        .map((procedure) => procedure.region)
        .filter((region) => region !== "unclear")
    ),
  ];
  const diagnoses = data.preOpDiagnoses.length > 0 || data.postOpDiagnoses.length > 0;
  const operative =
    has(data.operativeFindings) || data.implantsAndHardware.length > 0 || has(data.complications);

  return (
    <div className="space-y-5">
      {regions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {regions.map((region) => (
            <Chip key={region}>{humanize(region)}</Chip>
          ))}
        </div>
      ) : null}

      {data.proceduresPerformed.length > 0 ? (
        <Callout tone="rose" label={data.proceduresPerformed.length === 1 ? "Procedure" : "Procedures"}>
          <ul className="space-y-0.5">
            {data.proceduresPerformed.map((procedure, i) => (
              <li key={i} className="text-[13.5px] font-medium text-rose-950">
                {procedure.name}
                {has(procedure.bodySite) ? (
                  <span className="font-normal text-rose-900/70"> · {procedure.bodySite}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {diagnoses ? (
        <Section icon={ClipboardCheck} title="Diagnoses" tone="amber">
          {data.preOpDiagnoses.length > 0 ? (
            <Field label="Pre-operative">
              <DiagnosisItems diagnoses={data.preOpDiagnoses} />
            </Field>
          ) : null}
          {data.postOpDiagnoses.length > 0 ? (
            <Field label="Post-operative">
              <DiagnosisItems diagnoses={data.postOpDiagnoses} />
            </Field>
          ) : null}
        </Section>
      ) : null}

      {operative ? (
        <Section icon={Scissors} title="Operative" tone="violet">
          <TextField label="Findings" text={data.operativeFindings} />
          {data.implantsAndHardware.length > 0 ? (
            <Field label="Implants & hardware">
              <Bullets items={data.implantsAndHardware} />
            </Field>
          ) : null}
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

      {has(data.postOpPlanAndRestrictions) ? (
        <Section icon={ClipboardList} title="Post-op plan" tone="emerald">
          <Prose text={data.postOpPlanAndRestrictions} />
        </Section>
      ) : null}
    </div>
  );
}
