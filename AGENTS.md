# AGENTS.md — elyst-lms working agreement

Two AI agents work this repo in parallel. This file is the contract between them.

| Agent | Role | Owns |
|---|---|---|
| **Codex** | Engineer. Implements handoff plans. | `src/**` feature code, on `codex/*` branches only |
| **Claude Code** | Tech lead + senior test engineer. Writes plans, tests, reviews. | `tasks/handoffs/**`, `scripts/test-*.ts`, `scripts/probe-*.ts`, reviews, merges |

## Workflow (no-collision protocol)

1. Claude writes a numbered plan in `tasks/handoffs/NNN-*.md` **plus failing test contracts** in `scripts/`, committed to `main`.
2. Codex: `git checkout main && git pull`, then `git checkout -b codex/NNN-<slug>`. Never commit to `main`. Never rebase or force-push shared branches.
3. Codex implements until the handoff's acceptance tests pass (`npx tsx scripts/test-*.ts`), plus the global gates below, committing incrementally on its branch. Push the branch when done and stop.
4. Claude reviews the branch, runs the full gate suite, and merges to `dev`. Only Claude merges.
5. If Codex needs a decision not covered by the handoff: stop and leave a `QUESTIONS:` note at the bottom of the handoff file rather than improvising.

File-ownership rule: Codex does not edit `tasks/`, `scripts/test-*`, `scripts/probe-*`, `supabase/migrations/0001–0011`, or `.env*`. Claude does not edit `src/**` while a `codex/*` branch for that area is open.

## Global gates (every branch, before pushing)

- `npm run build` green · `npm run lint` green
- `npx tsx scripts/test-drip.ts` green (and any `scripts/test-*.ts` named in the active handoff)
- Every new learner/admin mutation logs exactly one event via `src/lib/lms/events.ts` consts — never string literals
- Admin Supabase client stays server-only; RLS is the security boundary; drip is app-layer pacing

## Hard boundaries (from tasks/spec.md §9 — binding)

- **Supabase: TEST project only** (`cmihoglafjxtswtbitsz` / elyst-ai-test). NEVER touch prod (`rvgyavnojkzleyvqowta`). Never edit applied migrations; new schema = new `00NN_*.sql` file.
- No new npm dependencies without approval noted in the handoff file.
- Never: AI/LLM calls, WhatsApp, gamification, forums, payments logic, middleware.ts, dark mode, caching auth/enrollment state.
- Design system: brand tokens from `src/app/globals.css` only (never hardcoded colors); Manrope display / DM Sans body; light-only; mobile-first 375px; LMS motion utilities in `src/app/lms.css`; SVG icons via lucide-react — **no emoji as icons**.

## Agent skills (mirrored in `.agents/addy-skills/`, gitignored)

Go through these skills before and use the appropriate skill according to the tasks.

Both agents read skills from `.agents/addy-skills/skills/<name>/SKILL.md` (Claude also has them installed as the `agent-skills` plugin). Division:

**Codex (build phase):** `spec-driven-development`, `incremental-implementation`, `frontend-ui-engineering`, `api-and-interface-design`, `debugging-and-error-recovery`, `git-workflow-and-versioning`.
**Claude (verify/review/ship phase + personas in `.agents/addy-skills/agents/`):** `test-engineer`, `code-reviewer`, `security-auditor`, `web-performance-auditor` personas; `test-driven-development`, `code-review-and-quality`, `security-and-hardening`, `browser-testing-with-devtools`, `performance-optimization`, `shipping-and-launch`, `planning-and-task-breakdown`.

## Project context

Read `tasks/spec.md` (contract), `tasks/plan.md` (architecture), `tasks/todo.md` (T1–T11 history — all complete except T11). Stack: Next.js 16 App Router, React 19, TS strict, Tailwind v4, Supabase (`.schema("app")`, three-client pattern in `src/lib/supabase/`), Bunny Stream. Local dev: `npm run dev` (port 3000), env in `.env.local` (already points at the TEST Supabase project).
