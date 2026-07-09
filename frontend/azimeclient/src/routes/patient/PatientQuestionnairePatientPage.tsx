import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  patientQuestionnaireByTokenQueryOptions,
  submitPatientQuestionnaire,
} from "../cases/queries";

type Answers = Record<string, number | null>;

const createBlankAnswers = (questionIds: string[]): Answers =>
  questionIds.reduce((answers, itemId) => {
    answers[itemId] = null;
    return answers;
  }, {} as Answers);

export default function PatientQuestionnairePatientPage() {
  const { accessToken } = useParams({
    from: "/patient/questionnaires/$accessToken",
  });
  const query = useQuery(patientQuestionnaireByTokenQueryOptions(accessToken));
  const displayedQuestionnaire = query.data;
  const definition = displayedQuestionnaire?.definition;
  const questionIds = useMemo(
    () => definition?.questions.map((question) => question.id) ?? [],
    [definition],
  );
  const [answers, setAnswers] = useState<Answers>(() =>
    createBlankAnswers(questionIds),
  );

  useEffect(() => {
    setAnswers(createBlankAnswers(questionIds));
  }, [questionIds]);

  useEffect(() => {
    if (!displayedQuestionnaire?.responses.length) {
      return;
    }

    setAnswers((currentAnswers) => {
      const nextAnswers = { ...currentAnswers };
      displayedQuestionnaire.responses.forEach((response) => {
        if (response.itemId in nextAnswers) {
          nextAnswers[response.itemId] = response.score;
        }
      });
      return nextAnswers;
    });
  }, [displayedQuestionnaire]);

  const submitMutation = useMutation({
    mutationFn: submitPatientQuestionnaire,
  });

  const completedCount = useMemo(
    () => Object.values(answers).filter((score) => score !== null).length,
    [answers],
  );
  const isSubmittable = completedCount > 0;
  const submittedQuestionnaire = submitMutation.data ?? displayedQuestionnaire;
  const patientName = [
    displayedQuestionnaire?.patientCase?.patientName,
    displayedQuestionnaire?.patientCase?.patientLastName,
  ]
    .filter(Boolean)
    .join(" ");
  const groupedQuestions = useMemo(() => {
    if (!definition) {
      return {};
    }

    return definition.questions.reduce(
      (groups, question) => {
        groups[question.group] = [...(groups[question.group] ?? []), question];
        return groups;
      },
      {} as Record<string, typeof definition.questions>,
    );
  }, [definition]);

  const handleAnswer = (itemId: string, score: number) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [itemId]: score,
    }));
  };

  const handleSubmit = () => {
    if (!isSubmittable || !definition) {
      return;
    }

    submitMutation.mutate({
      accessToken,
      responses: definition.questions
        .map((question) => ({
          itemId: question.id,
          score: answers[question.id],
        }))
        .filter(
          (response): response is { itemId: string; score: number } =>
            response.score !== null,
        ),
    });
  };

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-700">
        Loading questionnaire...
      </div>
    );
  }

  if (query.isError || !displayedQuestionnaire || !definition) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
          <h1 className="text-2xl font-semibold text-slate-900">
            Questionnaire unavailable
          </h1>
          <p className="mt-3 text-slate-600">
            Please return the iPad to a staff member.
          </p>
        </div>
      </div>
    );
  }

  if (submittedQuestionnaire?.status === "completed") {
    const score = submittedQuestionnaire.scores;

    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 text-center shadow">
          <p className="text-sm font-medium uppercase tracking-wide text-green-700">
            Completed
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Thank you
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Please return the iPad to a staff member.
          </p>
          {score ? (
            <div className="mt-8 rounded-lg bg-slate-50 p-5 text-left">
              <p className="font-medium text-slate-800">Recorded score</p>
              <p className="mt-2 text-slate-700">
                Total {score.totalScore}/{score.maxScore} across{" "}
                {score.denominator} answered item
                {score.denominator === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
          <Link
            to="/cases/$caseId"
            params={{ caseId: String(displayedQuestionnaire.caseId) }}
            className="mt-8 inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-slate-700"
          >
            Return to case
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <header className="rounded-lg bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
            {definition.title}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">
            {patientName || "Patient questionnaire"}
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">
            {definition.instructions}
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-700 transition-all"
              style={{
                width: `${(completedCount / definition.questions.length) * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {completedCount} of {definition.questions.length} answered
          </p>
        </header>

        <main className="mt-5 space-y-5">
          {Object.entries(groupedQuestions).map(([group, questions]) => (
            <section key={group} className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">{group}</h2>
              <div className="mt-4 space-y-5">
                {questions.map((question) => {
                  const isCompactScale = question.options.every(
                    (option) => option.label === String(option.value),
                  );

                  return (
                    <div
                      key={question.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-lg font-medium text-slate-900">
                          {question.prompt}
                        </p>
                        <p className="text-sm text-slate-500">
                          {answers[question.id] === null
                            ? "Not answered"
                            : `Selected ${answers[question.id]}`}
                        </p>
                      </div>
                      <div
                        className={
                          isCompactScale
                            ? "mt-4 grid grid-cols-6 gap-2 sm:grid-cols-11"
                            : "mt-4 grid gap-2"
                        }
                      >
                        {question.options.map((option) => {
                          const isSelected =
                            answers[question.id] === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                handleAnswer(question.id, option.value)
                              }
                              className={`rounded-md border font-semibold transition-colors ${
                                isCompactScale
                                  ? "flex h-12 items-center justify-center text-lg sm:h-14"
                                  : "min-h-14 px-4 py-3 text-left text-base"
                              } ${
                                isSelected
                                  ? "border-blue-700 bg-blue-700 text-white"
                                  : "border-slate-300 bg-white text-slate-800 hover:bg-blue-50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </main>

        {submitMutation.isError ? (
          <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            We could not submit the questionnaire. Please ask staff for help.
          </p>
        ) : null}

        <div className="sticky bottom-0 mt-6 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              {isSubmittable
                ? `${completedCount} answered, ${
                    definition.questions.length - completedCount
                  } unanswered`
                : "Answer at least one item to submit"}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isSubmittable || submitMutation.isPending}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-green-700 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
