import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  questionnaireDefinitions,
  questionnaireTypes,
  type QuestionnaireType,
} from "@azime/contracts";
import {
  createPatientQuestionnaire,
  deletePatientQuestionnaire,
  patientQuestionnairesQueryOptions,
} from "../../queries";

const formatDate = (value: Date | string | null) => {
  if (!value) {
    return "Not completed";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const getStatusClassName = (status: string) => {
  if (status === "completed") {
    return "bg-green-100 text-green-800";
  }

  return "bg-amber-100 text-amber-800";
};

export default function PatientQuestionnairesPanel({
  caseId,
  embedded = false,
}: {
  caseId: string;
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] =
    useState<QuestionnaireType>("pain_disability");
  const questionnairesQuery = useQuery(
    patientQuestionnairesQueryOptions(caseId),
  );

  const navigateToPatientForm = (accessToken: string) => {
    navigate({
      to: "/patient/questionnaires/$accessToken",
      params: { accessToken },
    });
  };

  const createMutation = useMutation({
    mutationFn: createPatientQuestionnaire,
    mutationKey: ["patientQuestionnaires", "create"],
    onSuccess: (questionnaire) => {
      queryClient.invalidateQueries({
        queryKey: ["patientQuestionnaires"],
      });
      navigateToPatientForm(questionnaire.accessToken);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatientQuestionnaire,
    mutationKey: ["patientQuestionnaires", "delete"],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patientQuestionnaires"],
      });
    },
  });

  const handleStart = () => {
    createMutation.mutate({
      caseId: Number(caseId),
      type: selectedType,
      appointmentId: null,
    });
  };

  const handleDelete = (questionnaireId: number) => {
    const confirmed = window.confirm(
      "Delete this in-progress questionnaire? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(questionnaireId);
  };

  return (
    <div
      className={
        embedded
          ? "border-b border-slate-200 pb-6"
          : "mb-8 rounded-lg bg-white p-6 shadow-md"
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Patient Questionnaires
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            In-clinic forms for staff to open on this device and hand to the
            patient.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-gray-700">
            <span className="sr-only">Questionnaire type</span>
            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value as QuestionnaireType)
              }
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {questionnaireTypes.map((type) => (
                <option key={type} value={type}>
                  {questionnaireDefinitions[type].title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleStart}
            disabled={createMutation.isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {createMutation.isPending ? "Opening..." : "Open Patient Form"}
          </button>
        </div>
      </div>

      {createMutation.isError ? (
        <p className="mt-3 text-sm text-red-600">
          Failed to open questionnaire. Please try again.
        </p>
      ) : null}
      {deleteMutation.isError ? (
        <p className="mt-3 text-sm text-red-600">
          Failed to delete questionnaire. Completed questionnaires cannot be
          deleted.
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {questionnairesQuery.isPending ? (
          <p className="text-sm text-slate-500">Loading questionnaires…</p>
        ) : questionnairesQuery.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load patient questionnaires.
          </p>
        ) : questionnairesQuery.data.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No patient questionnaires have been started for this case.
          </p>
        ) : (
          questionnairesQuery.data.map((questionnaire) => {
            const title =
              questionnaire.definition?.title ?? "Patient Questionnaire";
            const score = questionnaire.scores;

            return (
              <div
                key={questionnaire.id}
                className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-800">{title}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClassName(
                        questionnaire.status,
                      )}`}
                    >
                      {questionnaire.status === "completed"
                        ? "Completed"
                        : "In progress"}
                    </span>
                    <span className="text-sm text-gray-500">
                      Started {formatDate(questionnaire.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">
                    {questionnaire.status === "completed" && score
                      ? `Score ${score.totalScore}/${score.maxScore} across ${
                          score.denominator
                        } answered item${score.denominator === 1 ? "" : "s"}${
                          score.percentage === null
                            ? ""
                            : ` (${score.percentage}%)`
                        }`
                      : "Waiting for patient completion"}
                  </p>
                </div>
                {questionnaire.status !== "completed" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigateToPatientForm(questionnaire.accessToken)
                      }
                      className="inline-flex items-center justify-center rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                    >
                      Resume on iPad
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(questionnaire.id)}
                      disabled={
                        deleteMutation.isPending &&
                        deleteMutation.variables === questionnaire.id
                      }
                      className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                    >
                      {deleteMutation.isPending &&
                      deleteMutation.variables === questionnaire.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">
                    Completed {formatDate(questionnaire.completedAt)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
