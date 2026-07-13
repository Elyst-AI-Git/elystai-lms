-- 0012_lesson_youtube.sql
-- Batch 1 delivers video via a private/unlisted YouTube embed instead of Bunny
-- Stream. Add an optional youtube_id alongside the existing bunny_video_id; the
-- app prefers youtube_id when present and falls back to Bunny otherwise, so no
-- existing content breaks. Nothing here is destructive.

alter table app.lessons
  add column if not exists youtube_id text;

comment on column app.lessons.youtube_id is
  'YouTube video id (unlisted/private embed) for video lessons. When set, takes precedence over bunny_video_id.';
