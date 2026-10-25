import {
  ClipboardCheck,
  ListChecks,
  MessageSquareText,
  Stethoscope,
} from "lucide-react";
import type { StoredExtraction } from "../../../../../../../../backend/src/ai/gemini/registry";
import {
  Callout,
  Chip,
  DiagnosisItems,
  EvidenceItem,
  Field,
  has,
  humanize,
  isNone,
  ItemList,
  Prose,
  Section,
  SourceText,
  TextField,
  TreatmentChips,
  WorkStatusBlock,
  type Tone,
} from "./parts";

type Encounter = StoredExtraction<"encounter">;

const medicationTone: Record<Encounter["medications"][number]["action"], Tone> = {
  Ordered: "emerald",
  Stopped: "rose",
  Current: "slate",
};

const imagingRelationship = {
  performed_at_visit: "Performed at visit",
  results_reviewed: "Results reviewed",
  historical_reference: "Prior study referenced",
  unclear: null,
};

export function EncounterView({ data }: { data: Encounter }) {
  const regions = data.regions.filter((region) => region !== "unclear");
  const workStatusDocumented =
    data.workStatus.status !== "unknown" || data.workStatus.restrictions.length > 0;

  const subjective =
    has(data.historyOfPresentIllness) ||
    has(data.reviewOfSystems) ||
    has(data.pastMedicalHistory) ||
    data.functionalLimitations.length > 0;
  const objective =
    has(data.objective) || data.imagingFindings.length > 0 || data.treatmentsPerformed.length > 0;
  const assessment = has(data.assessment) || data.diagnoses.length > 0;
  const plan =
    data.medications.length > 0 ||
    data.diagnosticOrders.length > 0 ||
    data.referrals.length > 0 ||
    workStatusDocumented ||
    has(data.followUpPlan);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="sky">{data.visitType === "initial_visit" ? "Initial visit" : "Follow-up"}</Chip>
        {regions.map((region) => (
          <Chip key={region}>{humanize(region)}</Chip>
        ))}
        {has(data.reportedDateOfInjury) ? <Chip>DOI {data.reportedDateOfInjury}</Chip> : null}
      </div>

      {has(data.chiefComplaint) ? (
        <Callout tone="sky" label="Chief complaint">
          <Prose text={data.chiefComplaint} className="text-[13.5px] font-medium text-sky-950" />
        </Callout>
      ) : null}

      {subjective ? (
        <Section icon={MessageSquareText} title="Subjective" tone="sky">
          <TextField label="History of present illness" text={data.historyOfPresentIllness} />
          <TextField label="Review of systems" text={data.reviewOfSystems} />
          <TextField label="Past medical history" text={data.pastMedicalHistory} />
          {data.functionalLimitations.length > 0 ? (
            <Field label="Functional limitations">
              <ItemList>
                {data.functionalLimitations.map((limitation, i) => (
                  <EvidenceItem key={i} evidence={limitation.evidence}>
                    <div className="text-[13px] font-medium text-slate-900">{limitation.activity}</div>
                    {has(limitation.status) ? (
                      <div className="text-[12.5px] text-slate-600">{limitation.status}</div>
                    ) : null}
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
        </Section>
      ) : null}

      {objective ? (
        <Section icon={Stethoscope} title="Objective" tone="violet">
          <TextField label="Examination" text={data.objective} />
          {data.imagingFindings.length > 0 ? (
            <Field label="Imaging">
              <ItemList>
                {data.imagingFindings.map((finding, i) => (
                  <EvidenceItem key={i} evidence={finding.evidence}>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-slate-900">
                      <Chip tone="purple">{finding.modality}</Chip>
                      {finding.bodyPart}
                      {has(finding.date) ? <span className="text-slate-500">· {finding.date}</span> : null}
                    </div>
                    <div className="mt-0.5 text-[13px] text-slate-800">{finding.impression}</div>
                    {imagingRelationship[finding.relationshipToVisit] ? (
                      <div className="text-[11.5px] text-slate-500">
                        {imagingRelationship[finding.relationshipToVisit]}
                      </div>
                    ) : null}
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
          {data.treatmentsPerformed.length > 0 ? (
            <Field label="Performed this visit">
              <ItemList>
                {data.treatmentsPerformed.map((treatment, i) => (
                  <EvidenceItem key={i}>
                    <div className="text-[13px] font-medium text-slate-900">
                      {treatment.name}
                      {has(treatment.bodySite) ? (
                        <span className="font-normal text-slate-500"> · {treatment.bodySite}</span>
                      ) : null}
                    </div>
                    <TreatmentChips treatment={treatment} />
                    {treatment.medicationsInjected.length > 0 ? (
                      <div className="mt-1 text-[12.5px] text-slate-700">
                        {treatment.medicationsInjected
                          .map((med) => [med.name, med.dose].filter(has).join(" "))
                          .join(", ")}
                      </div>
                    ) : null}
                    {has(treatment.immediate_response) ? (
                      <div className="mt-0.5 text-[12.5px] text-slate-600">
                        Response: {treatment.immediate_response}
                      </div>
                    ) : null}
                    {has(treatment.complications) && !isNone(treatment.complications) ? (
                      <div className="mt-0.5 text-[12.5px] text-rose-700">
                        Complications: {treatment.complications}
                      </div>
                    ) : null}
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
        </Section>
      ) : null}

      {assessment ? (
        <Section icon={ClipboardCheck} title="Assessment" tone="amber">
          <TextField label="Impression" text={data.assessment} />
          {data.diagnoses.length > 0 ? (
            <Field label="Diagnoses">
              <DiagnosisItems diagnoses={data.diagnoses} />
            </Field>
          ) : null}
        </Section>
      ) : null}

      {plan ? (
        <Section icon={ListChecks} title="Plan" tone="emerald">
          {data.medications.length > 0 ? (
            <Field label="Medications">
              <ItemList>
                {data.medications.map((med, i) => (
                  <EvidenceItem key={i} evidence={med.evidence}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-medium text-slate-900">{med.name}</span>
                      <Chip tone={medicationTone[med.action]}>{med.action}</Chip>
                    </div>
                    {has(med.dose) || has(med.frequency) ? (
                      <div className="text-[12.5px] text-slate-600">
                        {[med.dose, med.frequency].filter(has).join(" · ")}
                      </div>
                    ) : null}
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
          {data.diagnosticOrders.length > 0 ? (
            <Field label="Orders">
              <ItemList>
                {data.diagnosticOrders.map((order, i) => (
                  <EvidenceItem key={i}>
                    <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-slate-900">
                      <Chip tone="purple">{humanize(order.modality)}</Chip>
                      {order.bodyPart}
                    </div>
                    <SourceText text={order.sourceText} />
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
          {data.referrals.length > 0 ? (
            <Field label="Referrals">
              <ItemList>
                {data.referrals.map((referral, i) => (
                  <EvidenceItem key={i}>
                    <div className="text-[13px] font-medium text-slate-900">
                      {humanize(referral.specialty)}
                      {has(referral.bodyPart) ? (
                        <span className="font-normal text-slate-500"> · {referral.bodyPart}</span>
                      ) : null}
                    </div>
                    {has(referral.purpose) ? (
                      <div className="text-[12.5px] text-slate-600">{referral.purpose}</div>
                    ) : null}
                    <SourceText text={referral.sourceText} />
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
          {workStatusDocumented ? (
            <Field label="Work status">
              <WorkStatusBlock {...data.workStatus} />
            </Field>
          ) : null}
          <TextField label="Follow-up" text={data.followUpPlan} />
        </Section>
      ) : null}
    </div>
  );
}
