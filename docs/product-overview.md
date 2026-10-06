# Motivation

Automating the gruntwork of Independent Medical Exam business.

Before:

1. Independent medical exams differ from normal care because the doctors don't get the benefit of full EMR and staff to gather data.
   They have to sift through huge packets of records to get the background scope.
2. The examiner is always sent a series of questions from the attorney that hired him.
3. The Examiner is expected to write a long report that answers the questions and explains patient state.

Pattern recognition:
The superset of questions from attorneys revealed universal pattern -- they want to tease out these things:

1. the patient+previous care team has declared a certain state, do you(the doctor) agree? (includes "has all treatment been medically necessary" questions too)
2. how much of current state is related to current incident vs previous condition
3. has MMI been reached? if not explain why not, if yes, then folow the AMA guide and give us an impairment rating
4. What needs to happen next for patient (i.e. is surgery indicated)

We can make an app that handles all of the grunt work of the "Before", so the doctor only has his normal medical note + answers a few multiple choice or scale questions (standardized from the pattern) on his phone or computer (buttons only). Eliminates doctor burnout and allows us 24 hour turnaround time for reports.

1. AI extraction (triggered from ui) of messy docs to structured facts --> clean UI display (helps our doc and our downstream processes)
2. Second and Third AI passes for aggregation, summarization and case Analysis
3. Smartly designed UI and CRUD portion of the app (a "Cockpit") that receives doctor input and applies it to case, building our final "decision object" (mmi or impairment)
4. AI report writer (triggered from ui) writes the report for doc acceptance
