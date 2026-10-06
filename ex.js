const examplePreExamInputSnapshot = {
  scope: {
    region: "lumbar_spine",
    diagnoses: ["disc_herniation_with_radiculopathy"],
  },

  ladder: [
    {
      id: "c946e5d1-38ed-4d5b-8515-0e466588992d",
      region: "lumbar_spine",
      canonicalDx: "lumbar_spine.disc_herniation_with_radiculopathy",
      treatmentId: "physical-therapy",
      treatment: "Physical therapy",
      category: "conservative",
      aliases: ["PT", "Therapeutic exercise", "Manual therapy"],
      applicability:
        "Appropriate initial treatment when no progressive neurologic deficit or surgical emergency is documented.",
      adequacy:
        "An adequate course generally includes active exercise, functional progression, and reassessment of response.",
      sources: [
        {
          id: "acoem-low-back-2025",
          ref: "ACOEM Low Back Disorders Guideline",
          edition: "2025",
        },
      ],
    },
    {
      id: "0774649a-c705-477d-9c95-18be67090213",
      region: "lumbar_spine",
      canonicalDx: "lumbar_spine.disc_herniation_with_radiculopathy",
      treatmentId: "lumbar-epidural-steroid-injection",
      treatment: "Lumbar epidural steroid injection",
      category: "injection",
      aliases: ["Lumbar ESI", "Transforaminal epidural injection"],
      applicability:
        "May be considered for persistent radicular symptoms supported by concordant clinical and imaging findings.",
      adequacy:
        "Assess documented symptom response, functional response, duration of benefit, and whether repeat injections were clinically justified.",
      sources: [
        {
          id: "mtus-low-back-2024",
          ref: "MTUS Low Back Disorders Guideline",
          edition: "2024",
        },
      ],
    },
    {
      id: "79e1987f-f902-4724-a38e-44900ea13ee1",
      region: "lumbar_spine",
      canonicalDx: "lumbar_spine.disc_herniation_with_radiculopathy",
      treatmentId: "lumbar-discectomy",
      treatment: "Lumbar discectomy",
      category: "surgical",
      aliases: ["Microdiscectomy", "Lumbar decompression and discectomy"],
      applicability:
        "Consider when concordant radicular symptoms and objective findings persist despite appropriate nonoperative care, or when urgent neurologic indications are present.",
      adequacy:
        "Review diagnostic concordance, neurologic findings, prior treatment response, and documented surgical indications.",
      sources: [
        {
          id: "nass-lumbar-disc-herniation-2024",
          ref: "NASS Lumbar Disc Herniation with Radiculopathy Guideline",
          edition: "2024",
        },
      ],
    },
  ],

  treatmentEpisodes: [
    {
      id: "therapy:10e40ac9-3c53-43db-a386-253c85174c85:101",
      kind: "therapy",
      name: "Physical Therapy",
      provider: {
        id: "10e40ac9-3c53-43db-a386-253c85174c85",
        name: "Summit Physical Therapy",
        kind: "facility",
        discipline: "Physical Therapy",
      },
      documentCount: 2,
      therapyComponents: ["active_exercise", "manual_therapy"],
      records: [
        {
          recordId: 101,
          eventDate: "2025-02-03",
          extraction: {
            regions: ["lumbar_spine"],
            historyOfPresentIllness:
              "Reports low-back pain radiating into the right leg.",
            therapiesPerformed: [
              {
                type: "active_exercise",
                detail:
                  "Lumbar stabilization exercises and repeated extension exercises.",
              },
            ],
            objectiveMetrics: ["Lumbar flexion limited to 40 degrees."],
            functionalLimitations: [
              "Difficulty sitting longer than 30 minutes.",
            ],
            therapistAssessment:
              "Tolerated the initial exercise program without increased leg symptoms.",
            followUpPlan: "Continue physical therapy twice weekly.",
            noteType: "initial_eval",
            schemaVersion: "v1",
          },
        },
        {
          recordId: 108,
          eventDate: "2025-02-17",
          extraction: {
            regions: ["lumbar_spine"],
            historyOfPresentIllness:
              "Reports persistent low-back stiffness and intermittent right-leg symptoms.",
            therapiesPerformed: [
              {
                type: "active_exercise",
                detail: "Progressive core stabilization and hip strengthening.",
              },
              {
                type: "manual_therapy",
                detail:
                  "Lumbar soft-tissue mobilization and joint mobilization.",
              },
            ],
            objectiveMetrics: ["Lumbar flexion improved to 50 degrees."],
            functionalLimitations: [
              "Continued difficulty with prolonged sitting.",
            ],
            therapistAssessment:
              "Demonstrating gradual improvement in mobility but remains functionally limited.",
            followUpPlan: "Continue progression of stabilization program.",
            noteType: "progress_note_or_reeval",
            schemaVersion: "v1",
          },
        },
      ],
    },
    {
      id: "intervention:122",
      kind: "intervention",
      name: "Right L4-5 transforaminal epidural steroid injection",
      provider: {
        id: "05b9ed58-9446-4983-933a-16e0699a0254",
        name: "Dr. Elena Rivera",
        kind: "individual",
        discipline: "Orthopedics",
      },
      documentCount: 1,
      records: [
        {
          recordId: 122,
          eventDate: "2025-04-11",
          extraction: {
            name: "Transforaminal epidural steroid injection",
            bodySite: "Right L4-5",
            region: "lumbar_spine",
            treatmentType: "injection",
            laterality: "right",
            guidanceMethod: "fluoroscopy",
            medicationsInjected: [
              {
                name: "Dexamethasone",
                dose: "10 mg",
              },
              {
                name: "Lidocaine",
                dose: "1 mL",
              },
            ],
            immediate_response:
              "Patient tolerated the procedure without immediate complication.",
            complications: "",
            indication:
              "Persistent right lumbar radicular pain with L4-5 disc herniation.",
            followUpPlan: "Follow up in four weeks to assess response.",
            schemaVersion: "v1",
          },
        },
      ],
    },
    {
      id: "intervention:139",
      kind: "intervention",
      name: "Bilateral L4-5 facet joint injections",
      provider: {
        id: "05b9ed58-9446-4983-933a-16e0699a0254",
        name: "Dr. Elena Rivera",
        kind: "individual",
        discipline: "Orthopedics",
      },
      documentCount: 1,
      records: [
        {
          recordId: 139,
          eventDate: "2025-06-06",
          extraction: {
            name: "Lumbar facet joint injection",
            bodySite: "Bilateral L4-5",
            region: "lumbar_spine",
            treatmentType: "injection",
            laterality: "bilateral",
            guidanceMethod: "fluoroscopy",
            medicationsInjected: [
              {
                name: "Triamcinolone",
                dose: "40 mg",
              },
              {
                name: "Bupivacaine",
                dose: "1 mL",
              },
            ],
            immediate_response:
              "Pain decreased from 6/10 to 3/10 immediately after the procedure.",
            complications: "",
            indication:
              "Persistent axial low-back pain with suspected facet-mediated pain.",
            followUpPlan: "Return in three weeks.",
            schemaVersion: "v1",
          },
        },
      ],
    },
  ],

  completedStudies: [
    {
      recordId: 94,
      date: "2025-01-24",
      modality: "MRI",
      bodySite: "Lumbar Spine",
      detailedFindings:
        "At L4-5, there is a right paracentral disc extrusion narrowing the right lateral recess and contacting the descending right L5 nerve root.",
      radiologistImpression: [
        "Right paracentral L4-5 disc extrusion with right lateral recess narrowing and contact of the descending right L5 nerve root.",
      ],
    },
  ],
};

const examplerefinedAnalysisInputSnapshot = {
  input: {
    caseContext: {
      injuryType: "specific",
      dateOfInjury: "2024-12-18",
      caseType: "Work Injury",
    },
    scope: {
      region: "lumbar_spine",
      diagnoses: ["disc_herniation"],
    },
    referralQuestions: [],
    caseSummary: {
      incidentNarrative:
        "The patient reports persistent low back pain after lifting a heavy box at work on 12/18/2024.",
      statusTimeline: [
        {
          recordId: "1",
          subjective:
            "Low back pain radiating into the right leg. The patient reports persistent low back pain after lifting a heavy box at work on 12/18/2024. Pain is worse with prolonged sitting and bending. Positive for intermittent right leg tingling.",
          objective:
            "Lumbar flexion limited to 45 degrees with pain. Positive right straight-leg raise at 50 degrees. Strength 5/5 bilaterally.",
          functional:
            "Unable to sit longer than 30 minutes without changing position. Work status is modified_duty with restrictions: No lifting over 15 pounds, Alternate sitting and standing.",
          date: "2025-01-08",
          providerName: "Dr. Maya Chen (Test)",
          providerType: "Orthopedics",
        },
        {
          recordId: "3",
          subjective:
            "Pain improved from 7/10 to 4/10, but prolonged sitting and lifting remain difficult.",
          objective:
            "Lumbar flexion improved from 45 to 60 degrees. Right straight-leg raise remains positive at 60 degrees.",
          functional: "Sitting tolerance remains limited to 45 minutes.",
          date: "2025-02-14",
          providerName: "Northside Physical Therapy (Test)",
          providerType: "Physical Therapy",
        },
      ],
      caseWideSummary:
        "The patient sustained a low back injury on 12/18/2024 after lifting a heavy box at work, resulting in low back pain radiating into the right leg. An initial orthopedic evaluation by Dr. Maya Chen on 01/08/2025 diagnosed a lumbar disc herniation with right-sided radicular symptoms, prescribing Naproxen, ordering an MRI, and referring for physical therapy. An MRI of the lumbar spine on 01/20/2025 confirmed a right paracentral L4-5 disc extrusion contacting the traversing right L5 nerve root. The patient began physical therapy at Northside Physical Therapy, with a progress note on 02/14/2025 indicating pain improvement from 7/10 to 4/10, though prolonged sitting and lifting remain difficult. Objective findings showed improved lumbar flexion but a persistent positive right straight-leg raise. The patient continues with physical therapy and is on modified duty with restrictions, as documented in a work status report on 03/10/2025.",
      psychosocialFactors: null,
    },
    reviewedAnalysis: {
      treatmentIssues: [
        {
          id: "treatment-0",
          treatmentId: null,
          treatment: "Oral Corticosteroids",
          source: "ai",
          category: null,
          recordStatus: "To Be Started",
          recordDetail: null,
          episodeIds: [],
          assessments: [
            {
              canonicalDx: "disc_herniation",
              applicability: {
                value: "applicable",
                rationale:
                  "Oral corticosteroids are applicable for disc herniation with radiculopathy due to their potent anti-inflammatory effects, which can reduce nerve root irritation and associated pain.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
              adequacy: {
                value: "not_tried",
                rationale:
                  "This treatment has not been attempted according to the provided records.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
            },
          ],
          dispositionReviewed: true,
          physicianNote: null,
        },
        {
          id: "treatment-1",
          treatmentId: null,
          treatment: "Muscle Relaxants",
          source: "ai",
          category: null,
          recordStatus: "To Be Started",
          recordDetail: null,
          episodeIds: [],
          assessments: [
            {
              canonicalDx: "disc_herniation",
              applicability: {
                value: "applicable",
                rationale:
                  "Muscle relaxants are applicable for disc herniation, especially when muscle spasm contributes to pain and functional limitation.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
              adequacy: {
                value: "not_tried",
                rationale:
                  "This treatment has not been attempted according to the provided records.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
            },
          ],
          dispositionReviewed: true,
          physicianNote: null,
        },
        {
          id: "treatment-2",
          treatmentId: null,
          treatment: "Epidural Steroid Injection",
          source: "ai",
          category: null,
          recordStatus: "To Be Started",
          recordDetail: null,
          episodeIds: [],
          assessments: [
            {
              canonicalDx: "disc_herniation",
              applicability: {
                value: "applicable",
                rationale:
                  "ESIs are applicable for disc herniation with radiculopathy, as they directly deliver anti-inflammatory medication to the site of nerve compression, aiming to reduce pain and inflammation.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
              adequacy: {
                value: "not_tried",
                rationale:
                  "This treatment has not been attempted according to the provided records.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
            },
          ],
          dispositionReviewed: true,
          physicianNote: null,
        },
        {
          id: "treatment-4",
          treatmentId: null,
          treatment: "Physical Therapy",
          source: "record_only",
          category: null,
          recordStatus: "Ongoing",
          recordDetail:
            "One episode of physical therapy documented, with a progress note on 2025-02-14. Patient reported pain improvement from 7/10 to 4/10. Lumbar flexion improved from 45 to 60 degrees. Radicular symptoms and functional limitations persist. Treatment was recommended to continue for three additional weeks.",
          episodeIds: ["therapy:9a1b853c-aab9-4d58-be48-3d1977520efb:3"],
          assessments: [
            {
              canonicalDx: "disc_herniation",
              applicability: {
                value: "applicable",
                rationale:
                  "Physical therapy is a standard and applicable conservative treatment for disc herniation, focusing on pain reduction, improved mobility, and strengthening.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
              adequacy: {
                value: "inadequately_trialed",
                rationale:
                  "The patient is making gradual progress with some improvement in pain and range of motion, but radicular symptoms and functional limitations persist. Treatment is ongoing with further sessions planned, indicating it is not yet adequately trialed.",
                source: "ai",
                reviewStatus: "agree",
                note: null,
              },
            },
          ],
          dispositionReviewed: true,
          physicianNote: null,
        },
      ],
      treatmentContext: [
        {
          id: "treatment-5",
          treatment: "Naproxen (NSAID)",
          canonicalDx: "disc_herniation",
          recordDetail:
            "Ordered 500 mg twice daily on 2025-01-08. No documentation on duration of use, efficacy, or discontinuation.",
        },
      ],
      treatmentNotes: [],
      inconsistencies: [],
      evidenceGaps: [
        {
          gap: "Documentation regarding the duration of Naproxen use, patient compliance, and its effectiveness in managing pain and inflammation.",
          significance:
            "Without this information, it is unclear whether NSAID therapy was adequately trialed or if the patient experienced any adverse effects or insufficient relief, which impacts decisions for further pharmacological management.",
          id: "gap-0",
          reviewed: true,
          physicianNote: null,
        },
        {
          gap: "Detailed physical therapy treatment plan, including specific exercises, modalities, and patient adherence at each visit.",
          significance:
            "While a progress note is provided, a comprehensive understanding of the PT regimen and patient engagement is crucial to fully assess the adequacy of the physical therapy intervention and guide future rehabilitation strategies.",
          id: "gap-1",
          reviewed: true,
          physicianNote: null,
        },
      ],
      physicianNotes: "Adequacy of PT most important. Also meds. ",
    },
  },
  fullReviewedAnalysis: {
    inconsistencies: [],
    evidenceGaps: [
      {
        gap: "Documentation regarding the duration of Naproxen use, patient compliance, and its effectiveness in managing pain and inflammation.",
        significance:
          "Without this information, it is unclear whether NSAID therapy was adequately trialed or if the patient experienced any adverse effects or insufficient relief, which impacts decisions for further pharmacological management.",
        id: "gap-0",
        reviewed: true,
        physicianNote: null,
      },
      {
        gap: "Detailed physical therapy treatment plan, including specific exercises, modalities, and patient adherence at each visit.",
        significance:
          "While a progress note is provided, a comprehensive understanding of the PT regimen and patient engagement is crucial to fully assess the adequacy of the physical therapy intervention and guide future rehabilitation strategies.",
        id: "gap-1",
        reviewed: true,
        physicianNote: null,
      },
    ],
    physicianNotes: "Adequacy of PT most important. Also meds. ",
    treatments: [
      {
        id: "treatment-0",
        treatmentId: null,
        treatment: "Oral Corticosteroids",
        source: "ai",
        category: null,
        recordStatus: "To Be Started",
        recordDetail: null,
        episodeIds: [],
        assessments: [
          {
            canonicalDx: "disc_herniation",
            applicability: {
              value: "applicable",
              rationale:
                "Oral corticosteroids are applicable for disc herniation with radiculopathy due to their potent anti-inflammatory effects, which can reduce nerve root irritation and associated pain.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
            adequacy: {
              value: "not_tried",
              rationale:
                "This treatment has not been attempted according to the provided records.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
          },
        ],
        dispositionReviewed: true,
        physicianNote: null,
      },
      {
        id: "treatment-1",
        treatmentId: null,
        treatment: "Muscle Relaxants",
        source: "ai",
        category: null,
        recordStatus: "To Be Started",
        recordDetail: null,
        episodeIds: [],
        assessments: [
          {
            canonicalDx: "disc_herniation",
            applicability: {
              value: "applicable",
              rationale:
                "Muscle relaxants are applicable for disc herniation, especially when muscle spasm contributes to pain and functional limitation.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
            adequacy: {
              value: "not_tried",
              rationale:
                "This treatment has not been attempted according to the provided records.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
          },
        ],
        dispositionReviewed: true,
        physicianNote: null,
      },
      {
        id: "treatment-2",
        treatmentId: null,
        treatment: "Epidural Steroid Injection",
        source: "ai",
        category: null,
        recordStatus: "To Be Started",
        recordDetail: null,
        episodeIds: [],
        assessments: [
          {
            canonicalDx: "disc_herniation",
            applicability: {
              value: "applicable",
              rationale:
                "ESIs are applicable for disc herniation with radiculopathy, as they directly deliver anti-inflammatory medication to the site of nerve compression, aiming to reduce pain and inflammation.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
            adequacy: {
              value: "not_tried",
              rationale:
                "This treatment has not been attempted according to the provided records.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
          },
        ],
        dispositionReviewed: true,
        physicianNote: null,
      },
      {
        id: "treatment-4",
        treatmentId: null,
        treatment: "Physical Therapy",
        source: "record_only",
        category: null,
        recordStatus: "Ongoing",
        recordDetail:
          "One episode of physical therapy documented, with a progress note on 2025-02-14. Patient reported pain improvement from 7/10 to 4/10. Lumbar flexion improved from 45 to 60 degrees. Radicular symptoms and functional limitations persist. Treatment was recommended to continue for three additional weeks.",
        episodeIds: ["therapy:9a1b853c-aab9-4d58-be48-3d1977520efb:3"],
        assessments: [
          {
            canonicalDx: "disc_herniation",
            applicability: {
              value: "applicable",
              rationale:
                "Physical therapy is a standard and applicable conservative treatment for disc herniation, focusing on pain reduction, improved mobility, and strengthening.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
            adequacy: {
              value: "inadequately_trialed",
              rationale:
                "The patient is making gradual progress with some improvement in pain and range of motion, but radicular symptoms and functional limitations persist. Treatment is ongoing with further sessions planned, indicating it is not yet adequately trialed.",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
          },
        ],
        dispositionReviewed: true,
        physicianNote: null,
      },
      {
        id: "treatment-5",
        treatmentId: null,
        treatment: "Naproxen (NSAID)",
        source: "record_only",
        category: null,
        recordStatus: "Unclear",
        recordDetail:
          "Ordered 500 mg twice daily on 2025-01-08. No documentation on duration of use, efficacy, or discontinuation.",
        episodeIds: [],
        assessments: [
          {
            canonicalDx: "disc_herniation",
            applicability: {
              value: "applicable",
              rationale:
                "Naproxen, an NSAID, is applicable for disc herniation to manage pain and inflammation associated with the condition.",
              source: "ai",
              reviewStatus: "unreviewed",
              note: null,
            },
            adequacy: {
              value: "adequately_trialed",
              rationale: "good enough",
              source: "physician",
              reviewStatus: "override",
              note: null,
            },
          },
        ],
        dispositionReviewed: true,
        physicianNote: null,
      },
    ],
  },
  basedOn: {
    caseSummaryId: 1,
    preExamAnalysisId: 6,
    preExamAnalysisUpdatedAt: "2026-10-03T06:01:21.650Z",
    physicianSteeringId: 1,
    physicianSteeringRevision: 5,
  },
};
