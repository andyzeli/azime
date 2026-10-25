deterministic query for compact ama findings to input LLM pass.

The key point: the frozen findings already link each answer to the test that produced it (`examination[].questionIds`), so the function needs only the frozen findings, with no reference-data lookup.

**Function:** `compactAmaFindings(findings, label)` replaces the current one in `backend/src/report/history.ts`. It's still pure, with no IO.

**Input:** `PostExamAmaFindings` (`packages/contracts/src/postExamAnalysis.ts`), one AMA component as pass 4 froze it:

```ts
{ rowId, description, nerveRoot, side, canonicalDxIds,
  examination: { taskId, prompt, questionIds, motorGrade, atrophyCm }[],   // tests performed
  answers: { questionId, group, prompt, criterion, answer, answerLabel }[] }
```

It also takes `label: (dx) => string`, which turns diagnosis ids into names.

**Output:** a new `ReportAmaFindings` in `packages/contracts/src/report.ts`, replacing today's `{basis, measurements, answers}`:

```ts
{ diagnoses: string[], row: string, nerveRoot, side,
  tests: { test: string, result: string }[] }
```

**Mapping:** one examination task becomes one pair, and the test is the task prompt minus its period.

| Task kind                                   | Result                                                                           | Example                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Strength (`motorGrade`)                     | `"N/5"`                                                                          | `{ "Assess knee extensor strength", "3/5" }`                               |
| Circumference (`atrophyCm`)                 | `"N cm"`                                                                         | `{ "Measure the calf circumference difference", "4 cm" }`                  |
| One choice question                         | the chosen option's label                                                        | `{ "Assess L4 symptoms, pinprick…", "Loss of sharp/dull discrimination" }` |
| One yes/no question                         | `positive`/`negative` if the question asks "…positive?", else `present`/`absent` | `{ "Assess femoral nerve stretch…", "negative" }`                          |
| Several yes/no (reflexes)                   | the findings that are present, or `"none"`                                       | `{ "Compare knee reflexes between sides", "asymmetric absent reflex" }`    |
| Imaging/EMG and history questions (no task) | `yes`/`no`                                                                       | see the open question below                                                |

Derived `motor_*` and `atrophy*` answers are skipped, because the grade or centimetre value already says it.

**Files it touches:**

- `packages/contracts/src/report.ts`: the `ReportAmaFindings` schema and type.
- `backend/src/report/history.ts`: the function.
- `backend/src/queries/reportInputQueries.ts`: no change, it already calls the function per component.
- `backend/src/ai/reportDraftPrompt.ts`: the one-line description of the AMA input.
- `frontend/.../tabs/report.lazy.tsx`: the builder renders `test: result` pairs.
- `backend/tests/reportHistory.test.mjs`: the test is rewritten for pairs.

**Two decisions for you:**

1. **The yes/no wording.** I'd go with the heuristic above, which works for every root row today. If it gets something wrong, the alternative is an optional `result_labels` field on each question in the reference data. That needs a change to the reference data upload and the AMA import.
2. **How the imaging/EMG confirmation reads.** Its question text is generic ("supported by at least one of the listed alternatives?"). I'd use a fixed test name, `"Nerve root confirmed by imaging, electrodiagnosis or surgery"`, with yes/no. The fracture rows have several such criteria, so for those the test would be the criterion's first line.
