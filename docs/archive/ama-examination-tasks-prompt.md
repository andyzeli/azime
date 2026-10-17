# Offline prompt: AMA examination tasks

Use this file for one offline LLM pass that prepares the existing JSON for direct upload. Author and validate the examination tasks directly in the upload file; do not build a task normalizer or task-generation pipeline. No AI call is needed when preparing an individual patient's visit.

## Task

Read [ama-spine.upload.json](ama-spine.upload.json). Add an `examination_tasks` array to every row in that same file. Preserve every other field and value, including all question wording, options, help, entry criteria, and impairment values. If tasks already exist, review/update that field instead of appending duplicates.

The physician has selected canonical diagnoses, but may not yet know the affected roots. The app will retrieve all mapped candidate AMA rows and combine their examination tasks into a preparation checklist. Turn repeated grading questions into concise tasks describing what findings to assess or measurements to collect.

Use the supplied PE questions and their full help/options as the source. Use evidence-informed clinical judgment to resolve ambiguous examination instructions into practical collection tasks, following the decisions below. Limit added examination detail to what is needed to collect the linked findings. Keep original questions, options, grading criteria, and impairment values unchanged: an examination-task clarification is not an AMA erratum or a new rating rule. CS and diagnosis-history questions remain outside this checklist.

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
- Resolve examination ambiguities using the decisions below and retain the original source requirements in the linked questions. For new ambiguities, consult authoritative clinical references, choose an actionable collection method, and add the decision, rationale, and supporting references to this prompt. Clearly identify local interpretations. When source requirements name distinct observations or landmarks, collect them separately instead of assuming equivalence. Do not omit the question or invent a grading conversion.

## Clinical collection decisions — 2026-10-13

The user authorized clinical judgment to finalize the checklist for direct upload. Apply these decisions on subsequent runs without leaving the same items as unresolved review placeholders. These are local examination-collection decisions, not verified corrections to the AMA Guides. The physician still evaluates the original questions and rating criteria separately.

| Source issue | Examination-task decision and rationale |
| --- | --- |
| L3 thigh distance omitted in `atrophy` | Use **15 cm above the medial knee joint line**, consistent with the other three thigh ranges in that same row. This is an explicit inference from the supplied row. Combine it with the usual calf measurement at **15 cm below the medial knee joint line** using `thigh_calf_circumference`, linked to all four atrophy questions. |
| L3 `atrophy_3` names the lower patellar border for the calf | Also collect a separate bilateral calf circumference measurement **15 cm below the lower patellar border**, linked only to `atrophy_3`. Record the landmark with each measurement. These two calf landmarks are anatomically distinct; collecting both preserves the explicit source requirement without guessing that it is a typo. The common task also supports `atrophy_3` through its thigh measurement. |
| C6 specifies radial wrist extension only in `motor_4` | Use one `radial_wrist_extension_strength` task for all four C6 motor-grade questions, testing the radial wrist extensors (extensor carpi radialis longus/brevis). Retain elbow flexion separately and retain the distinct C7 ulnar wrist extensor task. The [ASIA motor examination guide, C6 section](https://www.spinedragon.com/docs/professional_guidelines/asia_motor_exam_guide.pdf) identifies the radial extensors as the C6 key muscle group; applying that collection method across this row's grades is our interpretation. |
| L2 `sensory_criterion_2b` mixes sharp/dull loss with “and/or paresthesias” | Collect subjective paresthesias, pinprick findings, and sharp/dull discrimination separately within `l2_sensory_assessment`. Paresthesias alone do not establish objective sensory loss. Link both sensory questions to this task; do not replace the original compound question or automatically derive its answer from the ordinary sensory-choice question. |
| C7 motor questions mix AND/OR conditions | Test and grade **elbow extension, wrist flexion, finger extension, and ulnar wrist extension separately**, collecting every named movement. This supplies the observations without choosing a new logical interpretation of the rating question. These muscle groups are consistent with the [AAPM&R cervical radiculopathy examination discussion](https://now.aapmr.org/cervical-radiculopathy/). |
| L5/S1 straight leg raise exclusion wording | Document reproduction of the patient's concordant radicular symptoms, their dermatomal distribution, and the elevation angle. Retain the supplied **35°–70°** range. Distinguish radicular reproduction from isolated back pain, nonradicular posterior-thigh/hamstring stretch discomfort, or other nondermatomal leg pain; these alone do not establish a positive radicular test. Do not exclude concordant radicular symptoms merely because back or thigh discomfort coexists. [AAFP's lumbar disk examination review](https://www.aafp.org/pubs/afp/issues/2008/1001/p835.html) supports the radiating-symptom distinction; its general 30°–70° range does not replace the supplied AMA threshold. |
| S1 “ankle plantar flexion pronation” | Replace the combined task with separate **ankle plantar-flexion strength** and **foot eversion strength** tasks, each linked to all four motor questions. Plantar flexion assesses gastrocnemius/soleus; eversion assesses the fibularis/peroneal muscles as a practical way to collect the pronation-related motor observation. Eversion is a component of pronation, not a synonym for the full triplanar motion. This is a local interpretation, supported by the [ASIA S1 examination](https://www.spinedragon.com/docs/professional_guidelines/asia_motor_exam_guide.pdf) and [foot/ankle examination and muscular-function review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5241541/). Record each movement's grade independently; do not combine them into a new rating condition. |
| S1 tiptoe fatigue appears at every motor grade | Collect **up to ten single-leg heel raises on each side**, with a chair for balance when safe. Record completed repetitions, declining heel height/fatigue, and pain or balance limitations; document any modified method. Keep this functional observation separate from manual strength grades and never convert the repetition count into a 0–5 grade or impairment value. The [Suri et al. examination study, Table 1](https://dash.harvard.edu/bitstreams/7312037d-e5c0-6bd4-e053-0100007fdf3b/download) describes a ten-repetition single-leg S1 test. The source's chair support is retained. |

For task IDs, retain `radial_wrist_extension_strength` and `thigh_calf_circumference` where their collection meaning is unchanged. Replace the earlier combined S1 strength task with `s1_ankle_plantar_flexion_strength` and `s1_foot_eversion_strength`; use `s1_single_leg_heel_raises` for the specified unilateral endurance method. Remove superseded tasks rather than leaving duplicate procedures in the checklist.

## Deduplication

Use stable, descriptive snake_case task IDs. Reuse an ID across rows only when the task has the same clinical meaning and collection requirements. Every occurrence of that ID must have identical `prompt` and `help`; its local `question_ids` can differ.

Matching short prompts or question IDs is insufficient: `motor_4`, for example, can refer to different findings in different rows. Use distinct task IDs when anatomy or procedure differs. Root-specific tasks can include the root in their IDs. Reuse existing task IDs on later runs when their meaning is unchanged.

The app will show each task ID once while retaining all originating row/question references. It will still collect and evaluate answers separately for the applicable patient root/side assessment. A shared checklist task does not imply a shared patient answer.

## Validation and delivery

Before finishing, check:

1. Removing `examination_tasks` from both the before and after copies reproduces the same JSON data exactly, including when updating an already enriched upload. The 30 rows, 108 entries, and 178 questions are unchanged.
2. Every PE question is linked to at least one task; every referenced question exists in that row and has `group: "PE"`.
3. Task IDs are unique within a row, question references have no duplicates, and shared task IDs have identical prompts/help.
4. Each question's required observations are covered, including compound findings and qualifications in option help, with the documented clinical collection decisions applied. Review this semantically; ID coverage alone is insufficient.
5. Repeated grading questions collapse where appropriate, while different root distributions and examination procedures remain distinguishable.

Return the updated upload file and a short summary: task count before/after cross-row deduplication, two representative consolidations, and any newly resolved clinical interpretations. Do not ask for another review of decisions already documented above.

The LLM authors these tasks directly in `ama-spine.upload.json`, which is the deliverable for import. Do not create a separate task-mapping file, task normalizer, or task-generation script. Run the structural, reference, preservation, and semantic checks above against the final file; validation does not require a normalization/rebuild step.

The workflow for this task is: existing upload JSON → this LLM editing step → validation → direct upload. Keep the authored tasks in the upload artifact. If someone separately replaces the base JSON using older build tools, reapply this prompt and its recorded decisions before upload. The application can import `examination_tasks` as another JSONB column on `ama_diagnostic_rows`.
