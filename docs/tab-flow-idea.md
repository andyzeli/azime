# Tab flow idea

Design recommendation · October 23, 2026 · Not implemented

## Recommendation

Make **MMI** the place where the physician finishes the assessment and runs pass 4. Keep **Analysis** available for preparation, without requiring a return to it after Visit.

Currently, MMI displays the result but sends the physician back to Analysis to complete the inputs and generate it. Put that final review, generation action, and result together.

```text
Analysis                 Visit                   MMI                    Report
Review records           Document encounter      Finish assessment      Review draft
Optional adjudication    Save                    Run post-exam AI       Generate / update
Optional prep sheet                              Make MMI decision
```

## Analysis: stable purpose and footer

Keep the diagnosis list, 3A treatment analysis, and optional physician review here.

```text
[Save assessment]   [Create / update prep sheet]
```

- Preserve the existing requirement to save steering before generating prep; the action can save pending changes before generation.
- Do not switch the footer to post-exam actions merely because a visit document exists. An early saved visit draft does not mean the examination is complete.
- The physician can still return here voluntarily to inspect or edit the assessment.

## Visit: save and move forward

Keep Visit focused on encounter evidence.

```text
[Save visit]   [Save & continue to MMI →]
```

- Save successfully before navigating; stay on Visit if saving fails.
- Do not require treatment adjudication to be complete before opening MMI.
- Replace the footer instruction to run post-exam analysis from Analysis.

## MMI: final review, generation, and conclusions

### Before pass 4

Replace the passive “Not run yet” state with an actionable assessment workspace, organized by region.

```text
MMI assessment · Lumbar spine

Visit documentation                         ✓ Saved

Diagnoses                                   1 needs a decision
┌ Review diagnoses                                      ▾ ┐
│ Same diagnosis editor used in Analysis                  │
└─────────────────────────────────────────────────────────┘

Treatment review                            3 need review
┌ Review treatments                                     ▾ ┐
│ Same treatment editor used in Analysis                  │
│ Unreviewed items first · All treatments available       │
└─────────────────────────────────────────────────────────┘

[Generate MMI analysis]
```

- Reuse the same editors, queries, and saved data as Analysis. Do not introduce a second review object or reset pre-visit decisions.
- Show unresolved items first. Previously completed judgments remain available for revision in light of the examination.
- Use expandable sections rather than a modal: treatment review can be substantial, and the visit note should be available beside it.
- Show readiness checks here: visit documented, diagnosis decisions complete, required 3A coverage present, and treatment review complete. Keep backend validation authoritative.
- Save pending assessment edits before taking the pass 4 snapshot. A failed save or generation must leave the physician's work available for correction or retry.
- Missing encounter evidence should link directly to the relevant Visit section. Ordinary diagnosis and treatment review should be completable within MMI.

### After pass 4

Show the results and physician decisions in the same tab. Collapse the input review to a summary with a revision action.

```text
Assessment used                             [Review / revise]

Trajectory
Plateau evidence
AI MMI posture
Unresolved questions

Physician MMI decision
Remaining care / applicable rating workflow

[Save opinions]   [Continue to report →]
```

If the assessment or visit changes afterward:

1. Preserve the previous results and physician work.
2. Show “Assessment changed—update analysis,” identifying the changed inputs.
3. Generate a new snapshot and result when explicitly requested.
4. Identify dependent opinions that need reconfirmation; do not silently clear them or treat prior approval as approval of the new result.

## Report: retain generation checks

Keep report-generation readiness checks. Most physicians should arrive after completing MMI, but direct navigation remains possible.

When something is missing, link to the specific MMI or Visit section that resolves it. Avoid a generic redirect to Analysis.

## Data flow stays the same

```text
3A
  → physician-reviewed assessment + visit evidence
  → pass 4
  → physician opinions
  → report
```

The assessment has one authoritative set of data and two useful editing locations:

- **Analysis:** preparation and optional review before the encounter.
- **MMI:** final assessment review and conclusions when completing the case.

This is a UI ownership and navigation change, not a new AI pass or a duplicate assessment workflow. Implement it by extracting the existing diagnosis/treatment editors for reuse, moving pass 4 readiness and generation into MMI, and giving Visit a forward continuation action.

//////////

## Review comments · October 23, 2026

**I prefer this document as the implementation plan, with a naming refinement from my earlier proposal.** The core recommendation is the same: put post-visit review, pass 4 generation, its results, and physician opinions together in the tab after Visit. Neither approach requires the physician to return to Analysis.

This document makes that idea more concrete. In particular, I would adopt its expandable review sections, unresolved items first, access to the visit note, and collapse-to-summary behavior after generation. Reusing the same saved assessment in both locations preserves the physician's preparation work while allowing examination findings to change those judgments. Keeping the Analysis name is also a reasonable way to keep the initial change small.

I would refine three details:

- **Prefer “Assessment” for the current MMI tab.** Its scope includes diagnosis and treatment review, trajectory, remaining care, causation, and physician opinions. MMI is a major decision within that workspace. If keeping MMI visible in navigation is important, “Assessment & MMI” is a reasonable alternative. This naming choice should not hold up the flow improvement.
- **Keep “Run post-exam analysis” as the generation action.** “Generate MMI analysis” makes pass 4 sound narrower than it is and blurs the distinction between AI decision support and the physician's MMI determination.
- **Distinguish a saved visit from a ready visit.** The readiness summary should check the actual requirements, including a substantive note and selected PDQ, rather than showing a check merely because a visit document exists. “Save & continue” should save and navigate without automatically running pass 4 or implying that all assessment inputs are complete.

I also agree with preserving prior results and opinions after edits. Any reconfirmation requirement should identify the affected decisions and be enforced consistently by report readiness, rather than relying only on a warning.

My recommendation is to implement this document's flow, use **Assessment** as the destination name, and preserve the existing AI passes and backend validation.

## Second review · October 23, 2026

**I still prefer reordering the tabs over embedding the review in MMI, but I would take several pieces of this document.** Both fix the real problem: required post-visit work living in a PREP tab. They differ on where the treatment review lives.

What this document costs, as I see it:

- **Two editors for one data set.** The diagnosis and treatment review would be edited from Analysis and from MMI. Each needs its own dirty state, save, and revision-conflict handling against the same steering, and the physician has to learn which one is "the" assessment. Unsaved edits left in one tab while the other is open are a real failure mode.
- **MMI becomes the largest screen in the app.** The treatment review is a wide, six-column grid with expandable rows. MMI already holds trajectory, plateau evidence, remaining care, causation, MMI and impairment, and it would also gain a before/after pass 4 mode. Accordions help, but the review needs the full width it has in Analysis.
- **Bigger build.** It means extracting the editors from `analysis.lazy.tsx`, moving the readiness checks and pass 4 into MMI, and building the two-mode MMI. The reorder needs a tab-strip change, a single footer mode, and the prep sheet button running 3A, plus one backend change: 3B without saved steering.

What the reorder costs: before the visit, a physician who wants to prune for the prep sheet jumps ahead to Analysis. That jump is optional, and the required path runs strictly forward.

The proposed order:

```text
PREP Records · Summary  |  EXAM DAY Visit  |  ASSESSMENT Analysis · MMI · Report
```

- **Analysis** has one footer and no visit-dependent mode switch. It shows the readiness checks, `[Save assessment]` and `[Run post-exam analysis]`. Once pass 4 is current, it shows `[Continue to MMI →]`.
- **The header Prep sheet button** runs 3A if needed, including any diagnoses not yet analyzed, then creates the sheet. Pre-visit Analysis becomes optional.

Adopted from this document and the first review:

- **Visit:** `[Save & continue to Analysis →]`. It saves, then navigates, and it never runs pass 4.
- **Readiness:** checks the actual requirements (a real note, a selected PDQ), not merely that a visit document exists. `visitBlocker` already does this; keep it.
- **Visit note beside the review:** show the visit note in a collapsible side panel in Analysis once a visit exists. This was the strongest argument for doing the review inside MMI.
- **Unresolved items first:** sort unreviewed rows first after the visit.
- **Keep the button name** "Run post-exam analysis".
- **"Assessment"** as the group name, not a tab name, so MMI keeps its name.
- **After edits:** keep prior results and opinions, show what changed, and enforce reconfirmation through report readiness. Report blockers link to the specific section that resolves them.

If the physicians testing this strongly prefer one place to make conclusions, this document's MMI workspace is the better long-term shape. I'd still start with the reorder: it is small, it removes the backward jump today, and it doesn't stop us moving the review into MMI later.

### Update · Visit in the header (preferred)

With a UI-only constraint I prefer moving **Visit out of the tab strip into the header**, next to Prep sheet, over both proposals above. It needs no backend change, keeps the existing gating, and doesn't move the review anywhere.

```text
Header:  [🩺 Visit · exam day]  [🖨 Prep sheet]
Strip:   Records · Summary · Analysis · MMI · Report
```

- **No backward step.** The strip is a progress indicator, and Visit is an event, not a step. Returning to Analysis after the visit only feels backward because the strip shows Analysis as step 3 under PREP, before Visit at step 4. With Visit in the header, Analysis simply stays the current step: "prep done · finish after visit" before the visit, then "14 to review" in amber after it. It is never shown as done and then reopened.
- **Exam-day tools together.** The physician's exam-day actions (the printout and the encounter form) sit together in the header, reachable from any tab.
- **Discoverability.** The Visit button is outlined in blue when it is the next step, and the Next banner points to it.

UI-only work: move the Visit link to the header, derive tab statuses from `useExamPrep` (replacing the mock statuses), drop the PREP/EXAM DAY/REPORT group labels, and add `[Save & continue to Analysis →]` to Visit. The visit-note side panel and unreviewed-first sorting stay optional extras. The mockup at `/mockups` has this as "Visit in header".

### Update 2 · the exam happens on paper (preferred, supersedes the update above)

Physicians likely won't take the computer into the exam room, so the case is worked in two sittings. Before the exam they read the summary, optionally run and review the analysis, and print the prep sheet. After the exam they document the visit from paper notes, finish the assessment, decide MMI and generate the report. Visit is therefore the first data-entry step of the second sitting, not an exam-day event, and it should keep a place in the strip.

```text
BEFORE EXAM  Records · Summary  |  AFTER EXAM  Visit · Analysis · MMI · Report      [🖨 Prep sheet]
```

- **The required sitting reads left to right:** Visit → Analysis → MMI → Report, with no backward jump.
- **The optional prep work skips ahead.** Before the exam, the physician jumps from Summary to Analysis, marked "optional before exam", then "prep done · finish after visit". A skip ahead in the optional sitting is far less confusing than a return in the required one.
- **UI only.** The prep sheet keeps its current gating (analysis run and review saved in Analysis), so this needs no backend change. The earlier idea of the Prep sheet button running 3A is dropped.
- **Better than Visit in the header** once Visit is post-exam data entry. The header version would demote the first step of the after-exam sitting to a button, and the strip would no longer show its order.

UI work: reorder the strip with the two group labels, derive tab statuses from `useExamPrep` (replacing the mock statuses), add `[Save & continue to Analysis →]` to Visit, and leave the Analysis footer modes as they are. The mockup's "Proposed order" now models this, including a marker in the physician path for leaving for the exam room.

### Update 3 · the computer might go into the exam room

This doesn't change the order, only the group labels: `PREP Records · Summary | EXAM & ASSESSMENT Visit · Analysis · MMI · Report`. The order follows the required dependencies (Visit → review → pass 4 → MMI → Report), and those don't depend on where the computer is.

| Computer in the exam room? | Analysis before the visit? | Current order | Proposed order |
|---|---|---|---|
| No | No | Summary → Visit (skip), Visit → Analysis ↩ | forward |
| No | Yes | Visit → Analysis ↩ | forward (optional skip ahead before the visit) |
| Yes | Yes | Visit → Analysis ↩ | Analysis → Visit ↩ when the patient arrives |
| Yes | No | Visit → Analysis ↩ | forward |

The current order goes back in every case, always in the required part. The proposed order goes back only when pre-visit analysis is followed by opening Visit with the patient in the room. That is a natural break, and Visit is plainly the thing to open then.

### Update 4 · Conclusion: Visit in the header (supersedes Updates 2 and 3)

**Why the reorder fails:** Analysis feeds Visit before the exam and depends on Visit after it. Saving a review in Analysis feeds 3B, and 3B produces both the prep sheet and the Visit tab's priorities column (`visit.lazy.tsx` reads `refined.analysis.visitPriority`). After the exam, the treatment review and pass 4 need the visit. Because the relationship goes both ways, no left-to-right tab order can make both directions point forward:

- **Analysis before Visit (today):** prep runs forward, but the required return to Analysis after the visit goes backward.
- **Analysis after Visit (Updates 2–3):** the post-visit flow runs forward, but pre-visit pruning changes what the earlier Visit tab shows. A result appears to the left of the step that produced it.

**Conclusion:** take Visit out of the strip and put it in the header, next to Prep sheet.

```text
Header:  [🩺 Visit · not started | draft | ✓ documented]  [🖨 Prep sheet]
Strip:   Records · Summary · Analysis · MMI · Report
```

- **No backward step in either direction.** Before the exam: Summary → Analysis → Prep sheet / Visit, all from the header. After the exam: Visit → Analysis → MMI → Report. Analysis is never marked done before the post-visit review, so returning to it doesn't read as reopening a finished step. Its tab label changes from "prep done · finish after visit" to "14 to review" in amber.
- **Works in every scenario:** with or without pre-visit analysis, and whether the exam is on paper or the computer goes into the room.
- **Exam-day tools together.** Visit and Prep sheet are both exam-day tools, and the Visit priorities come from the prep sheet, so they belong side by side in the header, reachable from any tab.
- **Visit keeps its status.** The earlier objection was that Visit is real data entry and deserves a status in the strip. The header button carries it and is outlined in blue when it's the next step; the Next banner also points to it. The status uses the existing readiness check, `visitBlocker` in `examPrep.ts` (visit saved, a real note rather than the empty template, a PDQ selected), the same check as the Analysis footer, so an early saved draft never looks complete:
  - no visit saved → "not started";
  - saved, but `visitBlocker` returns a message → "draft", with the message as the tooltip (e.g. "Add a visit note");
  - `visitBlocker` returns null → "✓ documented".

**UI only.** No backend change, the existing gating stays, and the prep sheet still needs a saved review.

- Move the Visit link into the header.
- Derive tab statuses from `useExamPrep` instead of the mock statuses.
- Show the visit's status on the header button, from `visitBlocker`.
- Drop the PREP / EXAM DAY / REPORT group labels.
- Add `[Save & continue to Analysis →]` to Visit.
- Leave the Analysis footer modes as they are.

The mockup at `/mockups` has this as "Visit in header".

**Implemented 2026-10-23.** Tab statuses come from the report-readiness blockers (`/report-input`, each tagged with its tab), so no new readiness logic was added. The Next banner now covers the whole case: summary → Analysis steps → Visit → post-exam analysis → MMI → Generate report.
