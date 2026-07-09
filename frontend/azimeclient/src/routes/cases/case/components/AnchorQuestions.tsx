import * as React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ScaleInput from "./ScaleInput";

interface AnchorQuestionsProps {
  onChange: (answers: Record<string, string>) => void;
  initialValues?: Record<string, string>;
}

const AnchorQuestions = ({
  onChange,
  initialValues = {},
}: AnchorQuestionsProps) => {
  const [answers, setAnswers] =
    React.useState<Record<string, string>>(initialValues);

  const handleChange = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    onChange(newAnswers);
  };

  // Question configurations
  const questions = {
    yesNo: [
      {
        id: "q1",
        text: "Does the claimant require supportive or maintenance care for their condition?",
      },
      {
        id: "q2",
        text: "Is additional or future treatment medically necessary?",
      },
    ],
    threeState: [
      { id: "q3", text: "Are there pre-existing conditions?" },
      { id: "q4", text: "Has MMI been reached?" },
      { id: "q5", text: "Is surgery indicated?" },
      {
        id: "q6",
        text: "Are there significant lifestyle, psychosocial, or comorbid factors affecting the claimant’s recovery?",
      },
      {
        id: "q7",
        text: "Is the claimant capable of returning to full-duty work?",
      },
    ],
    fiveAgree: [
      { id: "q8", text: "Patient is compliant with treatment plan" },
      {
        id: "q9",
        text: "How well do the imaging results and diagnostic tests support the diagnoses",
      },
      { id: "q10", text: "Patient understands treatment goals" },
    ],
    fiveAppropriate: [
      {
        id: "q12",
        text: "Were the treatments received appropriate and necessary for the claimant’s condition",
      },
    ],
    fiveLikelihood: [
      {
        id: "q13",
        text: "How likely is it that the claimant’s diagnoses are directly related to the incident",
      },
      {
        id: "q14",
        text: "How likely is it that the claimant has permanent impairment resulting from the injury",
      },
      {
        id: "q15",
        text: "How likely is it that the claimant’s current condition is primarily caused by the reported incident?",
      },
    ],
    fiveSeverity: [
      {
        id: "q16",
        text: "To what extent does the claimant have physical limitations as a result of the injury",
      },
    ],
  };

  const renderQuestion = (
    q: { id: string; text: string },
    type:
      | "yesNo"
      | "threeState"
      | "fiveAgree"
      | "fiveAppropriate"
      | "fiveLikelihood"
      | "fiveSeverity"
  ) => {
    const labels = {
      yesNo: ["No", "Yes"],
      threeState: ["No", "Unknown", "Yes"],
      fiveAgree: [
        "Strongly Disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly Agree",
      ],
      fiveAppropriate: [
        "Not Appropriate",
        "Somewhat Appropriate",
        "Appropriate",
        "Mostly Appropriate",
        "Completely Appropriate",
      ],
      fiveLikelihood: ["Very Low", "Low", "Medium", "High", "Very High"],
      fiveSeverity: ["None", "Mild", "Moderate", "Severe", "Very Severe"],//none is 0, mild is 1, moderate is 2, severe is 3, very severe is 4
    }[type];

    return (
      <div key={q.id} className="space-y-3">
        <Label className="text-sm font-medium">{q.text}</Label>
        <ScaleInput
          value={answers[q.id] ? labels.indexOf(answers[q.id]) : 0}
          onChange={(index) => handleChange(q.id, labels[index])}
          labels={labels}
          variant={
            type === "fiveAgree" ||
            type === "fiveAppropriate" ||
            type === "fiveLikelihood" ||
            type === "fiveSeverity"
              ? "slider"
              : "pills"
          }
          colorGradient={true}
          size="md"
        />
      </div>
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        Anchor Questions
      </h3>

      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Yes/No Questions */}
          {questions.yesNo.slice(0, 2).map((q) => renderQuestion(q, "yesNo"))}

          {/* Three-State Questions */}
          {questions.threeState
            .slice(0, 2)
            .map((q) => renderQuestion(q, "threeState"))}

          {/* Five-State Questions */}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Remaining Yes/No Questions */}
          {questions.yesNo.slice(2).map((q) => renderQuestion(q, "yesNo"))}

          {/* Remaining Three-State Questions */}
          {questions.threeState
            .slice(2)
            .map((q) => renderQuestion(q, "threeState"))}

          {/* Remaining Five-State Questions */}
        </div>
      </div>
      <div className="w-2/3 mt-10 flex flex-col gap-4">
        {questions.fiveAgree.map((q) => renderQuestion(q, "fiveAgree"))}
        {questions.fiveAppropriate.map((q) =>
          renderQuestion(q, "fiveAppropriate")
        )}
        {questions.fiveLikelihood.map((q) =>
          renderQuestion(q, "fiveLikelihood")
        )}
        {questions.fiveSeverity.map((q) => renderQuestion(q, "fiveSeverity"))}
      </div>
    </Card>
  );
};

export default AnchorQuestions;
