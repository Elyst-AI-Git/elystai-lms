# Task List — LMS V1 (execute per tasks/plan.md dependency graph)

Legend: size S/M/L · deps · files touched · AC = acceptance criteria · VER = verification.
Global gate per task: `npm run build && npm run lint` green; every new learner/admin server action calls `logEvent()` with the event name given in the task; brand tokens + mobile-first on all UI.

Read `tasks/spec.md` fully before starting. Spec §6 is the schema contract; spec §9 boundaries are binding.

---

## T1 — Migration 0011 + `src/lib/lms` core  [L] · deps: none · BLOCKS EVERYTHING

Files: `supabase/migrations/0011_lms_v1.sql`, `src/lib/lms/drip.ts`, `src/lib/lms/auth.ts`, `src/lib/lms/progress.ts`, `src/lib/lms/events.ts`, `scripts/test-drip.ts`

Build:
1. Migration exactly per spec §6: alter `app.lessons` (content_type enum `video|text|task`, `unlock_day_offset int not null default 0`, `body_richtext`, `task_instructions`, `live_link`, `live_starts_at`); create `app.lesson_progress`, `app.submissions`, `app.resources`, `public.admin_users`; all RLS policies (learner owns rows via enrollment → profile chain; admin via `public.admin_users`); all indexes from spec §6; private storage bucket `submissions` (no public access). Follow patterns from migrations 0001–0010 (grants to service role, `.schema("app")` conventions).
2. `drip.ts`: pure `isUnlocked(unlockDayOffset, batchStartsOn, now)` using fixed `Asia/Kolkata`; also `currentDayNumber(batchStartsOn, now)`.
3. `auth.ts`: `requireUser()`, `requireEnrollment(courseSlug)` (returns active enrollment + batch or throws/redirects), `requireAdmin()` (checks `public.admin_users`). Server-only; use existing Supabase client helpers.
4. `progress.ts`: `getProgress(enrollmentId)` → per-day + overall % from `lesson_progress` vs published lessons.
5. `events.ts`: exported const taxonomy — `learner.lesson.viewed|completed|uncompleted`, `learner.video.heartbeat`, `learner.submission.created|updated`, `learner.vault.viewed`, `admin.content.created|updated|deleted|reordered`, `admin.submission.reviewed`. Nothing logs a string literal; only these consts.

AC: migration applies cleanly to staging (`elyst-ai-test`); enum/columns/tables/indexes/policies exist; drip unit script covers: day 0 at 00:01 IST, 23:59 IST day boundary, GCC evening (UTC+4), late-joiner same-state, offset 13. All helpers typecheck, no admin client import reachable from client bundles.
VER: run `scripts/test-drip.ts` (plain assertions, `npx tsx`); apply migration on staging and select from each new table as service role. **CHECKPOINT CP0 — stop and report before other tasks start.**

---

## TRACK A — Learner (T2→T3→T4→T5, sequential; parallel to B and C)

### T2 — Learner dashboard + day view  [M] · deps: T1
Files: `src/app/learn/page.tsx` (replace stub), `src/app/learn/[courseSlug]/day/[n]/page.tsx`, shared learner layout/nav.
Build: dashboard shows overall progress bar, per-day progress, "today is Day N", next live session (soonest future `live_starts_at`), CTA to today's day view. Day view lists that day's lessons with type icon, completion state, locked state for future days (visible but locked, with unlock date). Server components; `requireEnrollment()`; drip via `drip.ts` only.
AC: enrolled learner sees correct unlock state matching batch `starts_on`; non-enrolled user is redirected to `/ai-for-work`; locked lessons unclickable; renders correctly at 375px width. Logs `learner.lesson.viewed` on day open? — no: day view logs nothing; lesson view logs (T3).
VER: staging with a seeded batch (starts_on = 3 days ago): days 0–3 unlocked, day 4+ locked; second persona without enrollment blocked.

### T3 — Lesson view + mark-done + heartbeat  [L] · deps: T2
Files: `src/app/learn/[courseSlug]/lesson/[id]/page.tsx`, `src/app/api/learn/progress/route.ts`, `src/app/api/learn/heartbeat/route.ts`, markdown renderer component. New deps: `react-markdown` + sanitizer (allowed by spec).
Build: lesson page renders by `content_type` — video: Bunny iframe embed + optional body text; text: markdown body; task: instructions + submission UI placeholder (wired in T4). Live lessons show `live_link` button + time. "Mark complete" button → POST upserts `lesson_progress` (idempotent, unique constraint), toggleable (un-mark allowed). Video pages send heartbeat POST every 30s while playing → `logEvent(learner.video.heartbeat, {lessonId, positionSeconds})` — telemetry only, never writes `lesson_progress`. Server enforces drip on fetch (locked lesson → 404/redirect even with direct URL).
AC: mark/unmark persists and reflects in dashboard %; direct URL to locked lesson blocked server-side; markdown renders with no raw-HTML injection (test `<script>` in body); Bunny plays on mobile Safari (real device or BrowserStack); heartbeat rows appear in `interaction_events`; events `learner.lesson.viewed/completed/uncompleted` logged.
VER: manual E2E on staging per above; check `interaction_events` rows have correct event_type names and redaction intact. **CHECKPOINT CP1(A).**

### T4 — Task submissions (learner side)  [M] · deps: T3
Files: `src/app/api/learn/submissions/route.ts`, submission UI in lesson page, `src/lib/lms/storage.ts` (signed upload/read helpers).
Build: on task lessons: submit URL and/or screenshot (images only, ≤5 MB, client+server validated) to private `submissions` bucket via server-generated signed upload; row in `app.submissions` (`status='submitted'`); learner sees own submission, can replace it (update, keep single row per enrollment+lesson — add unique constraint if not in 0011, via small follow-up migration 0012). Marking task lesson complete does NOT require a submission (UI nudges). Logs `learner.submission.created|updated`.
AC: upload works from mobile; file inaccessible via public URL; learner A cannot read learner B's submission (RLS); oversize/non-image rejected server-side.
VER: two-persona staging test + direct storage URL probe.

### T5 — Resource vault  [S] · deps: T2 (not T3/T4)
Files: `src/app/learn/vault/page.tsx`.
Build: flat list of `app.resources` grouped by module/Area (`module_id`, batch overrides where `batch_id` matches), links + kind badges. `requireEnrollment()`. Logs `learner.vault.viewed`.
AC: grouped correctly by the 7 Areas; batch-specific resource appears only for that batch; mobile layout clean.
VER: seed resources across 3 Areas + 1 batch override; verify on staging.

---

## TRACK B — Admin (T6→T7→T8, sequential; parallel to A and C)

### T6 — Admin shell + content CRUD (courses/modules/lessons)  [L] · deps: T1
Files: `src/app/admin/layout.tsx`, `src/app/admin/content/**`, `src/app/api/admin/content/**`.
Build: `/admin` gated by `requireAdmin()` (non-admin → 404, not a login hint). Content tree UI: course → modules → lessons; create/edit/delete/reorder (sort_order); lesson editor exposes ALL fields: title, content_type, `unlock_day_offset`, `is_preview`, `bunny_video_id`, markdown body (textarea + preview), `task_instructions`, `live_link`, `live_starts_at`, draft/published where applicable. All writes via admin API routes using service-role client, each logging `admin.content.*` with actor profile_id. Plain functional UI — brand tokens, no polish beyond usable; desktop-first acceptable for admin only.
AC: admin user (seeded in `public.admin_users`) can build the full 2-week structure without touching code or Studio; non-admin gets 404 on pages AND 401/403 on API routes; reorder persists.
VER: create Week-1 real content structure on staging via UI only. **CHECKPOINT CP1(B).**

### T7 — Resource CRUD  [S] · deps: T6
Files: `src/app/admin/content/resources/**`, API routes.
Build: CRUD for `app.resources` incl. Area (module) assignment, optional batch override, sort_order. Logs `admin.content.*`.
AC/VER: create/edit/delete reflected in learner vault (with T5, else via DB check).

### T8 — Progress dashboard + submissions review  [M] · deps: T6
Files: `src/app/admin/progress/page.tsx`, `src/app/admin/submissions/page.tsx`, API routes.
Build: (a) cohort view — per-learner rows (name/email from profiles, overall %, per-day completion), cohort aggregate %; (b) learner drill-down — which lessons done/when; (c) submissions queue — filter by status/lesson, view link/screenshot (signed URL), set `reviewed`/`needs_attention` + `reviewer_note`. Logs `admin.submission.reviewed`.
AC: numbers match `getProgress()` for a seeded learner exactly; screenshot renders via signed URL; status change persists and is visible to learner? (No — learner does not see review status in V1; reviewer_note is admin-only.)
VER: seed 2 learners with partial progress + 2 submissions; verify counts and review flow. **CHECKPOINT CP2(B).**

---

## TRACK C — Platform (parallel post-T1)

### T9 — Event taxonomy audit + wiring gaps  [S] · deps: T1 (review runs after A/B merge)
Build: grep-audit that every mutation route logs exactly one correctly-named event via `events.ts` consts, correlation_id passed where a client flow exists, redaction intact for any new payload keys (add `live_link`? no — only sensitive keys). Fix gaps.
AC: written checklist mapping every route → event name, zero string-literal event types in new code.
VER: run each learner/admin action once on staging; confirm one row each in `interaction_events`.

### T10 — RLS + storage probe script  [M] · deps: T1
Files: `scripts/probe-rls.ts`.
Build: scripted probes with 4 personas (anon, enrolled learner, non-enrolled authed user, admin) against staging covering: lessons read (preview vs gated), lesson_progress read/write cross-user, submissions read/write cross-user, resources read, admin_users read, storage object direct access. Output pass/fail table.
AC: all expected-deny cases deny, all expected-allow allow; script re-runnable (idempotent seed/teardown).
VER: run on staging; attach output to PR. **CHECKPOINT CP2(C).**

---

## T11 — Final E2E + ship gate  [M] · deps: T2–T10 all complete

Build: none (fix-only). Execute full spec §10 success-criteria checklist on staging on a real phone: OTP login → dashboard → locked/unlocked days → video → text → mark complete → task submit (link + screenshot) → vault → progress %; admin: full content edit, progress dashboard, submission review. Late-joiner check: new enrollment mid-batch sees same unlock state. Confirm zero changes landed in checkout/auth/email paths (`git diff` review). Then migration to prod, `dev → main` PR.
AC: every spec §10 criterion checked off with evidence; probe script green on prod schema post-migration.
VER: founder walkthrough on staging before merge. **CHECKPOINT CP3 — final.**
