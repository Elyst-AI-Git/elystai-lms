-- 0013_lesson_attachments.sql
-- Batch 1 product change: learners do NOT submit work in the LMS (the batch
-- WhatsApp group handles that). Instead, each day ships one or more PDFs with
-- a short description. Model these as resources attached to a lesson: add a
-- nullable lesson_id to app.resources. lesson_id NULL = general/vault resource
-- (unchanged behavior); lesson_id set = shown on that lesson's page as a
-- day material. Existing RLS (course + batch scoped) already covers access.
-- Nothing here is destructive; the submissions table stays (unused by UI).

alter table app.resources
  add column if not exists lesson_id uuid references app.lessons(id) on delete cascade;

-- Short learner-facing blurb ("what's in this PDF") shown on lesson pages
-- and in the vault.
alter table app.resources
  add column if not exists description text;

create index if not exists resources_lesson_id_idx
  on app.resources (lesson_id) where lesson_id is not null;

comment on column app.resources.lesson_id is
  'When set, this resource is a day material (e.g. PDF) shown on the lesson page. NULL = general vault resource.';
