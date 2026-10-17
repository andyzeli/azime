

BodyPart      { id: "spine" | "shoulder" | ... }
Region        { id: "lumbar" | "cervical" | "thoracic" | "shoulder" | ..., bodyPartId }
CanonicalDx   { id, regionId, label, definition, icdPrefixes[] }         // level at which the ladder changes
Treatment     { id, bodyPartId, category, label, aliases[] }
LadderEntry   { regionId, canonicalDxId, treatmentId, line, applicability, adequacy, sourceIds[] }
Source        { id, ref }                                                // ODG section/edition etc., reference only
// all editable rows: status draft|approved|retired, createdBy model|physician, reviewedBy
TaxonomyVersion { id, snapshot of approved rows }                        // cases stamp this

// ================= CASE METADATA (intake, human-entered) =================
Case { id, bodyParts[], caseType, referralQuestions[], acceptedConditions[], age, sex, dateOfInjury, taxonomyVersion }
Document { id, caseId, providerType, providerName, dateOfService, type }  // verified at upload

// ================= PASS 1 (per document, model; enums built from case.bodyParts → taxonomy) =================
Diagnosis {
  evidence, name, icd,                                   // as stated
  region: Region | "other_body_part" | "unclear",
  canonicalDx: CanonicalDx | "unresolved",               // validated: dx ∈ region
}
// ...plus existing per-type extractions (encounter, therapy_note, imaging_report, ...)

---------------
When Pass 1 finishes a document, the same transaction that stores the extraction JSONB also unnests its diagnoses[] (from encounter, surgery pre/post-op, imaging) and inserts one row per diagnosis into diagnosis_mentions with the document ID, case ID, and taxonomy version. That's ten lines of code in the Pass 1 write path.
It's derived data, so the rule is: never edit it directly, always rebuild from the JSONB. Re-resolving after a taxonomy change is "delete rows for this case, re-run resolution, re-insert."

-------------------


// ================= QUERIES (deterministic, over Pass 1 + metadata) =================
recordCoverage     = { dateRange, documentCount, providerTypesPresent }
jobDemands         = job_description doc
workStatus         = latest workstatus doc
currentMedications = latest encounter meds, action != Stopped, isOpioid via lookup
completedStudies   = imaging_report docs
outstandingOrders  = diagnosticOrders with no later matching report
referralStatus     = referrals, fulfilled if provider type appears later
treatmentEpisodes  = therapy notes grouped by provider | each intervention | each surgery   → { episodeId, ... }
latestFunction     = last functionalLimitations
dxSupport          = GROUP BY region, canonicalDx → count, first/last dos, providers, rawNames
scope (per region) = acceptedConditions ∩ dxSupport, else all supported dx in region   // physician can override → 3A re-run
ladder (per scope) = LadderEntry where regionId = scope.region AND canonicalDxId ∈ scope.diagnoses

// ================= PASS 2 (model, small; read specific fields, condense, no judgment) =================
Pass2 {
  summary,
  relevantHistory,
  statusTimeline: { documentId, symptoms, function, objective }[],   // joined to date/provider at read; ids validated
  psychosocial,
}

// ================= PASS 3A (model, per region; run with no physician input) =================
Input3A  { scope, ladder, dxSupport, treatmentEpisodes, pass2, documents (chronological) }
Output3A {
  diagnosis: scope (echoed) + notes on unresolved / out-of-scope support,
  treatmentAnalysis: {
    id, category, treatment, source: Taxonomy | AI Suggested | Record Only,
    appliesTo: CanonicalDx[],                            // taxonomy rows: from ladder; others: model-assigned within scope
    recordStatus: Planned | Ongoing | Completed | Recommended | AwaitingAuthorization | Declined | Unclear | NotDocumented,
    recordDetail,                                        // quantity, response, end reason — one line
    episodeIds[],
    aiAdequacyAssessment: AdequatelyTrialed | NotAdequatelyTrialed | Unclear,   // measured against ladder.adequacy
    aiAdequacyRationale,
    physicianAdequacyAssessment: null, physicianAdequacyRationale: null,
  }[],
  inconsistencies[],
  evidenceGaps: { gap, whyItMatters }[],
}

// ================= COCKPIT =================
PhysicianSteering { analysisVersion, treatments: prune/add/override by id, gaps/inconsistencies: dismiss, scope: override, notes }
// stored separately; 3A immutable; scope change → 3A re-run, steering carried forward by id

// ================= PASS 3B (model, pre-visit) =================
Input3B  { documents, pass2, output3A, steering, ladder }
Output3B { trajectory: { subjective, functional, objective }, plateauEvidence: { supporting, opposing },
           decisionCriticalQuestions[], visitGuidance[] }          // no posture

// ================= VISIT → PASS 4 (model, post-visit) =================
Input4   { ...Input3B, examFindings, physicianNote, postVisitSteering (runway per treatment, dx changes → new ladder) }
Output4  { trajectory (recomputed), plateauEvidence, mmiPosture, rationale framed by referralQuestions }
// physician decides

// ================= FEEDBACK LOOP (periodic job) =================
// steering data → model proposes taxonomy changes as drafts with `supersedes` → physician approves → new TaxonomyVersion


----------------------
dxSupport = sql`
  SELECT m.region, m.canonical_dx,
         count(*)                         AS mention_count,
         min(d.date_of_service)           AS first_dos,
         max(d.date_of_service)           AS last_dos,
         array_agg(DISTINCT d.provider_name) AS providers,
         array_agg(DISTINCT m.name)          AS raw_names
  FROM diagnosis_mentions m JOIN documents d ON d.id = m.document_id
  WHERE d.case_id = $1
    AND m.region NOT IN ('other_body_part','unclear')
    AND m.canonical_dx <> 'unresolved'
  GROUP BY m.region, m.canonical_dx`;
// → { region, canonicalDx, mentionCount, firstDos, lastDos, providers[], rawNames[] }[]

----------------
scopes = case.regions.map(region => {
  const supported = dxSupport.filter(s => s.region === region);
  const accepted  = case.acceptedConditions.filter(a => a.region === region).map(a => a.canonicalDx);
  const chosen    = accepted.length ? accepted : supported.map(s => s.canonicalDx);
  return {
    region,
    diagnoses: chosen.map(dx => ({
      canonicalDx: dx,
      basis: accepted.includes(dx) ? "accepted" : "record",
      support: supported.find(s => s.canonicalDx === dx) ?? null,   // null = accepted but never mentioned
    })),
    notInScope: supported.filter(s => !chosen.includes(s.canonicalDx)),  // shown to physician; 3A flags as gap
  };
});
// physician override replaces `diagnoses` with basis: "physician" → 3A re-run for that region
mentions for regions case doesnt list fall out of case.regions



ladder query
ladder(scope) = sql`
  SELECT * FROM ladder_entries
  WHERE region_id = $region AND canonical_dx_id = ANY($diagnoses) AND status = 'approved'`;
// from the case's taxonomy_version snapshot, not the live table

//3A output
{
  "treatment": "Active physical therapy",
  "source": "Taxonomy",
  "recordStatus": "Completed",
  "recordDetail": "6 visits over 4 weeks, discharged at plateau per PT",
  "episodeIds": ["ep_1"],
  "assessments": [
    {
      "canonicalDx": ["nonspecific_pain"],
      "aiApplicability": "Applicable",
      "aiApplicabilityRationale": "First-line for strain.",
      "aiAdequacyAssessment": "AdequatelyTrialed",
      "aiAdequacyRationale": "Standard is 6–8 visits; 6 documented with discharge at plateau.",
      "physicianApplicability": null,
      "physicianAdequacy": null,
      "physicianRationale": null
    },
    {
      "canonicalDx": ["disc_herniation_radiculopathy"],
      "aiApplicability": "Applicable",
      "aiApplicabilityRationale": "First-line before injection.",
      "aiAdequacyAssessment": "InadequatelyTrialed",
      "aiAdequacyRationale": "Standard is 8–12 visits with neural mobilization; 6 general visits documented.",
      "physicianApplicability": null,
      "physicianAdequacy": null,
      "physicianRationale": null
    }
  ]
}//


restorative vs palliative 


tx levels


treatmentType:
  | "therapy"              // PT/OT/chiro course
  | "manipulation"
  | "injection"
  | "ablation"
  | "aspiration"
  | "physical_modality"    // heat, TENS, ultrasound, traction
  | "dry_needling"
  | "medication"           // administered or prescribed
  | "bracing_dme"
  | "surgery"
  | "behavioral"           // CBT, pain psychology
  | "multidisciplinary_program"
  | "other"


therapyComponents:
  | "therapeutic_exercise"
  | "manual_therapy"
  | "neuromuscular_reeducation"
  | "functional_training"
  | "physical_modality"        // heat, TENS, ultrasound, traction
  | "aquatic"
  | "home_exercise_program"
  | "patient_education"
  | "dry_needling"
  | "other"