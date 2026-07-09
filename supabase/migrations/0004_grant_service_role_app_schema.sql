-- 0004_grant_service_role_app_schema.sql
-- Fixes a gap from 0002/0003: usage on the `app` schema was granted to
-- anon/authenticated but not to service_role. The server-side API client uses
-- service_role to bypass RLS for writes (enrollments, payments, webhook_events),
-- and in Postgres even a privileged role needs explicit USAGE on a non-public
-- schema to see anything inside it.
--
-- This is additive only (grants), not a structural change. Safe to run anytime.

grant usage on schema app to service_role;
grant all privileges on all tables in schema app to service_role;
grant all privileges on all sequences in schema app to service_role;

-- Ensure tables/sequences created by FUTURE migrations also grant service_role
-- automatically, so this gap can't recur.
alter default privileges in schema app grant all on tables to service_role;
alter default privileges in schema app grant all on sequences to service_role;
