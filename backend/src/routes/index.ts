import { FastifyInstance } from "fastify";
import { contactController } from "../controllers/contactController.js";
import { caseController } from "../controllers/caseController.js";
import { caseAggregateSummaryController } from "../controllers/caseAggregateSummaryController.js";
import { recordsController } from "../controllers/recordsController.js";

import { uploadController } from "../controllers/uploadController.js";
import { patientQuestionnaireController } from "../controllers/patientQuestionnaireController.js";
import { caseArtifactsController } from "../controllers/caseArtifactsController.js";
import { physicianSteeringController } from "../controllers/physicianSteeringController.js";
import { preExamAnalysisController } from "../controllers/preExamAnalysisController.js";
import { providerSummariesController } from "../controllers/providerSummariesController.js";
import { refinedAnalysisController } from "../controllers/refinedAnalysisController.js";
import { caseProvidersController } from "../controllers/caseProvidersController.js";
import { testRecordsController } from "../controllers/testRecordsController.js";
import { caseOpinionsController } from "../controllers/caseOpinionsController.js";
import { visitDocumentationController } from "../controllers/visitDocumentationController.js";
import { canonicalDiagnosesController } from "../controllers/canonicalDiagnosesController.js";
import { postExamAnalysisController } from "../controllers/postExamAnalysisController.js";
import { amaCandidatesController } from "../controllers/amaCandidatesController.js";
import { amaRatingController } from "../controllers/amaRatingController.js";
import { reportController } from "../controllers/reportController.js";
import { regionDiagnosesController } from "../controllers/regionDiagnosesController.js";

export const registerRoutes = (app: FastifyInstance) => {
  app.get("/", async () => ({ message: "Server is running!" }));

  app.post("/contacts", contactController.newHandler);
  app.get("/contacts", contactController.getHandler);

  app.post("/cases", caseController.newHandler);
  app.get("/cases", caseController.getHandler);
  app.get("/cases/:id", caseController.getByIdHandler);
  app.put("/cases/:id", caseController.updateHandler);
  app.put("/cases/:id/ama-mode", caseController.updateAmaModeHandler);
  app.put(
    "/cases/:id/referral-questions",
    caseController.updateReferralQuestionsHandler
  );

  app.get("/cases/:caseId/providers", caseProvidersController.listHandler);
  app.post("/cases/:caseId/providers", caseProvidersController.createHandler);

  app.get(
    "/cases/:caseId/questionnaires",
    patientQuestionnaireController.listByCaseHandler
  );
  app.post(
    "/cases/:caseId/questionnaires",
    patientQuestionnaireController.createHandler
  );
  app.get(
    "/questionnaires/:accessToken",
    patientQuestionnaireController.getByAccessTokenHandler
  );
  app.post(
    "/questionnaires/:accessToken/submit",
    patientQuestionnaireController.submitHandler
  );
  app.delete(
    "/questionnaires/:questionnaireId",
    patientQuestionnaireController.deleteHandler
  );

  app.get("/records", recordsController.getByIdHandler);
  app.get(
    "/records/:recordId/download-url",
    recordsController.getDownloadUrlHandler
  );
  app.post(
    "/records/:recordId/summarize",
    recordsController.summarizeByRecordIdHandler
  );
  app.delete("/records/:recordId", recordsController.deleteByRecordIdHandler);

  app.get(
    "/cases/:caseId/case-summary",
    caseAggregateSummaryController.getByCaseIdHandler
  );

  app.get(
    "/cases/:caseId/case-summary/card",
    caseAggregateSummaryController.getCardHandler
  );

  app.post(
    "/cases/:caseId/aggregate-summary",
    caseAggregateSummaryController.createHandler
  );
  app.get(
    "/cases/:caseId/provider-summaries",
    providerSummariesController.getByCaseIdHandler
  );

  app.get(
    "/cases/:caseId/artifacts/:artifactType",
    caseArtifactsController.getArtifactHandler
  );
  app.get(
    "/cases/:caseId/pre-exam-analysis/:region",
    preExamAnalysisController.getByCaseIdHandler
  );
  app.post(
    "/cases/:caseId/pre-exam-analysis/:region",
    preExamAnalysisController.createHandler
  );
  app.post(
    "/cases/:caseId/pre-exam-analysis/:region/diagnoses",
    preExamAnalysisController.analyzeAddedDiagnosisHandler
  );
  app.post(
    "/cases/:caseId/pre-exam-analysis/:region/snapshot",
    preExamAnalysisController.takeSnapshotHandler
  );
  app.get(
    "/cases/:caseId/pre-exam-analysis/:region/snapshot",
    preExamAnalysisController.getSnapshotHandler
  );
  app.get(
    "/cases/:caseId/diagnoses/:region",
    regionDiagnosesController.getHandler
  );
  app.put(
    "/cases/:caseId/diagnoses/:region",
    regionDiagnosesController.saveHandler
  );
  app.get(
    "/cases/:caseId/physician-steering/:region",
    physicianSteeringController.getByCaseIdHandler
  );
  app.put(
    "/cases/:caseId/physician-steering/:region",
    physicianSteeringController.upsertHandler
  );
  app.get(
    "/cases/:caseId/refined-analysis/:region",
    refinedAnalysisController.getByCaseIdHandler
  );
  app.post(
    "/cases/:caseId/refined-analysis/:region",
    refinedAnalysisController.createHandler
  );

  app.post("/uploads/sign", uploadController.signUploadHandler);
  app.get(
    "/regions/:region/canonical-diagnoses",
    canonicalDiagnosesController.getByRegionHandler
  );
  app.post(
    "/cases/:caseId/ama-candidates/:region",
    amaCandidatesController.getHandler
  );
  app.get("/cases/:caseId/ama-rating/:region", amaRatingController.getHandler);
  app.get("/cases/:caseId/report-input", reportController.getInputHandler);
  app.get("/cases/:caseId/report", reportController.getLatestHandler);
  app.post("/cases/:caseId/report", reportController.generateHandler);
  app.get(
    "/cases/:caseId/past-medical-history",
    reportController.getPastMedicalHistoryHandler
  );
  app.get("/cases/:caseId/visit", visitDocumentationController.getHandler);
  app.put("/cases/:caseId/visit", visitDocumentationController.saveHandler);
  app.get("/cases/:caseId/opinions", caseOpinionsController.getHandler);
  app.put("/cases/:caseId/opinions", caseOpinionsController.saveHandler);
  app.post(
    "/cases/:caseId/post-exam-analysis/:region/snapshot",
    postExamAnalysisController.takeSnapshotHandler
  );
  app.post(
    "/cases/:caseId/post-exam-analysis/:region",
    postExamAnalysisController.createHandler
  );
  app.get(
    "/cases/:caseId/post-exam-analysis/:region",
    postExamAnalysisController.getByCaseIdHandler
  );
  app.post("/uploads/complete", uploadController.completeUploadHandler);

  if (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_TEST_DATA === "true"
  ) {
    app.get(
      "/test-data/record-fixtures",
      testRecordsController.listFixturesHandler
    );
    app.post("/test-data/records", testRecordsController.createHandler);
  }
  //app.get("/records", (req, res) => console.log(req.query));

  //app.post("/upload", upController.uploadHandler);
};
