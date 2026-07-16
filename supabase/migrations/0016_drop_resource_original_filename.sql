-- 0016_drop_resource_original_filename.sql
-- Product decision (reverts 0015): downloads should be named after the TITLE
-- the admin gives a resource in the console, not the original uploaded
-- filename. No code reads original_filename anymore, so drop the column
-- rather than leave a dead one behind.

alter table app.resources
  drop column if exists original_filename;
