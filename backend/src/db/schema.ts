import { relations, sql } from "drizzle-orm";
import {
  check,
  pgTable,
  date,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  DiagnosisState,
  CaseOpinions,
  ProviderDiscipline,
  ProviderKind,
  Region,
  PhysicianSteering,
  StoredCaseClinicalSummary,
  StoredPreExamAnalysis,
  StoredProviderSummaries,
  RefinedAnalysisInputSnapshot,
  VisitDocumentation,
  PostExamInputSnapshot,
  StoredPostExamAnalysis,
  AmaMode,
  AmaQuestion,
  AmaEntry,
  AmaExaminationTask,
  CaseReportResponse,
  ReportInput,
  PatientQuestionnaireResponse,
  QuestionnaireScores,
  RecordDocumentMetadata,
  DocumentType,
} from "@azime/contracts";
import type { PreExamInputSnapshot } from "../ai/preExamInputSnapshot.js";
import type { StoredRefinedAnalysis } from "../ai/refinedAnalysisSchema.js";

//supported regions

export const MockAuthUsers = pgTable("auth_users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  createdAd: timestamp("created_at").defaultNow(),
});
export const Users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => MockAuthUsers.id), //!!! CHANGE for
  //stripe customer id if we cant make it same as this id
  name: varchar("name", { length: 255 }).notNull(),
  role: text("role").notNull().default("staff"), //or doc
  email: text("email"),
  specialty: text("specialty"), //blank for staff
});

export const CaseContacts = pgTable("case_contacts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }), //attorney, other
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
});
export type CaseContacts = InferSelectModel<typeof CaseContacts>;

export const PatientCase = pgTable("patientcase", {
  id: serial("id").primaryKey(),
  patientName: varchar("patient_name", { length: 255 }),
  patientLastName: varchar("patient_last_name", { length: 255 }),
  providerAssigned: uuid("provider").references(() => Users.id),
  caseContact: integer("case_contact").references(() => CaseContacts.id),
  caseType: varchar("case_type", { length: 255 }),
  caseStatus: varchar("case_status", { length: 255 }),
  injuryType: varchar("injury_type", { length: 50 })
    .$type<"specific" | "cumulative" | "undetermined">()
    .notNull()
    .default("specific"),
  dateOfInjury: date("date_of_injury"),
  regions: text("regions").array().$type<Region[]>().notNull().default([]),
  amaMode: varchar("ama_mode", { length: 20 }).$type<AmaMode>().notNull(),
  // Verbatim from the referral; the final report answers each one.
  referralQuestions: text("referral_questions").array().notNull().default([]),
});
export type PatientCase = InferSelectModel<typeof PatientCase>;
export type NewPatientCase = InferInsertModel<typeof PatientCase>;

export const CaseProviders = pgTable("case_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => PatientCase.id),
  name: text("name").notNull(),
  kind: text("kind").$type<ProviderKind>().notNull(),
  discipline: text("discipline").$type<ProviderDiscipline>().notNull(),
});
export type CaseProvider = InferSelectModel<typeof CaseProviders>;
export type NewCaseProvider = InferInsertModel<typeof CaseProviders>;

export const PatientCaseRelations = relations(PatientCase, ({ one }) => ({
  caseContact: one(CaseContacts, {
    fields: [PatientCase.caseContact],
    references: [CaseContacts.id],
    relationName: "caseContact",
  }),
  providerAssigned: one(Users, {
    fields: [PatientCase.providerAssigned],
    references: [Users.id],
    relationName: "providerAssigned",
  }),
}));

export const CaseRecordsSummary = pgTable(
  "case_records_summary",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    summary: jsonb("summary").$type<StoredCaseClinicalSummary>().notNull(),
  },
  (table) => ({
    caseIdUniqueIdx: uniqueIndex("case_records_summary_case_id_unique").on(
      table.caseId
    ),
  })
);
export type CaseRecordsSummary = InferSelectModel<typeof CaseRecordsSummary>;

export const CaseProviderSummaries = pgTable("case_provider_summaries", {
  caseId: integer("case_id")
    .primaryKey()
    .references(() => PatientCase.id),
  summary: jsonb("summary").$type<StoredProviderSummaries>().notNull(),
});
export type CaseProviderSummaries = InferSelectModel<
  typeof CaseProviderSummaries
>;

export const CasePreExamAnalysis = pgTable(
  "case_pre_exam_analysis",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    region: text("region").$type<Region>(),
    inputSnapshot: jsonb("input_snapshot").$type<PreExamInputSnapshot>(),
    analysis: jsonb("analysis").$type<StoredPreExamAnalysis>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseIdRegionUniqueIdx: uniqueIndex(
      "case_pre_exam_analysis_case_id_region_unique"
    ).on(table.caseId, table.region),
  })
);
export type CasePreExamAnalysis = InferSelectModel<typeof CasePreExamAnalysis>;

export const CasePhysicianSteering = pgTable(
  "case_physician_steering",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    region: text("region").$type<Region>(),
    steering: jsonb("steering").$type<PhysicianSteering>().notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseIdUniqueIdx: uniqueIndex(
      "case_physician_steering_case_id_region_id_unique"
    ).on(table.caseId, table.region),
  })
);
export type CasePhysicianSteering = InferSelectModel<
  typeof CasePhysicianSteering
>;

// The region's diagnosis list (scope + physician conclusions). Separate from steering,
// which belongs to one 3A run; this list exists before any 3A and outlives reruns.
export const CaseRegionDiagnoses = pgTable(
  "case_region_diagnoses",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    region: text("region").$type<Region>().notNull(),
    diagnoses: jsonb("diagnoses").$type<DiagnosisState[]>().notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseRegionUnique: uniqueIndex("case_region_diagnoses_case_region_unique").on(
      table.caseId,
      table.region
    ),
  })
);
export type CaseRegionDiagnoses = InferSelectModel<typeof CaseRegionDiagnoses>;

export const CaseOpinionsDocument = pgTable(
  "case_opinions",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    opinions: jsonb("opinions").$type<CaseOpinions>().notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseUnique: uniqueIndex("case_opinions_case_unique").on(table.caseId),
  })
);
export type CaseOpinionsDocument = InferSelectModel<typeof CaseOpinionsDocument>;

export const CaseRefinedAnalysis = pgTable(
  "case_refined_analysis",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    analysis: jsonb("analysis").$type<StoredRefinedAnalysis>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseIdUniqueIdx: uniqueIndex("case_refined_analysis_case_id_unique").on(
      table.caseId
    ),
  })
);
export type CaseRefinedAnalysis = InferSelectModel<typeof CaseRefinedAnalysis>;

// One current exam prep (refined analysis) per case/region, replaced only after a
// successful run. The legacy case-only table above remains available.
export const CaseRefinedPreExamAnalysis = pgTable(
  "case_refined_pre_exam_analysis",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    region: text("region").$type<Region>().notNull(),
    inputSnapshot: jsonb("input_snapshot")
      .$type<RefinedAnalysisInputSnapshot>()
      .notNull(),
    analysis: jsonb("analysis").$type<StoredRefinedAnalysis>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseRegionUnique: uniqueIndex(
      "case_refined_pre_exam_analysis_case_region_unique"
    ).on(table.caseId, table.region),
  })
);
export type CaseRefinedPreExamAnalysis = InferSelectModel<
  typeof CaseRefinedPreExamAnalysis
>;

// One visit per case; it feeds each region's post-exam analysis.
export const CaseVisitDocumentation = pgTable(
  "case_visit_documentation",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    documentation: jsonb("documentation").$type<VisitDocumentation>().notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseUnique: uniqueIndex("case_visit_documentation_case_unique").on(
      table.caseId
    ),
  })
);
export type CaseVisitDocumentation = InferSelectModel<
  typeof CaseVisitDocumentation
>;

export const CasePostExamAnalysis = pgTable(
  "case_post_exam_analysis",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    region: text("region").$type<Region>().notNull(),
    inputSnapshot: jsonb("input_snapshot")
      .$type<PostExamInputSnapshot>()
      .notNull(),
    analysis: jsonb("analysis").$type<StoredPostExamAnalysis>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseRegionIdx: index("case_post_exam_analysis_case_region_idx").on(
      table.caseId,
      table.region,
      table.id
    ),
  })
);
export type CasePostExamAnalysis = InferSelectModel<
  typeof CasePostExamAnalysis
>;

export const Appointment = pgTable("appointments", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => PatientCase.id),
  provider: uuid("provider")
    .notNull()
    .references(() => Users.id),
  date: timestamp("date"),
});
export const AppointmentRelations = relations(Appointment, ({ one }) => ({
  caseId: one(PatientCase, {
    fields: [Appointment.caseId],
    references: [PatientCase.id],
    relationName: "caseId",
  }),
  provider: one(Users, {
    fields: [Appointment.provider],
    references: [Users.id],
    relationName: "provider",
  }),
}));
//packet links
export const Records = pgTable("record", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => PatientCase.id),
  url: text("url"),
  summary: jsonb("summary"),
  summaryStatus: text("summary_status").notNull().default("pending"),
  name: text("name"),
  providerId: uuid("provider_id").references(() => CaseProviders.id),
  documentType: text("document_type").$type<DocumentType>().notNull(),
  eventDate: date("event_date"),
  metadata: jsonb("metadata").$type<RecordDocumentMetadata>(),
});
export type Records = InferSelectModel<typeof Records>;
export type NewRecords = InferInsertModel<typeof Records>;

export const DiagnosisMentions = pgTable(
  "diagnosis_mentions",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    recordId: integer("record_id")
      .notNull()
      .references(() => Records.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icd: text("icd"),
    // 'unresolved' is a valid extraction value, so this is not a taxonomy FK.
    region: text("region").notNull(),
    canonicalDx: text("canonical_dx").notNull(),
    evidencePage: integer("evidence_page").notNull(),
    evidenceQuote: text("evidence_quote").notNull(),
    eventDate: date("event_date"),
  },
  (table) => ({
    caseIdIdx: index("diagnosis_mentions_case_id_idx").on(table.caseId),
    recordIdIdx: index("diagnosis_mentions_record_id_idx").on(table.recordId),
  })
);
export type DiagnosisMention = InferSelectModel<typeof DiagnosisMentions>;
export type NewDiagnosisMention = InferInsertModel<typeof DiagnosisMentions>;

export const RecordRelations = relations(Records, ({ one }) => ({
  case: one(PatientCase, {
    fields: [Records.caseId],
    references: [PatientCase.id],
    relationName: "case",
  }),
  provider: one(CaseProviders, {
    fields: [Records.providerId],
    references: [CaseProviders.id],
    relationName: "provider",
  }),
}));

export const CaseProviderRelations = relations(CaseProviders, ({ one }) => ({
  case: one(PatientCase, {
    fields: [CaseProviders.caseId],
    references: [PatientCase.id],
    relationName: "case",
  }),
}));
export const ClinicalNote = pgTable("clinicalnote", {
  id: serial("id"),
  caseId: integer("case_id").references(() => PatientCase.id),
  apt: integer("apt").references(() => Appointment.id),
  type: varchar("type", { length: 255 }), //main or addendum
  audioUrl: varchar("audio_url", { length: 255 }),
  note: text("note"),
});
export const ClinicalNoteRelations = relations(ClinicalNote, ({ one }) => ({
  apt: one(Appointment, {
    fields: [ClinicalNote.apt],
    references: [Appointment.id],
    relationName: "apt",
  }),
  caseId: one(PatientCase, {
    fields: [ClinicalNote.caseId],
    references: [PatientCase.id],
    relationName: "caseId",
  }),
}));

export type PainDisabilityQuestionnaireResponse = {
  itemId: string;
  score: number;
};

export const PainDisabilityQuestionnaire = pgTable(
  "pain_disability_questionnaire",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    appointmentId: integer("appointment_id").references(() => Appointment.id),
    accessToken: uuid("access_token").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("in_progress"),
    responses: jsonb("responses")
      .$type<PainDisabilityQuestionnaireResponse[]>()
      .notNull()
      .default([]),
    totalScore: integer("total_score"),
    functionalScore: integer("functional_score"),
    psychosocialScore: integer("psychosocial_score"),
    instrumentVersion: varchar("instrument_version", { length: 64 })
      .notNull()
      .default("pdq-v1"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    accessTokenIdx: uniqueIndex("pdq_access_token_idx").on(table.accessToken),
  })
);
export type PainDisabilityQuestionnaire = InferSelectModel<
  typeof PainDisabilityQuestionnaire
>;
export type NewPainDisabilityQuestionnaire = InferInsertModel<
  typeof PainDisabilityQuestionnaire
>;

export const PainDisabilityQuestionnaireRelations = relations(
  PainDisabilityQuestionnaire,
  ({ one }) => ({
    case: one(PatientCase, {
      fields: [PainDisabilityQuestionnaire.caseId],
      references: [PatientCase.id],
      relationName: "case",
    }),
    appointment: one(Appointment, {
      fields: [PainDisabilityQuestionnaire.appointmentId],
      references: [Appointment.id],
      relationName: "appointment",
    }),
  })
);

export const PatientQuestionnaireInstance = pgTable(
  "patient_questionnaire_instance",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    appointmentId: integer("appointment_id").references(() => Appointment.id),
    type: varchar("type", { length: 80 }).notNull(),
    accessToken: uuid("access_token").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("in_progress"),
    responses: jsonb("responses")
      .$type<PatientQuestionnaireResponse[]>()
      .notNull()
      .default([]),
    scores: jsonb("scores").$type<QuestionnaireScores>(),
    instrumentVersion: varchar("instrument_version", { length: 64 }).notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    accessTokenIdx: uniqueIndex("patient_questionnaire_access_token_idx").on(
      table.accessToken
    ),
  })
);
export type PatientQuestionnaireInstance = InferSelectModel<
  typeof PatientQuestionnaireInstance
>;
export type NewPatientQuestionnaireInstance = InferInsertModel<
  typeof PatientQuestionnaireInstance
>;

export const PatientQuestionnaireInstanceRelations = relations(
  PatientQuestionnaireInstance,
  ({ one }) => ({
    case: one(PatientCase, {
      fields: [PatientQuestionnaireInstance.caseId],
      references: [PatientCase.id],
      relationName: "case",
    }),
    appointment: one(Appointment, {
      fields: [PatientQuestionnaireInstance.appointmentId],
      references: [Appointment.id],
      relationName: "appointment",
    }),
  })
);

export const AnchorAnswers = pgTable("anchoras", {
  qid: integer("qid").references(() => AnchorQuesions.id),
  case: integer("case").references(() => PatientCase.id),
  score: integer("score"),
});
export const AnchorQuesions = pgTable("anchorqs", {
  id: serial("id").primaryKey(),
  q: text("q"),
  type: varchar("type"),
});
export const StandardizedReportQs = pgTable("standardqs", {
  id: serial("id").primaryKey(),
  q: text("q"),
  type: varchar("type"), //
});

// Every report generation: the frozen drafter input, then the drafted report.
export const CaseReport = pgTable(
  "case_report",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => PatientCase.id),
    input: jsonb("input").$type<ReportInput>().notNull(),
    report: text("report"),
    source: jsonb("source").$type<NonNullable<CaseReportResponse["source"]>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseIdx: index("case_report_case_idx").on(table.caseId, table.id),
  })
);
export type CaseReport = InferSelectModel<typeof CaseReport>;

export const AmaRatingTables = pgTable("ama_rating_tables", {
  tableId: text("table_id").primaryKey(),
  description: text("description").notNull(),
  instructions: text("instructions"),
  sourceRef: jsonb("source_ref")
    .$type<import("@azime/contracts").AmaRatingTable["source_ref"]>()
    .notNull(),
  classOptions: jsonb("class_options")
    .$type<import("@azime/contracts").AmaRatingTable["class_options"]>()
    .notNull(),
  modOptions: jsonb("mod_options")
    .$type<import("@azime/contracts").AmaRatingTable["mod_options"]>()
    .notNull(),
  results: jsonb("results")
    .$type<import("@azime/contracts").AmaRatingTable["results"]>()
    .notNull(),
});

export const AmaDiagnosticRows = pgTable("ama_diagnostic_rows", {
  rowId: text("row_id").primaryKey(),
  regionId: text("region_id").notNull(),
  description: text("description").notNull(),
  nerveRoots: text("nerve_roots")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  help: text("help"),
  questions: jsonb("questions").$type<AmaQuestion[]>().notNull(),
  entries: jsonb("entries").$type<AmaEntry[]>().notNull(),
  examinationTasks: jsonb("examination_tasks")
    .$type<AmaExaminationTask[]>()
    .notNull(),
});
export type AmaDiagnosticRow = InferSelectModel<typeof AmaDiagnosticRows>;
export type NewAmaDiagnosticRow = InferInsertModel<typeof AmaDiagnosticRows>;

export const CanonicalDiagnoses = pgTable("canonical_diagnoses", {
  id: text("id").primaryKey(), //generated by offline project
  regionId: text("region_id").notNull(), // lumbar
  label: text("label").notNull(), //stenosis
  definition: text("definition"),
  icdPrefixes: text("icd_prefixes").array().notNull(),
  amaRatingTableIds: text("ama_rating_table_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  amaRowIds: text("ama_row_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
});
export type CanonicalDiagnosis = InferSelectModel<typeof CanonicalDiagnoses>;
export type NewCanonicalDiagnosis = InferInsertModel<typeof CanonicalDiagnoses>;

export const Treatments = pgTable(
  "treatments",
  {
    id: text("id").primaryKey(),
    region: text("region"),
    category: text("category")
      .$type<
        "conservative" | "medication" | "injection" | "surgical" | "multimodal"
      >()
      .notNull(),
    label: text("label").notNull(),
  },
  (table) => ({
    categoryCheck: check(
      "treatments_category_check",
      sql`${table.category} in ('conservative', 'medication', 'injection', 'surgical', 'multimodal')`
    ),
  })
);
export type Treatment = InferSelectModel<typeof Treatments>;
export type NewTreatment = InferInsertModel<typeof Treatments>;

export const TreatmentAliases = pgTable(
  "treatment_aliases",
  {
    treatmentId: text("treatment_id")
      .notNull()
      .references(() => Treatments.id),
    alias: text("alias").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.treatmentId, table.alias] }),
  })
);
export type TreatmentAlias = InferSelectModel<typeof TreatmentAliases>;
export type NewTreatmentAlias = InferInsertModel<typeof TreatmentAliases>;

export const Sources = pgTable("sources", {
  id: text("id").primaryKey(),
  ref: text("ref").notNull(),
  edition: text("edition").notNull(),
});
export type Source = InferSelectModel<typeof Sources>;
export type NewSource = InferInsertModel<typeof Sources>;

export const LadderEntries = pgTable("ladder_entries", {
  id: text("id").primaryKey(),
  regionId: text("region_id"),
  canonicalDxId: text("canonical_dx_id")
    .notNull()
    .references(() => CanonicalDiagnoses.id),
  treatmentId: text("treatment_id")
    .notNull()
    .references(() => Treatments.id),
  applicability: text("applicability"),
  adequacy: text("adequacy"),
});
export type LadderEntry = InferSelectModel<typeof LadderEntries>;
export type NewLadderEntry = InferInsertModel<typeof LadderEntries>;

export const LadderEntrySources = pgTable(
  "ladder_entry_sources",
  {
    ladderEntryId: text("ladder_entry_id")
      .notNull()
      .references(() => LadderEntries.id),
    sourceId: text("source_id")
      .notNull()
      .references(() => Sources.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ladderEntryId, table.sourceId] }),
  })
);
export type LadderEntrySource = InferSelectModel<typeof LadderEntrySources>;
export type NewLadderEntrySource = InferInsertModel<typeof LadderEntrySources>;
