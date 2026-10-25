# IME Report sections

1. Intro
2. Background Info - relevant PMH, current Meds, relevant social history (optional)
3. Chief Complaint and History of Present Illness
4. Imaging reviews in records
5. work status history relevant to chief complaint
6. what was diagnoses
7. today - SOAP style note, imaging reviews
8. DISCUSSION - typically was explicit answers to referral qeustions

## Report Section data source

Idea is a that a thorough placement and explanation of data we captured in pipeline meets all of the above criteria, answers all referral questions inherently, and is a superior product.

either a builder form prefills the sections and allows one last pruning, or we just draft the report and allow direct editing. I lean toward a builder. snapshot prefills sections, allows pruning and adding, physcian can view the snapshot.

we query for the below, put it into a structured json, and the LLM drafter has everything it needs:

- Intro is templated
- Chief complaint -- we might have physician explicitly capture this in note. its just a one-liner.
- relevant PMH - query encounter forms + physician note (not actually added here, LLM just knows to use it)
- current meds - exists in snapshot. treatments of type medication
- Social - caseSummary.psychoSocial + physician note

- HPI - our caseSummary prose
- Imaging reviews - query for all imaging reviews including our physician's
- work status history - query
- pre-visit working diagnoses - query for diagnoses mentions

- Todays Exam
  -- reiterated chief complaint
  -- Subjective - PDQ + physician Note
  -- Objective - stored AMA assessments + physician note
  -- Functional - PDQ \_ physician Note
  -- CS/Imaging review - physician Note will cover it

Discussion/Plan

-- Physicain confirmed diagnosis - query
-- Relevant portions of the treatment analysis - query
-- trajectory analysis - direct query
-- MMI decision - query
-- plateau evidence matching MMI decision - query
-- If at MMI - query impairment rating
-- If not at MMi - query curative care, reevaluation timeline, work restrictions

## Implementaiton

Simply need to name and fetch each data piece, e.g. const exam_imaging = getExamImaging(), display it in the builder.

Then, snapshot builds the JSON that will be sent to LLM as input.
