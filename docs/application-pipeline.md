## AI + CRUD Application Pipeline - 10-thousand foot level

1. **Document ingestion**
   Staff splits the raw medical-record packet into individual document types, such as encounter notes, therapy visits, imaging reports, work-status reports, and procedure reports. The application uploads each document to GCP and stores its metadata in PostgreSQL.

2. **Document-level fact extraction**
   Each document type has its own extraction prompt and response schema. The application sends the document to Gemini, extracts relevant facts as structured JSON, and stores the result in a PostgreSQL JSONB column.

3. **Case-level AI synthesis**
   The extracted facts from all documents are passed (via SQL) into a second AI workflow using Gemini, ChatGPT, or Claude. This workflow produces a case clinical summary structured output with fields such as:
   - case summary;
   - consolodated diagnoses;
   - Patient status trajectory (symptoms, etc)

4. **Case-level AI analysis**
   The extracted facts are also fed into another AI workflow (two ai passes and physician steering from ui) using Gemini, ChatGPT, or Claude. This workflow produces structured outputs such as:
   - treatment analysis (what has been tried and status, what should be tried);
   - contradictions or inconsistencies;
   - missing information;
   - suggested MMI status and supporting reasoning.

   The suggested MMI status is decision support only and is not the physician’s final determination.

5. **Pre-visit physician UI**
   The application presents the extracted facts, timeline, summaries, and conflicts in a clear interface to help the physician prepare for the examination.

6. **Patient questionnaire**
   The patient completes a disability questionnaire in the application. The responses and calculated results are stored in PostgreSQL.

7. **Physician decision workflow**
   The physician reviews the available evidence and completes a dynamic set of structured questions.

   The physician makes the actual MMI determination. Based on that decision, the workflow branches into either:
   - an AMA Guides-based impairment evaluation; or
   - recommended care, work restrictions, and temporary disability conclusions.

   Additional structured questions capture decisions such as causation, apportionment, treatment necessity, work status, and next steps.

8. **IME report drafting**
   A final AI workflow uses the medical-record facts, case synthesis, patient questionnaire, physician note, and structured physician decisions to draft the IME report.
