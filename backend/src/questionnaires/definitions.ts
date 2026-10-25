import type { PatientQuestionnaireResponse } from "../db/schema.js";

export type QuestionnaireType =
  "pain_disability" | "lower_back_regional" | "neck_regional";

export type QuestionnaireOption = {
  value: number;
  label: string;
};

export type QuestionnaireQuestion = {
  id: string;
  group: string;
  prompt: string;
  options: QuestionnaireOption[];
};

export type QuestionnaireScores = {
  totalScore: number;
  denominator: number;
  maxScore: number;
  percentage: number | null;
};

export type QuestionnaireDefinition = {
  type: QuestionnaireType;
  version: string;
  title: string;
  instructions: string;
  questions: QuestionnaireQuestion[];
  scoreResponses: (
    responses: PatientQuestionnaireResponse[]
  ) => QuestionnaireScores;
};

const numericScale = (max: number) =>
  Array.from({ length: max + 1 }, (_, value) => ({
    value,
    label: String(value),
  }));

const limitationScale = (activity: string): QuestionnaireOption[] => [
  { value: 0, label: `I can ${activity} without pain.` },
  { value: 1, label: `I can ${activity} with very mild pain.` },
  { value: 2, label: `I can ${activity} with mild pain.` },
  { value: 3, label: `${activity} causes moderate pain.` },
  { value: 4, label: `${activity} causes severe pain.` },
  { value: 5, label: `I cannot ${activity} because of pain.` },
];

const scoreByAnsweredItems =
  (questions: QuestionnaireQuestion[]) =>
  (responses: PatientQuestionnaireResponse[]): QuestionnaireScores => {
    const questionById = new Map(
      questions.map((question) => [question.id, question])
    );
    const scoredResponses = responses.filter((response) =>
      questionById.has(response.itemId)
    );
    const totalScore = scoredResponses.reduce(
      (total, response) => total + response.score,
      0
    );
    const maxScore = scoredResponses.reduce((total, response) => {
      const question = questionById.get(response.itemId);
      const questionMax = Math.max(
        ...(question?.options ?? []).map((option) => option.value)
      );

      return total + questionMax;
    }, 0);

    return {
      totalScore,
      denominator: scoredResponses.length,
      maxScore,
      percentage:
        maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : null,
    };
  };

const pdqQuestions: QuestionnaireQuestion[] = [
  {
    id: "work_usual_activity",
    group: "Function",
    prompt: "Work inside and outside the home",
    options: numericScale(10),
  },
  {
    id: "lifting_high",
    group: "Function",
    prompt: "Lift overhead, grasp objects, or reach above shoulder level",
    options: numericScale(10),
  },
  {
    id: "lifting_low",
    group: "Function",
    prompt: "Lifting from below waist level, bending, or stooping",
    options: numericScale(10),
  },
  {
    id: "personal_care",
    group: "Function",
    prompt: "Personal care (washing, dressing, etc.)",
    options: numericScale(10),
  },
  {
    id: "sit_stand",
    group: "Function",
    prompt: "Affect ability to sit or stand",
    options: numericScale(10),
  },
  {
    id: "travel",
    group: "Function",
    prompt: "Interfere with travel by car, bus, train, or airplane",
    options: numericScale(10),
  },
  {
    id: "walk_run",
    group: "Function",
    prompt: "Limits Walking or running",
    options: numericScale(10),
  },
  {
    id: "income",
    group: "Function",
    prompt: "Interfere with Income or ability to earn",
    options: numericScale(10),
  },
  {
    id: "meds",
    group: "Care",
    prompt: "Need for medication (10 being the highest need)",
    options: numericScale(10),
  },
  {
    id: "see_doctor_more",
    group: "Care",
    prompt: "Need to see a doctor more often",
    options: numericScale(10),
  },
  {
    id: "seeing_friend_family",
    group: "Social",
    prompt: "Interfere with ability to see friends or family",
    options: numericScale(10),
  },
  {
    id: "recreation",
    group: "Social",
    prompt: "Interfere with Recreation and hobbies important to you",
    options: numericScale(10),
  },
  {
    id: "adl_help",
    group: "Function",
    prompt: "Need help with daily activities",
    options: numericScale(10),
  },
  {
    id: "mood",
    group: "Well-being",
    prompt: "Feel more depressed, tense, or anxious than usual",
    options: numericScale(10),
  },
  {
    id: "emotions",
    group: "Well-being",
    prompt:
      "Emotional problems caused by your pain that interfere with family, social, or work activities",
    options: numericScale(10),
  },
];

const lowerBackQuestions: QuestionnaireQuestion[] = [
  {
    id: "walking",
    group: "Lower back",
    prompt: "Walking",
    options: limitationScale("walk"),
  },
  {
    id: "sitting",
    group: "Lower back",
    prompt: "Sitting",
    options: limitationScale("sit"),
  },
  {
    id: "standing",
    group: "Lower back",
    prompt: "Standing",
    options: limitationScale("stand"),
  },
  {
    id: "work_usual_activity",
    group: "Lower back",
    prompt: "Work or usual daily activity",
    options: limitationScale("do my usual daily activities"),
  },
  {
    id: "lifting",
    group: "Lower back",
    prompt: "Lifting",
    options: limitationScale("lift"),
  },
  {
    id: "personal_care",
    group: "Lower back",
    prompt: "Personal care",
    options: limitationScale("care for myself"),
  },
  {
    id: "pain_intensity",
    group: "Lower back",
    prompt: "Pain intensity",
    options: numericScale(5),
  },
  {
    id: "sex",
    group: "Lower back",
    prompt: "Sex life",
    options: limitationScale("participate in sex"),
  },
  {
    id: "social",
    group: "Lower back",
    prompt: "Social life",
    options: limitationScale("participate socially"),
  },
  {
    id: "travel",
    group: "Lower back",
    prompt: "Travel",
    options: limitationScale("travel"),
  },
];

const neckQuestions: QuestionnaireQuestion[] = [
  {
    id: "reading",
    group: "Neck",
    prompt: "Reading",
    options: limitationScale("read"),
  },
  {
    id: "headaches",
    group: "Neck",
    prompt: "Headaches",
    options: numericScale(5),
  },
  {
    id: "concentration",
    group: "Neck",
    prompt: "Concentration",
    options: limitationScale("concentrate"),
  },
  {
    id: "work_usual_activity",
    group: "Neck",
    prompt: "Work or usual daily activity",
    options: limitationScale("do my usual daily activities"),
  },
  {
    id: "lifting",
    group: "Neck",
    prompt: "Lifting",
    options: limitationScale("lift"),
  },
  {
    id: "personal_care",
    group: "Neck",
    prompt: "Personal care",
    options: limitationScale("care for myself"),
  },
  {
    id: "pain_intensity",
    group: "Neck",
    prompt: "Pain intensity",
    options: numericScale(5),
  },
  {
    id: "driving",
    group: "Neck",
    prompt: "Driving",
    options: limitationScale("drive"),
  },
  {
    id: "sleep",
    group: "Neck",
    prompt: "Sleep",
    options: limitationScale("sleep"),
  },
  {
    id: "recreation_social",
    group: "Neck",
    prompt: "Recreation or social activity",
    options: limitationScale("participate in recreation or social activity"),
  },
];

export const questionnaireDefinitions = {
  pain_disability: {
    type: "pain_disability",
    version: "pdq-v1",
    title: "Pain Disability Questionnaire",
    instructions:
      "For each area, choose how much pain limits you today. 0 means no limitation and 10 means the most severe limitation.",
    questions: pdqQuestions,
    scoreResponses: scoreByAnsweredItems(pdqQuestions),
  },
  lower_back_regional: {
    type: "lower_back_regional",
    version: "lower-back-regional-v1",
    title: "Lower Back Regional Questionnaire",
    instructions:
      "Choose the statement that best describes how your lower back symptoms affect each activity today.",
    questions: lowerBackQuestions,
    scoreResponses: scoreByAnsweredItems(lowerBackQuestions),
  },
  neck_regional: {
    type: "neck_regional",
    version: "neck-regional-v1",
    title: "Neck Regional Questionnaire",
    instructions:
      "Choose the statement that best describes how your neck symptoms affect each activity today.",
    questions: neckQuestions,
    scoreResponses: scoreByAnsweredItems(neckQuestions),
  },
} satisfies Record<QuestionnaireType, QuestionnaireDefinition>;

export const questionnaireTypes = Object.keys(
  questionnaireDefinitions
) as QuestionnaireType[];

export const getQuestionnaireDefinition = (type: string) => {
  if (type in questionnaireDefinitions) {
    return questionnaireDefinitions[type as QuestionnaireType];
  }

  return null;
};
