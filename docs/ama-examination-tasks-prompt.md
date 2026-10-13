# Offline prompt: AMA examination tasks

Use this file for the LLM step in the source-to-upload workflow, after normalization and before final validation/review. No AI call is needed when preparing an individual patient's visit.

## Task

Read [ama-spine.upload.json](ama-spine.upload.json). Add an `examination_tasks` array to every row in that same file. Preserve every other field and value, including all question wording, options, help, entry criteria, and impairment values. If tasks already exist, review/update that field instead of appending duplicates.

The physician has selected canonical diagnoses, but may not yet know the affected roots. The app will retrieve all mapped candidate AMA rows and combine their examination tasks into a preparation checklist. Turn repeated grading questions into concise tasks describing what findings to assess or measurements to collect.

Use the supplied PE questions and their full help/options as the source. Do not introduce additional clinical protocols or resolve ambiguities in the guide using medical assumptions. CS and diagnosis-history questions remain outside this checklist.

## Output shape

Each task has:

```json
{
  "id": "thigh_calf_circumference",
  "prompt": "Measure thigh and calf circumference differences.",
  "help": "Compare sides at 15 cm above and below the medial knee joint line, respectively.",
  "question_ids": ["atrophy", "atrophy_2", "atrophy_3", "atrophy_4"]
}
```

This illustrates a task for the lumbar rows with these measurement sites. Verify applicability separately for every row. `help` is optional; `question_ids` is a nonempty list of PE question IDs **within the containing row**.

## Task-writing rules

- Combine grade/range variants when the same examination supplies the needed observations. For example, several atrophy ranges can share a circumference-measurement task; several strength grades can share a task to assess the specified movement.
- Preserve the anatomy, laterality/comparison, examination method, measurement sites/units, and other qualifications needed to collect useful findings. Keep different procedures separate. A femoral stretch test and a straight leg raise are different tasks.
- Root-specific sensory distributions or different muscle groups must remain distinguishable. Avoid instructions such as “assess neurology” that conceal the actual requirements.
- One question can reference several supporting tasks, and one task can support several questions. These links indicate relevance, not an automatic formula for answering the question. Do not change a compound AND/OR condition into a different rating requirement.
- Where a question only asks whether the examination is consistent with the diagnosis, use a row-specific consistency-review task. Do not invent a detailed examination protocol absent from that question.
- Retain ambiguous source requirements in the linked questions and identify any difficulty summarizing them in the completion message. Do not silently correct the source or omit the question.

## Deduplication

Use stable, descriptive snake_case task IDs. Reuse an ID across rows only when the task has the same clinical meaning and collection requirements. Every occurrence of that ID must have identical `prompt` and `help`; its local `question_ids` can differ.

Matching short prompts or question IDs is insufficient: `motor_4`, for example, can refer to different findings in different rows. Use distinct task IDs when anatomy or procedure differs. Root-specific tasks can include the root in their IDs. Reuse existing task IDs on later runs when their meaning is unchanged.

The app will show each task ID once while retaining all originating row/question references. It will still collect and evaluate answers separately for the applicable patient root/side assessment. A shared checklist task does not imply a shared patient answer.

## Validation and delivery

Before finishing, check:

1. Removing `examination_tasks` reproduces the original JSON data exactly. The 30 rows, 108 entries, and 178 questions are unchanged.
2. Every PE question is linked to at least one task; every referenced question exists in that row and has `group: "PE"`.
3. Task IDs are unique within a row, question references have no duplicates, and shared task IDs have identical prompts/help.
4. Each question's required observations are covered, including compound findings and qualifications in option help. Review this semantically; ID coverage alone is insufficient.
5. Repeated grading questions collapse where appropriate, while different root distributions and examination procedures remain distinguishable.

Return the updated upload file and a short summary: task count before/after cross-row deduplication, two representative consolidations, and any items needing review.

The LLM authors these tasks directly in the upload. Do not create a separate task-mapping file or encode task-generation rules in the normalizer. Extend the existing validator to accept `examination_tasks` and check its structure/references as part of final validation. Review the resulting checklist before import.

The complete workflow is: source → parser → normalizer → this LLM step → validation/review → upload. Rebuilding the base file requires repeating this LLM step. The application imports `examination_tasks` as another JSONB column on `ama_diagnostic_rows`.
