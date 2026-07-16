-- 0015_resource_original_filename.sql
-- Downloads were named after the resource title, not the file the admin
-- actually uploaded (e.g. "Day-3-workbook.pdf" instead of the source
-- "Workbook_v3_FINAL.pdf"). Store the original filename at upload time so
-- the proxy can hand it back on download.

alter table app.resources
  add column if not exists original_filename text;

comment on column app.resources.original_filename is
  'Original filename of the uploaded PDF, used for the Content-Disposition download name. NULL for external links or legacy rows (falls back to a title-derived name).';
