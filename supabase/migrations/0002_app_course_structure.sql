-- 0002_app_course_structure.sql
-- The course-platform domain lives in its own schema `app`. This is the
-- modularity boundary: AI OS (later) gets its own schema (e.g. `aios`) in the
-- SAME project, reusing auth.users + public.profiles. No second login, no
-- user migration, ever.
--
-- This migration creates the schema and the course STRUCTURE tables:
-- courses -> batches (cohorts) -> modules -> lessons.
-- Video is NOT stored here; only the Bunny Stream video id is referenced.

create schema if not exists app;

-- The PostgREST roles must be able to "see into" the schema. Per-table grants
-- below + RLS policies (in this and the next migration) control actual access.
grant usage on schema app to anon, authenticated;

-- ---------------------------------------------------------------------------
-- courses : one of many. "AI for Work" is the first.
-- ---------------------------------------------------------------------------
create table if not exists app.courses (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  status      text not null default 'draft'
                check (status in ('draft', 'published', 'archived')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- batches : a cohort/run of a course. PRICE lives here, not on the course,
-- because the same course runs repeatedly at possibly different prices.
-- Amounts are integers in the currency's minor unit (paise for INR).
-- ---------------------------------------------------------------------------
create table if not exists app.batches (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references app.courses (id) on delete cascade,
  name              text not null,                 -- e.g. 'AI for Work — Aug 2026'
  base_price_amount integer not null check (base_price_amount >= 0),  -- paise
  currency          text not null default 'INR',
  starts_on         date,
  enroll_opens_at   timestamptz,
  enroll_closes_at  timestamptz,
  status            text not null default 'upcoming'
                      check (status in ('upcoming', 'open', 'closed', 'running', 'completed')),
  created_at        timestamptz not null default now()
);

create index if not exists batches_course_idx on app.batches (course_id);

-- ---------------------------------------------------------------------------
-- modules : sections within a course. Small text rows.
-- ---------------------------------------------------------------------------
create table if not exists app.modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references app.courses (id) on delete cascade,
  title      text not null,
  position   integer not null default 0,    -- ordering within the course
  created_at timestamptz not null default now()
);

create index if not exists modules_course_idx on app.modules (course_id, position);

-- ---------------------------------------------------------------------------
-- lessons : the gated content unit. Stores ONLY the Bunny video id, never media.
-- is_preview lets a single lesson be public (a teaser) without enrollment.
-- ---------------------------------------------------------------------------
create table if not exists app.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references app.modules (id) on delete cascade,
  title            text not null,
  position         integer not null default 0,
  bunny_video_id   text,                          -- provider id only; media lives on Bunny
  video_provider   text not null default 'bunny',
  duration_seconds integer,
  is_preview       boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists lessons_module_idx on app.lessons (module_id, position);

-- ---------------------------------------------------------------------------
-- Row-Level Security : catalog is readable; lesson bodies are gated.
-- (Lesson gating depends on enrollments, created in 0003, so the lessons
--  policy is defined there to keep the dependency order clean.)
-- ---------------------------------------------------------------------------
alter table app.courses enable row level security;
alter table app.batches enable row level security;
alter table app.modules enable row level security;
alter table app.lessons enable row level security;

-- Published courses are readable by any signed-in user (needed to render the
-- catalog and the course landing/curriculum outline).
drop policy if exists courses_select_published on app.courses;
create policy courses_select_published on app.courses
  for select to authenticated
  using (status = 'published');

-- Batches of a published course are readable (needed to show price/dates).
drop policy if exists batches_select_published on app.batches;
create policy batches_select_published on app.batches
  for select to authenticated
  using (exists (
    select 1 from app.courses c
    where c.id = batches.course_id and c.status = 'published'
  ));

-- Module titles of a published course are readable (curriculum outline).
drop policy if exists modules_select_published on app.modules;
create policy modules_select_published on app.modules
  for select to authenticated
  using (exists (
    select 1 from app.courses c
    where c.id = modules.course_id and c.status = 'published'
  ));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on app.courses to authenticated;
grant select on app.batches to authenticated;
grant select on app.modules to authenticated;
grant select on app.lessons to authenticated;
