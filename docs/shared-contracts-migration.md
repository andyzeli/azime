# Shared Contracts Migration

Status: complete. The client imports nothing from `backend/src`; everything it
shares with the backend comes from `@azime/contracts`, and
`node scripts/check-contract-boundaries.mjs` (run in CI after `pnpm build`)
enforces both directions of the boundary.

## Priority 0: Workspace and package boundary

- [x] Add a root pnpm workspace for the backend, frontend, and shared packages.
- [x] Add `@azime/contracts` as a framework-independent package.
- [x] Add `@azime/contracts` as a workspace dependency of both applications.
- [x] Build shared contracts before either application from the root scripts.
- [x] Keep runtime dependencies required by contracts in the contracts package.
- [x] Add a boundary check that prevents contracts from importing application or
      framework code.
- [x] Add a transitional check preventing the retired provider-module import.
- [x] Remove every remaining frontend import from `backend/src`.
- [x] Fail the boundary check if the client imports from `backend/`.

The root `pnpm-lock.yaml` is now the authoritative workspace lockfile. Existing
nested lockfiles can be removed separately after deployment and CI have switched
to root workspace commands.

### Commands

```sh
pnpm install
pnpm build:contracts
pnpm build:backend
pnpm build:frontend
pnpm check:contracts
```

## Priority 1A: Provider contracts and catalog

- [x] Move provider kind values and their Zod schema into `@azime/contracts`.
- [x] Define stable, space-free provider discipline keys in the shared package.
- [x] Define the display label for each discipline beside its key.
- [x] Export a shared key-to-label lookup for UI and AI-facing text.
- [x] Move the create-provider input schema into the shared package.
- [x] Add shared provider response and provider-list schemas.
- [x] Validate provider API inputs and outputs against the shared schemas.
- [x] Parse provider API responses in the frontend rather than importing backend
      database types.
- [x] Use shared provider types and catalog options in the upload UI.
- [x] Convert discipline keys to clear labels before provider data reaches AI
      prompts.
- [x] Keep the Drizzle table definition in the backend.
- [x] Omit an `other` discipline until an accompanying detail field is designed.

Provider discipline keys are stored in PostgreSQL. Human-readable labels are
derived at presentation boundaries, including the UI and AI inputs. This keeps
stored values stable while ensuring downstream summaries receive clear language.

## Priority 1B: Records, questionnaires, cases and contacts

- [x] Document types, per-type metadata and the upload-completion schema:
      `records.ts`.
- [x] Stored record-extraction schemas (`extraction/`), the per-document-type
      schema map, `StoredExtraction` types and `safeParseStoredExtraction`:
      `recordExtractions.ts`. System prompts, the model-facing schema builders
      (case-region and canonical-diagnosis enums) and the extraction registry
      stay in `backend/src/ai/gemini`.
- [x] Questionnaire definitions and their pure scoring functions:
      `questionnaires.ts`.
- [x] Plain API row types replace client imports of Drizzle table types:
      `PatientCaseDto`, `CaseContactDto`, `CaseRecordDto`,
      `PatientQuestionnaireInstanceDto`. The Drizzle tables stay in the backend;
      the cases, contacts and records list handlers are typed against these
      DTOs so drift fails the backend build.

The client tests may still load backend test fixtures; only
`frontend/azimeclient/src` is checked.
