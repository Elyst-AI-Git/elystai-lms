-- 0001_shared_identity.sql
-- Cross-product shared layer. These objects live in `public` and are reused by
-- EVERY Elyst product (the course platform now, AI OS later). The single source
-- of identity is auth.users (Supabase-managed); public.profiles is the one
-- human-readable person record that every product points at.
--
-- Design notes:
--  * profiles.id IS auth.users.id (1:1). We never create a second identity table.
--  * A row is created automatically on signup via a trigger, so the app never has
--    to "insert a profile" — it only updates the Moment-1 fields (phone/city/country).
--  * discount_segments are shared on purpose: a "Circle" member is a Circle member
--    across all products, not just one course.

-- ---------------------------------------------------------------------------
-- profiles : shared person record (Moment 1 lives here)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,                       -- mirrored from auth.users for convenience
  full_name   text,                       -- from Google, never asked as a form field
  avatar_url  text,                       -- from Google
  phone       text,                       -- Moment 1: required at checkout (enforced in app, not DB)
  city        text,                       -- Moment 1: optional
  country     text,                       -- Moment 1: optional
  locale      text,                       -- Moment 3: captured silently
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Shared cross-product person record. id = auth.users.id. Name/email come from Google.';

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create a profile row whenever a new auth user signs up.
-- SECURITY DEFINER so it can write to public.profiles regardless of caller.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- discount_segments : reusable, non-leakable discount mechanism
-- Eligibility is an email-membership check done SERVER-SIDE against the logged-in
-- verified email. There are no shareable coupon codes.
-- ---------------------------------------------------------------------------
create table if not exists public.discount_segments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,             -- e.g. 'circle', 'alumni', 'early-bird'
  description text,
  kind        text not null default 'percent'   -- 'percent' | 'fixed'
                check (kind in ('percent', 'fixed')),
  value       numeric not null check (value >= 0),  -- percent (e.g. 20) or fixed paise
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.discount_segments is
  'Reusable discount rules. Eligibility checked server-side by email membership, not codes.';

create table if not exists public.discount_segment_members (
  id          uuid primary key default gen_random_uuid(),
  segment_id  uuid not null references public.discount_segments (id) on delete cascade,
  email       text not null,                    -- stored as-entered; matched case-insensitively
  created_at  timestamptz not null default now()
);

-- one email per segment, case-insensitive
create unique index if not exists discount_segment_members_unique
  on public.discount_segment_members (segment_id, lower(email));

comment on table public.discount_segment_members is
  'Email allow-list per segment. Looked up with lower(email) against the verified login.';

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles                  enable row level security;
alter table public.discount_segments         enable row level security;
alter table public.discount_segment_members  enable row level security;

-- profiles: a user can read and update ONLY their own row. No inserts from the
-- client (the trigger does that); no access to anyone else's profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- discount_segments / members: NO client policies at all. RLS is enabled with no
-- policy, so anon/authenticated get zero rows. Only the server (service_role,
-- which bypasses RLS) reads these during checkout. Discounts can never leak.

-- ---------------------------------------------------------------------------
-- Grants (PostgREST needs table-level grants in addition to RLS policies)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
-- intentionally NO grants on discount_segments / discount_segment_members
