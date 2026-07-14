-- 0014_materials_private.sql
-- Security hardening: course-material PDFs must not be publicly reachable.
-- The `materials` bucket was public, so its object URLs (which also leak the
-- Supabase project ref) could be hit directly from anywhere. Make it private;
-- learners now fetch PDFs only through the auth-gated /api/learn/materials/[id]
-- proxy, which streams the bytes after an enrollment + drip check.
--
-- Idempotent and non-destructive.

-- 1) private bucket (no public object URLs)
update storage.buckets set public = false where id = 'materials';

-- 2) any resource row that stored a full public materials URL is rewritten to
--    the bare storage path (what the proxy resolves). New uploads already store
--    the path. Safe to run repeatedly - the WHERE clause only matches old rows.
update app.resources
set url_or_storage_path =
  regexp_replace(url_or_storage_path, '^https?://[^/]+/storage/v1/object/public/materials/', '')
where url_or_storage_path like '%/storage/v1/object/public/materials/%';
