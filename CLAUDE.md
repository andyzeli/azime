# Personal Preferences

# Project orchestration policy

<!--
Thin per-repo layer. Inherits the global orchestration philosophy, the model
routing table, and the gpt-5.5 wrapper pattern from ~/.claude/CLAUDE.md, plus
all skills. Put only repo-specific FACTS and POLICY here. Project wins on
conflict. Fill in the brackets and delete this comment.
-->

## This project

### Commands

- Don't run dev server commands (eg pnpm dev) - assume it's already running.

### Package Mangers

- use pnpm

### Tech Stack Preferences

- When uncertain, prefer: Tailwind, Typescript, React.

### Code Style

- Always strive for concise, simple solutions (don't be overly defensive).
- If a problem can be solved in a simpler way, propose it.

### General Preferences

- If asked to do too much work at once, stop and state that clearly.
- If a computer use is helpful for completing or verifying work, shell out to gpt-5.5 with Codex for it.

## Delegation policy for this repo

- Default sandbox for ad-hoc `codex exec`: **read-only**.
- `codex-implementation` may use `-s workspace-write` only within: [safe paths].
- Never delegate (do in-session): [security modules, auth, migrations, …].
- User-facing surfaces here that require taste >= 7 (no gpt-5.5 alone):
  [UI dirs, copy files].

## Routing overrides (optional)

- The global routing table applies as-is unless overridden here.
- [e.g. "reviews in this repo must include a gpt-5.5 pass on <critical paths>"]

## Notes for the orchestrator

- [Repo quirks: flaky tests, generated files not to touch, worktree caveats.]
