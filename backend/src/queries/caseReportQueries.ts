import { and, desc, eq } from "drizzle-orm";
import {
  caseReportResponseSchema,
  physicianSignatureName,
  type CaseReportResponse,
  type ReportInput,
  type SaveCaseReportRequest,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CaseReport, PatientCase } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { renderReportPdf } from "../report/reportPdf.js";
import { getPracticeSettings } from "./practiceSettingsQueries.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

// The PDF bytes stay out of every response.
const toCaseReportResponse = ({
  signedPdf: _pdf,
  ...row
}: Omit<CaseReport, "signedPdf"> & { signedPdf?: unknown }) =>
  caseReportResponseSchema.parse({
    ...row,
    signedAt: row.signedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export async function getLatestCaseReport(caseId: number) {
  const row = await db.query.CaseReport.findFirst({
    columns: { signedPdf: false },
    where: eq(CaseReport.caseId, caseId),
    orderBy: [desc(CaseReport.id)],
  });
  return row ? toCaseReportResponse(row) : null;
}

// Frozen before the model runs, so a failed generation still shows what it was given.
export async function createCaseReport(caseId: number, input: ReportInput) {
  return db.transaction(async (tx) => {
    await lockCase(tx, caseId);
    const [row] = await tx.insert(CaseReport).values({ caseId, input }).returning();
    return row!;
  });
}

export async function saveCaseReportDraft(
  id: number,
  report: string,
  source: NonNullable<CaseReportResponse["source"]>
) {
  const [row] = await db
    .update(CaseReport)
    .set({ report, source, updatedAt: new Date() })
    .where(eq(CaseReport.id, id))
    .returning();
  return toCaseReportResponse(row!);
}

// Report writes for a case (generate, edit, sign, reopen) run one at a time: each locks
// the case row first, so "latest" can't change underneath.
async function lockCase(tx: Tx, caseId: number) {
  await tx
    .select({ id: PatientCase.id })
    .from(PatientCase)
    .where(eq(PatientCase.id, caseId))
    .for("update");
}

// The case's latest draft; only it can be edited, signed or reopened (an older one was
// replaced by a regeneration or a reopen).
async function lockLatest(tx: Tx, caseId: number, reportId: number) {
  await lockCase(tx, caseId);
  const [latest] = await tx
    .select()
    .from(CaseReport)
    .where(eq(CaseReport.caseId, caseId))
    .orderBy(desc(CaseReport.id))
    .limit(1);
  if (latest?.id !== reportId || latest.report === null)
    throw new MissingPrerequisiteError("A newer draft exists. Reload the page");
  return { ...latest, report: latest.report };
}

export async function saveCaseReportEdit(
  caseId: number,
  reportId: number,
  { report, expectedRevision }: SaveCaseReportRequest
) {
  return db.transaction(async (tx) => {
    const latest = await lockLatest(tx, caseId, reportId);
    if (latest.signedAt)
      throw new MissingPrerequisiteError("The report is signed. Reopen it to edit");
    if (latest.revision !== expectedRevision)
      throw new MissingPrerequisiteError("The draft changed. Reload before saving");
    const [row] = await tx
      .update(CaseReport)
      .set({ report, revision: latest.revision + 1, updatedAt: new Date() })
      .where(eq(CaseReport.id, reportId))
      .returning();
    return toCaseReportResponse(row!);
  });
}

async function patientFor(tx: Executor, caseId: number) {
  const [patient] = await tx
    .select({
      first: PatientCase.patientName,
      last: PatientCase.patientLastName,
      dateOfBirth: PatientCase.dateOfBirth,
      dateOfInjury: PatientCase.dateOfInjury,
    })
    .from(PatientCase)
    .where(eq(PatientCase.id, caseId));
  return {
    name: [patient?.first, patient?.last].filter(Boolean).join(" ") || "Unnamed patient",
    dateOfBirth: patient?.dateOfBirth ?? null,
    dateOfInjury: patient?.dateOfInjury ?? null,
  };
}

async function reportPdf(
  tx: Executor,
  row: { caseId: number; input: ReportInput; report: string },
  signature: Parameters<typeof renderReportPdf>[0]["signature"]
) {
  return renderReportPdf({
    markdown: row.report,
    practice: await getPracticeSettings(tx),
    patient: {
      ...(await patientFor(tx, row.caseId)),
      examinationDate: row.input.intro.examinationDate,
    },
    signature,
  });
}

// Signing freezes the latest draft and stores its PDF, the copy staff send out.
// expectedRevision is the text the physician reviewed; a save from elsewhere refuses.
export async function signCaseReport(
  caseId: number,
  reportId: number,
  expectedRevision: number,
  email: string | null
) {
  return db.transaction(async (tx) => {
    const latest = await lockLatest(tx, caseId, reportId);
    if (latest.signedAt) throw new MissingPrerequisiteError("The report is already signed");
    if (latest.revision !== expectedRevision)
      throw new MissingPrerequisiteError("The draft changed. Reload before signing");
    const practice = await getPracticeSettings(tx);
    if (!practice.physicianName)
      throw new MissingPrerequisiteError(
        "Add the physician's name in Settings before signing"
      );
    const signedAt = new Date();
    const signedBy = physicianSignatureName(practice);
    const signedPdf = await reportPdf(tx, latest, {
      name: signedBy,
      license: practice.physicianLicense,
      signedAt,
    });
    const [row] = await tx
      .update(CaseReport)
      .set({ signedAt, signedBy, signedByEmail: email, signedPdf })
      .where(eq(CaseReport.id, reportId))
      .returning();
    return toCaseReportResponse(row!);
  });
}

// Reopening keeps the signed draft and its PDF, and continues on an unsigned copy.
export async function reopenCaseReport(caseId: number, reportId: number) {
  return db.transaction(async (tx) => {
    const latest = await lockLatest(tx, caseId, reportId);
    if (!latest.signedAt) throw new MissingPrerequisiteError("The report is not signed");
    const [row] = await tx
      .insert(CaseReport)
      .values({
        caseId,
        input: latest.input,
        report: latest.report,
        source: latest.source,
      })
      .returning();
    return toCaseReportResponse(row!);
  });
}

// The signed PDF as stored, or an unsigned preview of the draft as it is now. No
// transaction: nothing is written, and rendering shouldn't hold a connection open.
export async function getCaseReportPdf(caseId: number, reportId: number) {
  const [row] = await db
    .select()
    .from(CaseReport)
    .where(and(eq(CaseReport.caseId, caseId), eq(CaseReport.id, reportId)));
  if (!row?.report) return null;
  const pdf =
    row.signedPdf ?? (await reportPdf(db, { ...row, report: row.report }, null));
  const { name } = await patientFor(db, caseId);
  const date = row.input.intro.examinationDate;
  return {
    pdf,
    signed: row.signedPdf !== null,
    filename: `IME Report - ${name} - ${date}${row.signedPdf ? "" : " (draft)"}.pdf`,
  };
}
