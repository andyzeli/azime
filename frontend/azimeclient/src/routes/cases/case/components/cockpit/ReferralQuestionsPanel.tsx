import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { caseQueryOptions, updateReferralQuestions } from "../../../queries";
import { CockpitSection } from "./CockpitLayout";

// "1.", "1)", "(1)", "a.", "b)", "Q1:", "Question 2 -", bullets.
const listMarker =
  /^\s*(?:[-*•◦▪·–—]+|\(?\d+[.):]|\(?[a-z][.)]|q(?:uestion)?\s*\d+\s*[.):-]?)\s+/i;

const cleanQuestion = (line: string) =>
  line
    .replace(listMarker, "")
    .replace(/\s+/g, " ")
    .trim();

// One question per line. If the paste is a marked list, unmarked lines are
// wrapped text and join the question above.
export const parseQuestions = (text: string) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const marked = lines.some((line) => listMarker.test(line));
  const joined: string[] = [];
  for (const line of lines) {
    if (marked && joined.length && !listMarker.test(line)) {
      joined[joined.length - 1] += ` ${line}`;
    } else {
      joined.push(line);
    }
  }
  return joined.map(cleanQuestion).filter(Boolean);
};

export default function ReferralQuestionsPanel({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const caseQuery = useQuery(caseQueryOptions(caseId));
  const [pasted, setPasted] = useState("");
  const mutation = useMutation({
    mutationFn: (questions: string[]) =>
      updateReferralQuestions(caseId, questions),
    onSuccess: (updated) => {
      queryClient.setQueryData(caseQueryOptions(caseId).queryKey, (current) =>
        current ? { ...current, ...updated } : current
      );
    },
  });

  const questions = caseQuery.data?.referralQuestions ?? [];
  const parsed = parseQuestions(pasted);

  const move = (from: number, to: number) => {
    const next = [...questions];
    const [question] = next.splice(from, 1);
    next.splice(to, 0, question!);
    mutation.mutate(next);
  };

  return (
    <CockpitSection
      id="referral-questions"
      title="Referral Questions"
      description="Paste the questions from the referral. The final report answers each one."
    >
      {questions.length ? (
        <ol className="mb-4 space-y-2">
          {questions.map((question, index) => (
            <li
              key={`${index}-${question}`}
              className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-800"
            >
              <span className="w-6 shrink-0 font-medium text-slate-500">
                {index + 1}.
              </span>
              <span className="flex-1">{question}</span>
              <div className="flex shrink-0 gap-2 text-slate-500">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={mutation.isPending || index === 0}
                  className="hover:text-slate-800 disabled:text-slate-300"
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={
                    mutation.isPending || index === questions.length - 1
                  }
                  className="hover:text-slate-800 disabled:text-slate-300"
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  className="text-red-600 hover:text-red-800 disabled:text-red-300"
                  onClick={() =>
                    mutation.mutate(questions.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          No referral questions yet.
        </p>
      )}

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate([...questions, ...parsed], {
            onSuccess: () => setPasted(""),
          });
        }}
      >
        <textarea
          className="w-full rounded border border-slate-300 p-2 text-sm"
          rows={4}
          placeholder="One question per line. Numbers and bullets are removed."
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending || !parsed.length}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {parsed.length > 1
              ? `Add ${parsed.length} questions`
              : "Add question"}
          </button>
          {mutation.isError ? (
            <span className="text-sm text-red-600">
              Failed to save referral questions.
            </span>
          ) : null}
        </div>
      </form>
    </CockpitSection>
  );
}
