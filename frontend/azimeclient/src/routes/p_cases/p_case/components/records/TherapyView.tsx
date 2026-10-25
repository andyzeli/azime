import { Dumbbell, MessageSquareText, Ruler } from "lucide-react";
import type { StoredExtraction } from "../../../../../../../../backend/src/ai/gemini/registry";
import {
  Bullets,
  Callout,
  Chip,
  Field,
  has,
  humanize,
  ItemList,
  Section,
  TextField,
  EvidenceItem,
  Prose,
  type Tone,
} from "./parts";

type Therapy = StoredExtraction<"therapy_note">;

const noteTypeStyle: Record<Therapy["noteType"], { label: string; tone: Tone } | null> = {
  initial_eval: { label: "Initial evaluation", tone: "emerald" },
  progress_note_or_reeval: { label: "Progress note / re-eval", tone: "emerald" },
  daily_note: { label: "Daily note", tone: "slate" },
  discharge_summary: { label: "Discharge summary", tone: "amber" },
  unspecified: null,
};

// Active care vs passive care is the distinction reviewers look for.
const therapyTone: Record<Therapy["therapiesPerformed"][number]["type"], Tone> = {
  active_exercise: "emerald",
  functional_training: "emerald",
  home_exercise_program: "emerald",
  manual_therapy: "slate",
  passive_modalities: "slate",
  aquatic_therapy: "slate",
  other: "slate",
};

export function TherapyView({ data }: { data: Therapy }) {
  const noteType = noteTypeStyle[data.noteType];
  const regions = data.regions.filter((region) => region !== "unclear");
  const objective = data.objectiveMetrics.length > 0 || data.functionalLimitations.length > 0;
  const treatment = data.therapiesPerformed.length > 0 || has(data.followUpPlan);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {noteType ? <Chip tone={noteType.tone}>{noteType.label}</Chip> : null}
        {regions.map((region) => (
          <Chip key={region}>{humanize(region)}</Chip>
        ))}
      </div>

      {has(data.therapistAssessment) ? (
        <Callout tone="emerald" label="Therapist assessment">
          <Prose text={data.therapistAssessment} className="text-[13.5px] font-medium text-emerald-950" />
        </Callout>
      ) : null}

      {has(data.historyOfPresentIllness) ? (
        <Section icon={MessageSquareText} title="Subjective" tone="sky">
          <Prose text={data.historyOfPresentIllness} />
        </Section>
      ) : null}

      {objective ? (
        <Section icon={Ruler} title="Objective" tone="violet">
          {data.objectiveMetrics.length > 0 ? (
            <Field label="Measurements">
              <Bullets items={data.objectiveMetrics} />
            </Field>
          ) : null}
          {data.functionalLimitations.length > 0 ? (
            <Field label="Functional limitations">
              <Bullets items={data.functionalLimitations} />
            </Field>
          ) : null}
        </Section>
      ) : null}

      {treatment ? (
        <Section icon={Dumbbell} title="Treatment" tone="emerald">
          {data.therapiesPerformed.length > 0 ? (
            <Field label="Performed this visit">
              <ItemList>
                {data.therapiesPerformed.map((therapy, i) => (
                  <EvidenceItem key={i}>
                    <Chip tone={therapyTone[therapy.type]}>{humanize(therapy.type)}</Chip>
                    {has(therapy.detail) ? (
                      <div className="mt-1 text-[13px] text-slate-800">{therapy.detail}</div>
                    ) : null}
                  </EvidenceItem>
                ))}
              </ItemList>
            </Field>
          ) : null}
          <TextField label="Plan" text={data.followUpPlan} />
        </Section>
      ) : null}
    </div>
  );
}
