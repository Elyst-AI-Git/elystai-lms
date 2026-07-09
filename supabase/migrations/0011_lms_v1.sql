-- 0011_lms_v1.sql
-- LMS V1 (spec: tasks/spec.md §6). Adds the learning surface on top of the
-- existing course structure: typed lessons with calendar-drip fields,
-- learner progress, task submissions, a resource vault, an admin allowlist,
-- and the private storage bucket for submission screenshots.
--
-- Conventions follow 0002/0003/0009: text + check instead of pg enums,
-- RLS on every table, learner access derived from an ACTIVE enrollment,
-- service_role covered by the default privileges from 0004.

-- ---------------------------------------------------------------------------
-- lessons : typed content + drip fields
-- content_type: video (Bunny embed) | text (markdown body) | task (submission).
-- unlock_day_offset is relative to batches.starts_on; day math lives in
-- src/lib/lms/drip.ts (app-layer pacing — enrollment RLS stays the boundary).
-- ---------------------------------------------------------------------------
alter table app.lessons
  add column if not exists content_type text not null default 'video'
    check (content_type in ('video', 'text', 'task')),
  add column if not exists unlock_day_offset integer not null default 0
    check (unlock_day_offset >= 0),
  add column if not exists body_richtext text,
  add column if not exists task_instructions text,
  add column if not exists live_link text,
  add column if not exists live_starts_at timestamptz;

create index if not exists lessons_module_unlock_idx
  on app.lessons (module_id, unlock_day_offset);

-- ---------------------------------------------------------------------------
-- lesson_progress : manual mark-done is the only completion truth (spec D3).
-- Scoped to the ENROLLMENT, not the profile, so re-enrollment in a later
-- batch starts fresh. One row per (enrollment, lesson); idempotent upsert.
-- ---------------------------------------------------------------------------
create table if not exists app.lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references app.enrollments (id) on delete cascade,
  lesson_id     uuid not null references app.lessons (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (enrollment_id, lesson_id)
);

create index if not exists lesson_progress_enrollment_idx on app.lesson_progress (enrollment_id);
create index if not exists lesson_progress_lesson_idx     on app.lesson_progress (lesson_id);

alter table app.lesson_progress enable row level security;

-- Learner owns rows through the enrollment -> profile chain, and only while
-- the enrollment is active.
drop policy if exists lesson_progress_select_own on app.lesson_progress;
create policy lesson_progress_select_own on app.lesson_progress
  for select to authenticated
  using (exists (
    select 1 from app.enrollments e
    where e.id = lesson_progress.enrollment_id and e.profile_id = auth.uid()
  ));

drop policy if exists lesson_progress_insert_own on app.lesson_progress;
create policy lesson_progress_insert_own on app.lesson_progress
  for insert to authenticated
  with check (exists (
    select 1 from app.enrollments e
    where e.id = lesson_progress.enrollment_id
      and e.profile_id = auth.uid()
      and e.status = 'active'
  ));

-- Un-marking a lesson deletes the row (toggle in T3).
drop policy if exists lesson_progress_delete_own on app.lesson_progress;
create policy lesson_progress_delete_own on app.lesson_progress
  for delete to authenticated
  using (exists (
    select 1 from app.enrollments e
    where e.id = lesson_progress.enrollment_id
      and e.profile_id = auth.uid()
      and e.status = 'active'
  ));

grant select, insert, delete on app.lesson_progress to authenticated;

-- ---------------------------------------------------------------------------
-- admin_users : the entire admin model for V1 (spec D8, no role tiers).
-- Checked by requireAdmin() and referenced by admin RLS policies below, so it
-- is created before the tables whose policies depend on it. Lives in public
-- because it references public.profiles and may later gate non-app schemas.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A user may see only their own row (lets requireAdmin() run on the user
-- client without leaking the admin roster).
drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self on public.admin_users
  for select to authenticated
  using (profile_id = auth.uid());

grant select on public.admin_users to authenticated;
grant all privileges on public.admin_users to service_role;

-- ---------------------------------------------------------------------------
-- submissions : one per (enrollment, lesson); learners may replace theirs.
-- A submission must carry a URL and/or an uploaded screenshot path.
-- Review is visibility + a flag + note, not grading (spec A8).
-- ---------------------------------------------------------------------------
create table if not exists app.submissions (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references app.enrollments (id) on delete cascade,
  lesson_id     uuid not null references app.lessons (id) on delete cascade,
  url           text,
  storage_path  text,
  note          text,
  status        text not null default 'submitted'
                  check (status in ('submitted', 'reviewed', 'needs_attention')),
  reviewer_note text,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  unique (enrollment_id, lesson_id),
  check (url is not null or storage_path is not null)
);

create index if not exists submissions_status_created_idx on app.submissions (status, created_at);
create index if not exists submissions_enrollment_idx     on app.submissions (enrollment_id);

alter table app.submissions enable row level security;

drop policy if exists submissions_select_own on app.submissions;
create policy submissions_select_own on app.submissions
  for select to authenticated
  using (exists (
    select 1 from app.enrollments e
    where e.id = submissions.enrollment_id and e.profile_id = auth.uid()
  ));

drop policy if exists submissions_insert_own on app.submissions;
create policy submissions_insert_own on app.submissions
  for insert to authenticated
  with check (exists (
    select 1 from app.enrollments e
    where e.id = submissions.enrollment_id
      and e.profile_id = auth.uid()
      and e.status = 'active'
  ));

-- Learner may replace their own submission content, but never touch review
-- fields: updates must leave status/reviewer fields at their pre-review state.
drop policy if exists submissions_update_own on app.submissions;
create policy submissions_update_own on app.submissions
  for update to authenticated
  using (exists (
    select 1 from app.enrollments e
    where e.id = submissions.enrollment_id
      and e.profile_id = auth.uid()
      and e.status = 'active'
  ))
  with check (
    status = 'submitted' and reviewer_note is null and reviewed_at is null
    and exists (
      select 1 from app.enrollments e
      where e.id = submissions.enrollment_id
        and e.profile_id = auth.uid()
        and e.status = 'active'
    )
  );

-- Admin read/update goes through the service-role client server-side;
-- additionally allow direct reads for allowlisted admins (dashboards).
drop policy if exists submissions_select_admin on app.submissions;
create policy submissions_select_admin on app.submissions
  for select to authenticated
  using (exists (
    select 1 from public.admin_users a where a.profile_id = auth.uid()
  ));

grant select, insert, update on app.submissions to authenticated;

-- ---------------------------------------------------------------------------
-- resources : the vault. Grouped by module ("Area", spec OQ1); optional
-- batch override rows apply only to that batch.
-- ---------------------------------------------------------------------------
create table if not exists app.resources (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references app.courses (id) on delete cascade,
  batch_id            uuid references app.batches (id) on delete cascade,
  module_id           uuid references app.modules (id) on delete set null,
  title               text not null,
  url_or_storage_path text not null,
  kind                text not null default 'link'
                        check (kind in ('link', 'file', 'template', 'video', 'doc')),
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists resources_course_sort_idx on app.resources (course_id, sort_order);

alter table app.resources enable row level security;

drop policy if exists resources_select_enrolled on app.resources;
create policy resources_select_enrolled on app.resources
  for select to authenticated
  using (exists (
    select 1
    from app.batches b
    join app.enrollments e on e.batch_id = b.id
    where b.course_id = resources.course_id
      and e.profile_id = auth.uid()
      and e.status = 'active'
      and (resources.batch_id is null or resources.batch_id = e.batch_id)
  ));

grant select on app.resources to authenticated;

-- ---------------------------------------------------------------------------
-- interaction_events : add taxonomy-scan index (spec §6). Column is `event`.
-- ---------------------------------------------------------------------------
create index if not exists interaction_events_event_created_idx
  on app.interaction_events (event, created_at desc);

-- ---------------------------------------------------------------------------
-- storage : private bucket for submission screenshots. No public access, no
-- storage RLS policies for end users — uploads/reads happen exclusively via
-- server-generated signed URLs (spec A4).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;
