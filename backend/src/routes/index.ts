import { FastifyInstance } from "fastify";
import { contactController } from "../controllers/contactController.js";
import { caseController } from "../controllers/caseController.js";
import { caseAggregateSummaryController } from "../controllers/caseAggregateSummaryController.js";
import { recordsController } from "../controllers/recordsController.js";
import { caseSummaryController } from "../controllers/cSummController.js";
import { uploadController } from "../controllers/uploadController.js";
import { patientQuestionnaireController } from "../controllers/patientQuestionnaireController.js";

export const registerRoutes = (app: FastifyInstance) => {
  app.get("/", async () => ({ message: "Server is running!" }));

  app.post("/contacts", contactController.newHandler);
  app.get("/contacts", contactController.getHandler);

  app.post("/cases", caseController.newHandler);
  app.get("/cases", caseController.getHandler);
  app.get("/cases/:id", caseController.getByIdHandler);

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

  app.get("/casesummaries", caseSummaryController.getByIdHandler);
  app.post("/casesummaries", caseSummaryController.newHandler);
  app.delete("/casesummaries/:id", caseSummaryController.deleteHandler);

  app.post(
    "/cases/:caseId/aggregate-summary",
    caseAggregateSummaryController.createHandler,
  );

  app.post("/uploads/sign", uploadController.signUploadHandler);
  app.post("/uploads/complete", uploadController.completeUploadHandler);
  //app.get("/records", (req, res) => console.log(req.query));

  //app.post("/upload", upController.uploadHandler);
};
