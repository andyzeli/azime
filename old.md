# Personal Preferences

## Commands

- Don't run dev server commands (eg pnpm dev) - assume it's already running.

## Package Mangers

- Use pnpm if the project already uses it, otherwisie use npm.

## Tech Stack Preferences

- When uncertain, prefer: Tailwind, Typescript, React.

## Code Style

- Always strive for concise, simple solutions (don't be overly defensive).
- If a problem can be solved in a simpler way, propose it.

## General Preferences

- If asked to do too much work at once, stop and state that clearly.
- If a computer use is helpful for completing or verifying work, shell out to gpt-5.5 with Codex for it.

## Picking the right models for workflows and subagents

Rankings - higher number = better. Intellegence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy

| model    | cost | intellegence | taste |
| -------- | ---- | ------------ | ----- |
| gpt-5.5  | 9    | 8            | 6     |
| sonnet-5 | 5    | 5            | 7     |
| opus-4.8 | 4    | 7            | 8     |
| fable-5  | 2    | 9            | 9     |

How to apply:

- These are defaults, not limits. You have permission to override them: if a cheaper model's output doesn't meet the bar, rerun or redo the rowk with a smarter model without asking. Judge the output, not the price tag.
- Bulk/mechanical work (clear-spec implementation, migrations, data analysis): gpt-5.5 - it's effectively free
- Anything user-facing (UI, copy) needs taste >= 7
- Reviews of plans/implementations: fable-5 or opus-4.8, optionally gpt 5.5 as an extra independent perspective
- Never use Haiku
- Mechanics: gpt-5.5 is only reachable through the Codex CLI - `codex exec` / `codex review`. Use the codex-implementation, codex-review, and codex-computer-use skills; for work they don't cover (investigation, data analysis), run `codex exec -s read-only` directly with a self-contained prompt
- Claude models (sonnet-5, opus-4.8, fable-5) run via the Agent/Workflow model parameter.

Using gpt-5.5 inside workflows and subagents (the model parameter only takes Claude models, so use a wrapper):

- Spawn a thin Claude wrapper agent with `model: 'sonnet', effort: 'low'` whose prompt instructs it to write a self-contained codex prompt, run `codex exec` via Bash, and return the report (use `schema` on the wrapper to get structured output back).
- Always label these agents with a `gpt-5.5` prefix, e.g. `{label: 'gpt-5.5:review-auth'}` - the workflow UI shows the wrapper's Claude model, so the label is the only indication the real worker is gpt-5.5.
- Codex runs can exceed Bash's 10-minute timeout: pass an explicit timeout, or run in the background and poll for the report file.
- Parellel gpt-5.5 implementation agents must use `isolation: 'worktree'` so codex edits don't collide in the shared checkout.
- Workflow token budgets only cound Claude tokens; codex work is free and invisible to `budget.spent()`.
