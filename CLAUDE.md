# CLAUDE.md

## Project

This repository contains an internal TypeScript (React front end, fastify backend) application for managing and generating Independent Medical Examination reports.

The application includes:

- medical-record PDF ingestion;
- structured AI extraction;
- cross-record case summary and analysis with AI;
- physician workflow and data entry;
- AI-assisted report drafting.

For deeper product context, see the files under `docs/`.

## Stack

- TypeScript
- React
- TanStack Router
- Fastify
- PostgreSQL
- Drizzle ORM
- Zod

## Development Guidelines

- Prefer simple, explicit implementations (don't be overly defensive)
- Make the smallest coherent change that solves the task.
- Avoid unnecessary abstractions or premature generalization.

## AI Features

AI behavior is defined by the application’s runtime prompts, schemas, and orchestration code.

When modifying an AI workflow:

- inspect the existing prompt and expected output schema together;
- preserve separation between system instructions, task input, and structured output;
- validate model output before using or persisting it;
- keep prompt behavior in dedicated prompt files or modules;
- do not move runtime model instructions into this file.

## Documentation

If given a broad task, consult the relevant documentation before making workflow or architecture changes, or if you need context:

- `docs/product-overview.md`
- `docs/application-pipeline.md`
- `docs/data-model.md`
