# Shared Contracts Migration Inventory

## Goal

Allow the frontend and backend to build and deploy independently while keeping
one source of truth for data that crosses the HTTP API boundary.

The recommended target is a dependency-light workspace package such as
`packages/contracts`, imported as `@azime/contracts`. It may depend on Zod, but
must not depend on Fastify, Drizzle, database clients, storage clients, AI
clients, or React.

This inventory covers the current repository. It does not mean every item must
be migrated in one change.

## Priority 0: establish the package boundary

- [ ] Add a root workspace configuration containing:
  - `backend`
  - `frontend/azimeclient`
  - `packages/contracts`
- [ ] Add `packages/contracts/package.json`, TypeScript configuration, and a
  ```
  public `src/index.ts` export surface.
  ```
- [ ] Make both applications depend on `@azime/contracts` rather than importing
  ```
  files through relative paths into another application's source tree.
  ```
- [ ] Add independent build checks that prove:
  - the frontend does not import from `backend/src`;
  - the backend consumes the contracts package through its public exports;
  - the contracts package has no backend-only or frontend-only dependencies.

## Priority 1: current direct frontend-to-backend imports

These items are already shared and should be migrated first.

### Provider contracts and catalog

Current sources and consumers:

- `backend/src/providers/caseProvider.ts`
- `backend/src/db/schema.ts` (`CaseProvider` is currently inferred from Drizzle)
- `frontend/azimeclient/src/routes/cases/queries.ts`
- `frontend/azimeclient/src/routes/cases/case/components/UploadButton.tsx`

Move or define in contracts:

- [ ] `providerKindSchema` and `ProviderKind`.
- [ ] `providerDisciplineSchema` and `ProviderDiscipline`.
- [ ] One canonical `providerDisciplineOptions` catalog containing stable keys
  ```
  and display labels.
  ```
- [ ] `getProviderDisciplineLabel()` for UI display and AI-input enrichment.
- [ ] `createCaseProviderInputSchema` and `CreateCaseProviderInput`.
- [ ] `caseProviderSchema` and `CaseProviderDto` with `id`, `caseId`, `name`,
  ```
  `kind`, and `discipline`.
  ```
- [ ] Provider list and create response schemas.
- [ ] Decide how an `other` discipline is represented. Prefer a separate
  ```
  nullable detail field over treating the literal value `other` as useful
  AI context.
  ```

Keep in the backend:

- Drizzle `CaseProviders` table and relations.
- Provider ownership queries and case-scope authorization.

### Document types, metadata, and upload contracts

Current sources and consumers:

- `backend/src/records/documentMetadata.ts`
- `backend/src/controllers/uploadController.ts`
- `frontend/azimeclient/src/routes/cases/queries.ts`
- `frontend/azimeclient/src/routes/cases/case/components/UploadButton.tsx`

Move or define in contracts:

- [ ] `documentTypeSchema` and `DocumentType`.
- [ ] All document metadata schemas and `RecordDocumentMetadata`.
- [ ] `completeRecordUploadSchema` and `CompleteRecordUploadInput`.
- [ ] The currently backend-local signed-upload request schema:
  ```
  `{ caseId, fileName, contentType }`.
  ```
- [ ] Signed-upload response schema: `{ objectKey, uploadUrl }`.
- [ ] Complete-upload response schema. It currently returns a raw inserted
  ```
  record and should instead return an explicit record DTO.
  ```
- [ ] Shared PDF content-type and upload-size policy if both client and server
  ```
  are expected to enforce the same limits.
  ```

Keep in the backend:

- Object-key generation.
- Signed URL creation and storage existence checks.
- Provider ownership validation and record insertion.

### Record DTOs and extraction results

Current sources and consumers:

- `backend/src/db/schema.ts` (`Records`)
- `backend/src/controllers/recordsController.ts`
- `backend/src/ai/gemini/registry.ts`
- `backend/src/ai/gemini/extraction/*.ts`
- `frontend/azimeclient/src/routes/cases/queries.ts`
- `frontend/azimeclient/src/routes/cases/case/components/RecordSummaryView.tsx`
- `frontend/azimeclient/src/routes/cases/case/components/cockpit/RecordsPanel.tsx`

Move or define in contracts:

- [ ] `recordSummaryStatusSchema` for `pending`, `processing`, `completed`, and
  ```
  `failed`.
  ```
- [ ] `recordSchema` / `RecordDto`, including its nested provider DTO.
- [ ] Use JSON-wire types in the DTO. In particular, dates and timestamps must
  ```
  be strings or `null`, not Drizzle's in-process `Date` types.
  ```
- [ ] The stored extraction schemas for encounter, therapy, imaging, surgery,
  ```
  intervention, incident report, job description, work status, and generic
  documents.
  ```
- [ ] `StoredExtraction<T>`, `AnyStoredExtraction`, and a schema-only
  ```
  `safeParseStoredExtraction()` registry.
  ```
- [ ] Record-list response schema.
- [ ] Summarize-record response schema:
  ```
  `{ recordId, summaryStatus, summary }`.
  ```
- [ ] Delete-record response schema: `{ recordId, deleted }`.
- [ ] Download-URL response schema: `{ url }`.

Required split before migration:

- [ ] Separate each extraction schema from its AI system prompt. The current
  ```
  `backend/src/ai/gemini/registry.ts` imports both schemas and prompts, so
  importing its parser causes Vite to bundle backend prompt text.
  ```
- [ ] Put only persisted-data schemas and pure parsing helpers in contracts.
- [ ] Leave extraction prompts, model configuration, and generation helpers in
  ```
  the backend.
  ```

### Case contracts

Current sources and consumers:

- `backend/src/db/schema.ts` (`PatientCase`, `NewPatientCase`)
- `backend/src/controllers/caseController.ts`
- `frontend/azimeclient/src/routes/cases/queries.ts`
- `frontend/azimeclient/src/routes/cases/case/components/NewCaseForm.tsx`

Move or define in contracts:

- [ ] `createCaseInputSchema` and `CreateCaseInput`. The request type currently
  ```
  lives in the React form and is imported by the query layer.
  ```
- [ ] `caseListItemSchema` / `CaseListItemDto`.
- [ ] `caseDetailSchema` / `CaseDetailDto`, including explicit nested contact
  ```
  and assigned-provider shapes.
  ```
- [ ] Create-case response schema. The controller currently returns a generic
  ```
  `{ success, data }` wrapper around a Drizzle insert result.
  ```
- [ ] Case-type values if they are intended to be a controlled domain catalog.
  ```
  They currently exist only as UI strings in `NewCaseForm.tsx`.
  ```
- [ ] Case-status values once the allowed states are defined.

Keep in the backend:

- `PatientCase` Drizzle table and relations.
- Database insert/select types.

### Contact contracts

Current sources and consumers:

- `backend/src/db/schema.ts` (`CaseContacts`)
- `backend/src/controllers/contactController.ts`
- `frontend/azimeclient/src/routes/contacts/ContactForm.tsx`
- `frontend/azimeclient/src/routes/contacts/queries.ts`

Move or define in contracts:

- [ ] `createContactInputSchema` and `CreateContactInput`.
- [ ] `contactSchema` and `ContactDto`.
- [ ] Contact list and create response schemas.
- [ ] Resolve the current contract mismatch: the frontend form includes
  ```
  `phone` and `paylinkUrl`, but `case_contacts` and the controller do not
  define those fields.
  ```
- [ ] Define whether `email`, `website`, and contact `type` are required or
  ```
  nullable consistently on both sides.
  ```

Keep in the backend:

- `CaseContacts` Drizzle table and persistence behavior.

### Questionnaire contracts and client-safe definitions

Current sources and consumers:

- `backend/src/questionnaires/definitions.ts`
- `backend/src/db/schema.ts` (`PatientQuestionnaireInstance`, response and
  score types)
- `backend/src/controllers/patientQuestionnaireController.ts`
- `frontend/azimeclient/src/routes/cases/queries.ts`
- `frontend/azimeclient/src/routes/cases/case/components/PatientQuestionnairesPanel.tsx`
- `frontend/azimeclient/src/routes/patient/PatientQuestionnairePatientPage.tsx`

Move or define in contracts:

- [ ] `questionnaireTypeSchema` and `QuestionnaireType`.
- [ ] `questionnaireStatusSchema` for `in_progress` and `completed`.
- [ ] Questionnaire option, question, client-definition, response, and score
  ```
  schemas/types.
  ```
- [ ] A client-safe questionnaire catalog containing type, title, and other UI
  ```
  metadata needed before an instance is created.
  ```
- [ ] `patientQuestionnaireSchema` / `PatientQuestionnaireDto`, using serialized
  ```
  timestamp strings.
  ```
- [ ] `patientQuestionnaireWithDefinitionSchema`.
- [ ] `patientQuestionnaireWithCaseSchema`.
- [ ] Create-questionnaire input schema:
  ```
  `{ type, appointmentId }`; `caseId` remains a path parameter.
  ```
- [ ] Submit-questionnaire input schema:
  ```
  `{ responses: Array<{ itemId, score }> }`.
  ```
- [ ] Delete-questionnaire response schema:
  ```
  `{ questionnaireId, deleted }`.
  ```

Keep in the backend:

- Scoring functions and authoritative response validation.
- Database tables.

The current `QuestionnaireDefinition` includes a `scoreResponses` function,
which is not an HTTP-serializable contract. Split it into a client-safe data
definition and a backend-only scoring implementation.

### Case summary contract

Current sources and consumers:

- `backend/src/ai/clinicalSummarySchema.ts`
- `backend/src/db/schema.ts` (`CaseRecordsSummary`)
- `backend/src/controllers/cSummController.ts`
- `backend/src/controllers/caseAggregateSummaryController.ts`
- `frontend/azimeclient/src/routes/cases/queries.ts`
- `frontend/azimeclient/src/routes/cases/case/components/AggregateSummaryView.tsx`

Move or define in contracts:

- [ ] Persisted case clinical summary schema and
  ```
  `StoredCaseClinicalSummary`.
  ```
- [ ] Stored case-summary envelope DTO with `id`, `caseId`, and `summary`.
- [ ] Aggregate-summary generation response schema, including
  ```
  `sourceRecordCount`, `aggregateSummary`, `providerSummaries`, and
  storage identifiers. The frontend's current inline type omits fields the
  backend returns.
  ```
- [ ] Provider-summary persisted output schema if the frontend will consume the
  ```
  dedicated provider-summary endpoint.
  ```
- [ ] Shared schema-version literals used to validate persisted artifacts.

Keep in the backend:

- AI system/user prompts.
- Provider/model selection logic.
- AI-client calls and persistence queries.

Consider separating the persisted output schema from generation-only Zod
descriptions so the frontend does not bundle large prompt-oriented description
strings unnecessarily.

### Pre-exam and refined-analysis contracts

Current sources and consumers:

- `backend/src/ai/preExamAnalysisSchema.ts`
- `backend/src/ai/refinedAnalysisSchema.ts`
- `backend/src/ai/shared.ts` (`trajectorySchema` dependency)
- `backend/src/controllers/preExamAnalysisController.ts`
- `backend/src/controllers/refinedAnalysisController.ts`
- `frontend/azimeclient/src/routes/cases/queries.ts`
- `frontend/azimeclient/src/routes/cases/case/components/cockpit/RefinedAnalysisPanel.tsx`

Move or define in contracts:

- [ ] Stored pre-exam analysis schema and type, including any shared trajectory
  ```
  data schema it requires.
  ```
- [ ] Stored refined-analysis schema and type.
- [ ] A reusable stored-artifact envelope DTO with serialized `createdAt` and
  ```
  `updatedAt` timestamps.
  ```
- [ ] Generate-pre-exam-analysis response schema.
- [ ] Generate-refined-analysis response schema.
- [ ] GET response schemas for both artifacts, including their nullable state.

Keep in the backend:

- Analysis prompts and model calls.
- Taxonomy lookup and deterministic analysis logic.
- Artifact persistence queries.

## Priority 2: public API contracts not yet consumed broadly by the frontend

These are already HTTP boundaries and should use contracts when their UI work
begins, rather than creating new backend imports.

### Provider summaries

- [ ] `StoredProviderSummaries` and its GET response envelope from
  ```
  `GET /cases/:caseId/provider-summaries`.
  ```
- [ ] Provider summary item identity. Prefer including the case-provider UUID
  ```
  instead of identifying an item only by provider name.
  ```

### Case artifacts

- [ ] `caseArtifactTypeSchema` and `CaseArtifactType`.
- [ ] Document-extraction artifact DTO.
- [ ] Case-summary artifact DTO.
- [ ] Discriminated response schema for
  ```
  `GET /cases/:caseId/artifacts/:artifactType`.
  ```

### Deterministic signals

- [ ] Deterministic-signal schema and
  ```
  `{ caseId, signals }` response contract before the endpoint is
  implemented or consumed.
  ```

### Physician steering

- [ ] Physician-steering request and stored response schemas before enabling
  ```
  the currently scaffolded workflow.
  ```
- [ ] Keep `assertPhysicianSteeringReady()` and backend-specific errors outside
  ```
  contracts.
  ```

### Common API errors

- [ ] Define a small consistent error response such as
  ```
  `{ error: string, code?: string, details?: unknown }`.
  ```
- [ ] Replace controllers that return raw error objects or `{ success: false }`
  ```
  with the common error contract.
  ```
- [ ] Optionally define shared positive-integer ID and UUID schemas for request
  ```
  bodies. Path/query parsing may remain backend-specific.
  ```

## Existing database types that must not become contracts

Do not move `backend/src/db/schema.ts` into the shared package. Replace current
frontend uses with purpose-built DTOs for:

- [ ] `PatientCase`
- [ ] `CaseContacts`
- [ ] `CaseProvider`
- [ ] `Records`
- [ ] `CaseRecordsSummary`
- [ ] `PatientQuestionnaireInstance`

Reasons:

- Database nullability is not necessarily API nullability.
- Drizzle timestamp types describe server-side values, not serialized JSON.
- Joined API responses contain fields absent from a single table.
- Database columns may be renamed or hidden without changing the public API.
- Frontend imports should not pull Drizzle or database schema code into its
  build graph.

## Shared catalogs and repeated literals to centralize

- [ ] Provider kind values.
- [ ] Provider discipline values and labels.
- [ ] Document type values.
- [ ] Record summary-status values.
- [ ] Questionnaire type, status, and lightweight UI catalog.
- [ ] AI provider values (`gemini`, `openai`) used in persisted artifact source
  ```
  metadata. The value is repeated across several AI schema files.
  ```
- [ ] Artifact schema-version literals where the client validates versions.
- [ ] Case type and case status once their domain values are finalized.

Not every display label needs to be shared. Keep presentation-only wording in
the frontend unless the backend or AI pipeline also needs the same human-readable
label.

## Adjacent deployment work, not part of the contracts package

- [ ] Replace hardcoded `http://localhost:4000` values in both frontend query
  ```
  modules with a single `VITE_API_BASE_URL` configuration module.
  ```
- [ ] Replace the backend's hardcoded `http://localhost:5173` CORS origin with
  ```
  environment-based allowed origins.
  ```
- [ ] Decide whether production uses separate `app` and `api` origins or sends
  ```
  `/api/*` through the same CloudFront distribution.
  ```
- [ ] If authentication uses cookies across origins, define credential,
  ```
  `SameSite`, `Secure`, and explicit CORS-origin behavior.
  ```
- [ ] Configure the storage provider's upload CORS policy for the production
  ```
  frontend origin.
  ```
- [ ] Ensure frontend and backend deployment contexts include the contracts
  ```
  workspace during installation and build.
  ```

## Suggested migration order

1. Create the contracts workspace and independent build checks.
2. Migrate provider catalogs and provider DTOs.
3. Migrate document/upload contracts.
4. Replace all frontend Drizzle imports with case, contact, record, and
   questionnaire DTOs.
5. Split extraction schemas from prompts, then migrate the schema-only parser.
6. Migrate stored case-summary and analysis schemas as each workflow is edited.
7. Add contracts for scaffolded endpoints when their frontend features are
   implemented.
8. Finish the deployment URL, CORS, authentication, and storage-origin work.

## Completion criteria

- [ ] `rg "backend/src" frontend/azimeclient/src` returns no results.
- [ ] The frontend can install and build without access to backend source.
- [ ] Both frontend and backend validate API payloads with the same schemas.
- [ ] No contract imports Drizzle, Fastify, React, storage code, AI clients, or
  ```
  runtime prompts.
  ```
- [ ] DTO timestamps and dates match their actual JSON representation.
- [ ] Independent frontend/backend deployment does not require lockstep releases
  ```
  for additive API changes.
  ```
