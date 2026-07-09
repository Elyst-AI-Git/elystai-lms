# Spec — AI for Work Learning Portal (LMS V1)

Status: DRAFT — awaiting founder approval before Plan/Tasks phase.

## 0. Resolved decisions (locked in this planning session)

| # | Decision | Resolution |
|---|---|---|
| D1 | Roster model | **Pure self-serve.** Enrollment is created only by the existing Razorpay checkout flow. No admin enrollment UI, no manual-override UI; edge cases (comps, refund fixes) handled directly in Supabase Studio. Mentor's admin-creates-student, admin-enrolls-student, and bulk-import flows are rejected for this product. |
| D2 | Lesson unlocking | **Calendar-based drip** (pre-decided): `lessons.unlock_day_offset` relative to `batches.starts_on`. No sequential completion-gating — live cohort must stay in sync. |
| D3 | Progress mechanics | **Manual mark-done** is the only source of completion truth (works for video, text, and task lessons; mobile-friendly). A lightweight video-progress heartbeat is *logged* to `interaction_events` for future AI use but never drives completion in V1. |
| D4 | Logging | **Single `interaction_events` table** retained, with a disciplined dot-namespaced event taxonomy (`learner.lesson.completed`, `learner.video.heartbeat`, `learner.submission.created`, `admin.content.updated`, …) so a future split into learning_events/audit_log is a cheap migration. Every new learner and admin action logs an event from day one. |
| D5 | Auth gating | **Per-request checks, no middleware.ts.** Shared helpers (`requireUser()`, `requireEnrollment()`, `requireAdmin()`) used in every `/learn` and `/admin` route. RLS remains the real security boundary. |
| D6 | Content model | **Single `app.lessons` table, typed.** `content_type` enum: `video \| text \| task` (+ existing fields). Nullable per-type columns: `bunny_video_id`, `body_richtext`, `task_instructions`. No polymorphic sub-tables. |
| D7 | Live classes | **External links.** A live session is a lesson (type `text` or a `live_link`/scheduled fields on the lesson) carrying a Meet/Zoom URL + scheduled time displayed in the UI. No attendance tracking, no lifecycle entity. Recordings uploaded to Bunny afterward as ordinary video lessons. |
| D8 | Admin surface | **Focused admin app** at `/admin`: (a) content CRUD (courses → modules → lessons → resources), (b) per-cohort + per-learner progress dashboard, (c) submissions review. Everything else stays in Supabase Studio. |
| D9 | Caching/indexing | **Indexes shipped with the migration** (see Schema). Caching = Next.js defaults; enrollment/auth state is never cached. No Redis, no layered cache strategy. |
| D10 | Mentor architecture disposition | Adopted: state-discipline on enrollment/payment (already live), transaction thinking for mark-complete/submission writes (single-row upserts, idempotent), index catalogue (trimmed), "never cache auth truth." Rejected for V1: middleware auth gate, polymorphic content, sequential gating, live-class entity, bulk import, 4-way log split, layered caching. |

## 1. Remaining assumptions (state disagreement now if wrong)

- A1: Learner UI lives at `elystai.com/learn/*` for V1; the `learn.elystai.com` subdomain (already allowlisted) can be pointed later without schema impact.
- A2: One course ("AI for Work"), one active batch at a time in V1; schema stays multi-course/multi-batch (already is), but UI can assume a learner's single active enrollment (pick most recent active if several).
- A3: Content structure = 7 modules ("Areas") already representable in existing `app.modules`/`app.lessons`; "day-by-day" is expressed via `unlock_day_offset`, grouped in UI by day.
- A4: Submissions accept a URL and/or an uploaded screenshot. Screenshots go to a private Supabase Storage bucket, served via signed URLs (mentor's signed-URL rule adopted). Max ~5 MB, images only.
- A5: Rich text lesson bodies are authored as Markdown in the admin editor (simple textarea + preview), rendered sanitized. No block editor in V1.
- A6: Certificates are fully manual (out of scope, per handoff).
- A7: Timezone for drip unlock: `Asia/Kolkata` fixed (audience is India + GCC; unlocks at midnight IST ≈ 22:30 Gulf, acceptable).
- A8: Admin submission review is visibility + a simple reviewed/needs-attention flag + optional note — not a grading system.

## 2. Objective

Ship a reliable, mobile-first learning portal for the AI for Work live cohort: learners log in (existing OTP auth), see their day-by-day course with calendar-drip unlocking, watch Bunny videos / read text lessons, mark lessons complete, submit tasks, browse a resource vault, and see their progress. Admins manage all content without code and see cohort progress + submissions. Every action emits a structured event. No AI features, no WhatsApp, no gamification, no forums, no payments logic (V1 avoid-list is binding).

## 3. Tech stack

Exactly the live stack — no additions except Supabase Storage usage:
Next.js 16 App Router · TypeScript strict · React 19 · Tailwind v4 (`@theme inline`) · Base UI + reskinned shadcn · Framer Motion (sparingly) · Supabase (`@supabase/ssr`, existing three-client pattern, `.schema("app")`) · Bunny Stream embed for video · Resend (unchanged) · Vercel (`dev → main`). New deps allowed: a Markdown renderer (e.g. `react-markdown` + sanitizer). Nothing else without asking.

## 4. Commands

- `npm run dev` — local dev
- `npm run build` — must pass before any PR
- `npm run lint` — eslint on `src`, must pass
- Migrations: new files in `supabase/migrations/00NN_*.sql`, applied to `elyst-ai-test` first, prod only after staging verification.

## 5. Project structure (new/changed)

```
src/app/learn/                 # learner portal (replaces stub)
  page.tsx                     # dashboard: progress, today's day, next live session
  [courseSlug]/day/[n]/        # day view: lessons list
  [courseSlug]/lesson/[id]/    # lesson view: video/text/task + mark-done
  vault/                       # resource vault grouped by Area
src/app/admin/                 # admin app (requireAdmin gate)
  content/                     # course→module→lesson→resource CRUD
  progress/                    # cohort + learner completion dashboard
  submissions/                 # submissions review
src/app/api/learn/…            # progress, submissions, heartbeat endpoints
src/app/api/admin/…            # content CRUD endpoints
src/lib/lms/                   # requireEnrollment/requireAdmin, drip logic, progress calc
supabase/migrations/0011_lms_v1.sql   # schema below
```

## 6. Schema (migration 0011, translating locked decisions)

- `app.lessons` — add `content_type` enum, `unlock_day_offset int not null default 0`, `body_richtext text`, `task_instructions text`, `live_link text`, `live_starts_at timestamptz`. RLS unchanged (preview OR active enrollment).
- `app.lesson_progress` — `id, enrollment_id fk, lesson_id fk, completed_at`, unique `(enrollment_id, lesson_id)`. RLS: learner reads/writes own via enrollment ownership; scoped to enrollment, not profile.
- `app.submissions` — `id, enrollment_id fk, lesson_id fk, url text null, storage_path text null, note text, status enum('submitted','reviewed','needs_attention') default 'submitted', reviewer_note text, created_at, reviewed_at`. Check: url or storage_path present. RLS: learner CRUD own; admin read/update.
- `app.resources` — `id, course_id fk, batch_id fk null, module_id fk null (Area grouping), title, url_or_storage_path, kind, sort_order`. RLS: readable with active enrollment.
- `public.admin_users` — `profile_id pk fk, granted_at`. Checked by `requireAdmin()` and referenced in admin RLS policies.
- Storage: private bucket `submissions`; signed URLs only.
- Indexes: `lesson_progress(enrollment_id)`, `lesson_progress(lesson_id)`, `submissions(status, created_at)`, `submissions(enrollment_id)`, `lessons(module_id, unlock_day_offset)`, `resources(course_id, sort_order)`, existing `interaction_events` indexes reviewed for `(event_type, created_at)`.

Drip rule (single source of truth in `src/lib/lms/drip.ts`): lesson is unlocked iff `today_IST >= batches.starts_on + unlock_day_offset` (or `is_preview`). Enforced server-side on lesson fetch AND reflected in UI; RLS keeps enrollment gating, app layer enforces drip (drip is UX pacing, enrollment is security).

## 7. Code style

Follow existing codebase conventions exactly: strict TS, server components by default, existing three-Supabase-client pattern (admin client never in browser), brand tokens via CSS variables (never hardcoded colors), `<BrandButton>` for primary actions, light-only design, DM Sans/Manrope, mobile-first layouts (audience is mobile-first). All new server writes log via existing `logEvent()` with `correlation_id` where a client flow exists; redaction rules apply.

## 8. Testing strategy

No test framework exists in repo; V1 verification is: (1) migration applied + RLS probed on staging with three personas (anon, enrolled learner, non-enrolled user, admin) via scripted Supabase queries per policy; (2) manual E2E checklist on staging for each vertical slice (defined per-task in todo.md); (3) `npm run build && npm run lint` green as merge gate; (4) drip logic unit-tested with plain assertion script (date math is the one pure-logic risk area). No new test infra unless founder asks.

## 9. Boundaries

**Always:** apply migrations to staging first · log a structured event for every new learner/admin action · enforce access via RLS + `require*()` helpers · keep admin client server-only · mobile-first check on every learner screen.
**Ask first:** any new dependency beyond Markdown rendering · any change to existing checkout/auth/email code paths · any schema change beyond migration 0011 · exposing anything on `learn.elystai.com`.
**Never:** AI/LLM calls, WhatsApp, gamification, forums, auto-certificates, payments logic in LMS, push notifications, offline support, multi-tier admin roles, dark mode, caching of auth/enrollment state, editing applied migrations.

## 10. Success criteria

- Enrolled learner on a phone can: log in via OTP → land on dashboard → see today's unlocked content and locked future days → watch a video / read a lesson → mark complete → submit a task (link or screenshot) → browse vault → see accurate per-day and overall progress.
- Non-enrolled/anon users can access nothing gated (verified against RLS probes).
- Late joiner sees the same unlock state as the rest of the cohort.
- Admin (in `admin_users`) can create/edit/reorder all content and see cohort completion % and every submission, with zero code changes.
- Every action above produces a correctly-named `interaction_events` row.
- Build + lint green; live Batch 1 runs on it without Studio interventions for normal operations.

## 11. Open questions (non-blocking, defaults chosen)

- OQ1: Do resources group by module/Area FK (default) or free-text area label? Default: `module_id` FK.
- OQ2: Should the dashboard surface the next live session prominently? Default: yes, from soonest `live_starts_at`.
- OQ3: Submission image types/size limit — default images ≤5 MB.
- OQ4: Does marking a task lesson complete require a submission first? Default: no hard requirement (avoid blocking learners), but UI nudges.
