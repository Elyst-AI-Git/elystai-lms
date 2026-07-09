-- 0005_grant_service_role_public_writes.sql
-- service_role had SELECT on public schema tables (Supabase's default grant
-- covers reads), but never an explicit grant for write operations. The
-- checkout API updates public.profiles (Moment 1 fields) using the
-- service-role client, which failed with "permission denied for table
-- profiles". This is the same class of gap as 0004, just on the public
-- schema instead of app.

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Ensure tables/sequences created by FUTURE migrations also grant service_role
-- automatically, so this gap can't recur on either schema.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
