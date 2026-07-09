# Build Plan — AI for Work Learning Portal (LMS V1)

Spec: `tasks/spec.md` (APPROVED). Tasks: `tasks/todo.md`. This plan is authoritative for architecture; todo.md is authoritative for execution order.

## 1. Architecture decisions (already locked — do not re-litigate)

See spec §0 D1–D10. In one line each: self-serve enrollment only; calendar drip via `unlock_day_offset` in IST; manual mark-done is completion truth (heartbeat is telemetry only); single `interaction_events` table with dot-namespaced taxonomy; per-request auth helpers, no middleware.ts; single typed `lessons` table (`video|text|task`); live classes are links on lessons; focused `/admin` app (content CRUD, progress, submissions); indexes yes / caching no; RLS is the security boundary, drip is app-layer UX pacing.

## 2. Dependency graph and parallelization

Only **T1 (migration + lib core)** is a true global blocker. After T1, three tracks are fully parallel — they share no files except `src/lib/lms/*` (created in T1, extend-only afterward, additive changes only to avoid conflicts):

```
T1 Migration 0011 + lib/lms core (drip, require*, progress calc, event names)
 ├── TRACK A (learner)   T2 → T3 → T4 → T5      [sequential within track]
 ├── TRACK B (admin)     T6 → T7 → T8           [sequential within track]
 └── TRACK C (platform)  T9 (events wiring audit), T10 (RLS probe script)  [parallel to everything post-T1]
Final: T11 staging E2E + polish gate (needs all tracks)
```

Run tracks A, B, C as parallel agents/worktrees if desired. Shared-file rule: only T1 creates files in `src/lib/lms/`; later tasks may ADD functions there but never modify existing signatures — if a signature must change, stop and flag.

## 3. Phases / checkpoints

- **CP0** after T1: migration applied on staging, drip unit tests pass, helpers typecheck. Nothing else starts before CP0.
- **CP1** after T3 / T7 (mid-track): learner can view + complete a lesson; admin can CRUD content. Demo on staging.
- **CP2** after T5 / T8 / T9 / T10: all features complete, RLS probes green.
- **CP3** = T11: full E2E checklist on staging, then `dev → main` PR.

## 4. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Drip date math off-by-one across IST/UTC | Medium | Pure function in `drip.ts`, unit-tested with fixed dates incl. batch start day, day boundaries, GCC evening (T1 acceptance) |
| RLS policy gap exposes lessons/submissions | Medium | T10 scripted probes with 4 personas run against staging before merge; policies written alongside tables in same migration |
| Parallel tracks conflict in lib/lms | Low | Extend-only rule above; tracks own disjoint route directories |
| Bunny embed issues on mobile Safari | Medium | T3 acceptance includes real-device check; use Bunny iframe embed (no custom player) |
| Storage signed-URL misconfig leaks submissions | Low | Private bucket, no public policy; signed URL TTL ≤ 1h; probe in T10 |
| Admin markdown → XSS | Medium | Render via react-markdown with default-safe settings, no raw HTML pass-through (T3) |
| Existing checkout/auth regressions | Low | Boundary: those code paths are untouched; `npm run build && lint` gate per task |

## 5. Out of scope reminders for the coding agent

Never add: AI/LLM calls, WhatsApp, gamification, forums, certificates, payment logic, push notifications, middleware.ts, dark mode, caching of auth/enrollment state, new deps beyond `react-markdown` (+sanitizer) without asking. Never modify applied migrations or existing checkout/auth/email code.
