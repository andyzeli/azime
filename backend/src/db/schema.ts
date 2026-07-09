import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

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
});
export type PatientCase = InferSelectModel<typeof PatientCase>;
export type NewPatientCase = InferInsertModel<typeof PatientCase>;

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

export const CaseRecordsSummary = pgTable("case_records_summary", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => PatientCase.id),
  section: varchar("section", { length: 255 }), // per provider, other sections. use as Title of Section "sectionType"
  summary: text("summary"),
});
export type CaseRecordsSummary = InferSelectModel<typeof CaseRecordsSummary>;
export type NewCaseRecordsSummary = InferInsertModel<typeof CaseRecordsSummary>;

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
  providerName: text("provider_name"),
  documentGroup: text("document_group"),
  documentType: text("document_type"),
});
export type Records = InferSelectModel<typeof Records>;
export type NewRecords = InferInsertModel<typeof Records>;
export const RecordRelations = relations(Records, ({ one }) => ({
  case: one(PatientCase, {
    fields: [Records.caseId],
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
export const ClinicalNoteRelations = relations(
  ClinicalNote,
  ({ one }) => ({
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
  }),
);

export type PainDisabilityQuestionnaireResponse = {
  itemId: string;
  score: number;
};

export type PatientQuestionnaireResponse = {
  itemId: string;
  score: number;
};

export type PatientQuestionnaireScores = {
  totalScore: number;
  denominator: number;
  maxScore: number;
  percentage: number | null;
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
  }),
);
export type PainDisabilityQuestionnaire =
  InferSelectModel<typeof PainDisabilityQuestionnaire>;
export type NewPainDisabilityQuestionnaire =
  InferInsertModel<typeof PainDisabilityQuestionnaire>;

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
  }),
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
    scores: jsonb("scores").$type<PatientQuestionnaireScores>(),
    instrumentVersion: varchar("instrument_version", { length: 64 }).notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    accessTokenIdx: uniqueIndex("patient_questionnaire_access_token_idx").on(
      table.accessToken,
    ),
  }),
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
  }),
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

export const GenReport = pgTable("gen_report", {
  id: integer("id").primaryKey(),
  caseId: integer("case_id").references(() => PatientCase.id),
  type: varchar("type", { length: 255 }),
  report: text("report"),
});
