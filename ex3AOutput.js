const storedPreExamAnalysisExample = {
    treatmentAnalysis: [
      {
        // Added by the server after the LLM response.
        id: "0f4dbac8-60b7-4fcb-a82d-ec28a3297629",
  
        treatmentId: "physical-therapy",
        treatment: "Physical therapy",
        source: "taxonomy",
  
        suggestionReasoning: "",
        suggestionReason: null,
  
        recordDetail:
          "One therapy course documents therapeutic exercise and manual therapy across eight visits, with persistent symptoms at the final documented visit.",
        recordStatus: "Completed",
  
        episodeIds: [
          "therapy:87df5724-4910-43a1-bf44-e6b683e81823:201",
        ],
  
        assessments: [
          {
            canonicalDx: "disc_herniation",
  
            aiApplicabilityRationale:
              "Physical therapy is applicable to the documented lumbar disc condition and associated functional limitations.",
            aiApplicability: "applicable",
  
            aiAdequacyRationale:
              "The records document a multi-visit course using more than one therapy modality, with persistent symptoms despite completion of the documented course.",
            aiAdequacy: "adequately_trialed",
          },
        ],
      },
  
      {
        id: "622b91b1-d4be-4b60-aea5-56742c9aa42f",
  
        treatmentId: "lumbar-epidural-steroid-injection",
        treatment: "Lumbar epidural steroid injection",
        source: "taxonomy",
  
        suggestionReasoning: "",
        suggestionReason: null,
  
        recordDetail:
          "Two lumbar epidural steroid injections are documented, but the duration and magnitude of relief are not clearly recorded.",
        recordStatus: "Completed",
  
        episodeIds: ["intervention:310", "intervention:344"],
  
        assessments: [
          {
            canonicalDx: "disc_herniation",
  
            aiApplicabilityRationale:
              "The injections target symptoms associated with the documented lumbar disc diagnosis.",
            aiApplicability: "applicable",
  
            aiAdequacyRationale:
              "Two procedures were performed, but the records do not adequately document the response to either injection, so the adequacy of the trial cannot be determined.",
            aiAdequacy: "unclear",
          },
        ],
      },
  
      {
        id: "9d83dc05-f8fd-40eb-baca-23dbbe26ce8f",
  
        treatmentId: "lumbar-discectomy",
        treatment: "Lumbar discectomy",
        source: "taxonomy",
  
        suggestionReasoning: "",
        suggestionReason: null,
  
        recordDetail: null,
        recordStatus: "Not Documented",
  
        episodeIds: [],
  
        assessments: [
          {
            canonicalDx: "disc_herniation",
  
            aiApplicabilityRationale:
              "Discectomy can address a lumbar disc herniation, but the supplied records do not establish whether this patient meets the relevant surgical indications.",
            aiApplicability: "unclear",
  
            aiAdequacyRationale:
              "No lumbar discectomy or documented surgical trial appears in the supplied records.",
            aiAdequacy: "not_tried",
          },
        ],
      },
    ],
  
    evidenceGaps: [
      {
        gap: "The response to each epidural injection is insufficiently documented.",
        significance:
          "Without the magnitude and duration of relief, the injection trial cannot be assessed reliably for adequacy.",
      },
      {
        gap: "The therapy course lacks a clear discharge assessment.",
        significance:
          "It is unclear whether therapy ended after reaching a plateau, meeting its goals, or for a nonclinical reason.",
      },
    ],
  
    inconsistencies: [
      {
        type: "Record",
        description:
          "One encounter reports improvement after the first injection, while a later encounter reports no sustained improvement without reconciling the difference.",
      },
    ],
  
    schemaVersion: "draft-v2",
  
    sourceMetadata: {
      provider: "gemini",
      model: "gemini-2.5-pro",
    },
  };        