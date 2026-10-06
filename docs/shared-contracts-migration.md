# Shared Contracts Migration

This migration is intentionally split into small, deployable slices. The current
slice establishes the package boundary and moves the provider contract and
discipline catalog out of the backend.

## Priority 0: Workspace and package boundary

- [x] Add a root pnpm workspace for the backend, frontend, and shared packages.
- [x] Add `@azime/contracts` as a framework-independent package.
- [x] Add `@azime/contracts` as a workspace dependency of both applications.
- [x] Build shared contracts before either application from the root scripts.
- [x] Keep runtime dependencies required by contracts in the contracts package.
- [x] Add a boundary check that prevents contracts from importing application or
      framework code.
- [x] Add a transitional check preventing the retired provider-module import.
- [ ] Remove every remaining frontend import from `backend/src` in later slices.

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

## Remaining slices

Implement and verify these independently:

1. Document metadata and upload contracts.
2. Record and extraction schemas, while keeping prompts and AI orchestration in
   the backend.
3. Case and contact API contracts.
4. Questionnaire definitions and versioned pure scoring functions that can run
   in both the client and backend.
5. Case-summary and analysis contracts.
6. Deployment configuration, CI, and removal of legacy nested lockfiles.

The frontend/backend separation is complete when this command returns no source
imports:

```sh
rg "backend/src" frontend/azimeclient/src
```
