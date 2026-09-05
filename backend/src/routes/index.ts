import { FastifyInstance } from "fastify";
import { contactController } from "../controllers/contactController.js";
import { caseController } from "../controllers/caseController.js";
import { caseAggregateSummaryController } from "../controllers/caseAggregateSummaryController.js";
import { recordsController } from "../controllers/recordsController.js";
import { caseSummaryController } from "../controllers/cSummController.js";
import { uploadController } from "../controllers/uploadController.js";
import { patientQuestionnaireController } from "../controllers/patientQuestionnaireController.js";
import { caseArtifactsController } from "../controllers/caseArtifactsController.js";
import { physicianSteeringController } from "../controllers/physicianSteeringController.js";
import { preExamAnalysisController } from "../controllers/preExamAnalysisController.js";
import { providerSummariesController } from "../controllers/providerSummariesController.js";
import { refinedAnalysisController } from "../controllers/refinedAnalysisController.js";
import { caseProvidersController } from "../controllers/caseProvidersController.js";

export const registerRoutes = (app: FastifyInstance) => {
  app.get("/", async () => ({ message: "Server is running!" }));

  app.post("/contacts", contactController.newHandler);
  app.get("/contacts", contactController.getHandler);

  app.post("/cases", caseController.newHandler);
  app.get("/cases", caseController.getHandler);
  app.get("/cases/:id", caseController.getByIdHandler);
  app.get("/cases/:caseId/providers", caseProvidersController.listHandler);
  app.post("/cases/:caseId/providers", caseProvidersController.createHandler);

  app.get(
    "/cases/:caseId/questionnaires",
    patientQuestionnaireController.listByCaseHandler,
  );
  app.post(
    "/cases/:caseId/questionnaires",
    patientQuestionnaireController.createHandler,
  );
  app.get(
    "/questionnaires/:accessToken",
    patientQuestionnaireController.getByAccessTokenHandler,
  );
  app.post(
    "/questionnaires/:accessToken/submit",
    patientQuestionnaireController.submitHandler,
  );
  app.delete(
    "/questionnaires/:questionnaireId",
    patientQuestionnaireController.deleteHandler,
  );

  app.get("/records", recordsController.getByIdHandler);
  app.get(
    "/records/:recordId/download-url",
    recordsController.getDownloadUrlHandler,
  );
  app.post(
    "/records/:recordId/summarize",
    recordsController.summarizeByRecordIdHandler,
  );
  app.delete("/records/:recordId", recordsController.deleteByRecordIdHandler);

  app.get("/casesummaries", caseSummaryController.getByCaseIdHandler);

  app.post(
    "/cases/:caseId/aggregate-summary",
    caseAggregateSummaryController.createHandler,
  );
  app.get(
    "/cases/:caseId/provider-summaries",
    providerSummariesController.getByCaseIdHandler,
  );

  app.get(
    "/cases/:caseId/artifacts/:artifactType",
    caseArtifactsController.getArtifactHandler,
  );
  app.get(
    "/cases/:caseId/deterministic-signals",
    caseArtifactsController.getDeterministicSignalsHandler,
  );
  app.get(
    "/cases/:caseId/pre-exam-analysis",
    preExamAnalysisController.getByCaseIdHandler,
  );
  app.post(
    "/cases/:caseId/pre-exam-analysis",
    preExamAnalysisController.createHandler,
  );
  app.get(
    "/cases/:caseId/physician-steering",
    physicianSteeringController.getByCaseIdHandler,
  );
  app.put(
    "/cases/:caseId/physician-steering",
    physicianSteeringController.upsertHandler,
  );
  app.get(
    "/cases/:caseId/refined-analysis",
    refinedAnalysisController.getByCaseIdHandler,
  );
  app.post(
    "/cases/:caseId/refined-analysis",
    refinedAnalysisController.createHandler,
  );

  app.post("/uploads/sign", uploadController.signUploadHandler);
  app.post("/uploads/complete", uploadController.completeUploadHandler);
  //app.get("/records", (req, res) => console.log(req.query));

  //app.post("/upload", upController.uploadHandler);
};
