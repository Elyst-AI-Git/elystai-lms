-- 0003_app_commerce.sql
-- Money, access grants, the post-payment survey, and webhook idempotency.
--
-- Trust model (critical):
--   * enrollments and payments are written ONLY by the server (service_role),
--     and only after the Razorpay WEBHOOK confirms payment. The client can
--     read its own rows but can never insert/grant itself access.
--   * The webhook is the single source of truth. webhook_events makes it
--     idempotent (dedupe on Razorpay's event id) and out-of-order tolerant.

-- ---------------------------------------------------------------------------
-- enrollments : the access grant. RLS on lessons keys off this row.
-- One per person per batch. Moment-3 attribution captured silently here.
-- ---------------------------------------------------------------------------
create table if not exists app.enrollments (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  batch_id            uuid not null references app.batches (id),
  status              text not null default 'pending'
                        check (status in ('pending', 'active', 'cancelled', 'refunded')),
  discount_segment_id uuid references public.discount_segments (id),  -- nullable: which rule applied
  -- Moment 3 (captured silently, no form fields):
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  referrer            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (profile_id, batch_id)
);

create index if not exists enrollments_profile_idx on app.enrollments (profile_id);
create index if not exists enrollments_batch_idx   on app.enrollments (batch_id);

drop trigger if exists trg_enrollments_updated_at on app.enrollments;
create trigger trg_enrollments_updated_at
  before update on app.enrollments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payments : Razorpay order/payment record. Amount is always server-computed.
-- Separate from enrollment so a retry/second attempt never mutates access.
-- ---------------------------------------------------------------------------
create table if not exists app.payments (
  id                 uuid primary key default gen_random_uuid(),
  enrollment_id      uuid not null references app.enrollments (id) on delete cascade,
  razorpay_order_id  text unique,
  razorpay_payment_id text,
  amount             integer not null check (amount >= 0),   -- paise, server-computed
  currency           text not null default 'INR',
  status             text not null default 'created'
                       check (status in ('created', 'paid', 'failed')),
  discount_applied   boolean not null default false,
  discount_amount    integer not null default 0,             -- paise
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);

create index if not exists payments_enrollment_idx on app.payments (enrollment_id);

-- ---------------------------------------------------------------------------
-- onboarding : Moment 2 survey. Separate table so "did they pay" stays clean
-- from "did they fill the survey". All fields skippable. This is the #1
-- analytics asset: WHO the audience is.
-- ---------------------------------------------------------------------------
create table if not exists app.onboarding (
  profile_id     uuid primary key references public.profiles (id) on delete cascade,
  audience_type  text,    -- professional | business_owner | freelancer | job_seeker | student
  role           text,    -- profession / role
  industry       text,
  seniority      text,    -- optional
  ai_experience  text,    -- none | dabbled | regular
  primary_goal   text,    -- dropdown
  goal_other     text,    -- one optional open-text
  heard_about_us text,
  linkedin_url   text,    -- optional
  completed_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- webhook_events : idempotency + out-of-order log. Server-only.
-- Dedupe on Razorpay's event id; check status before mutating enrollment/payment.
-- ---------------------------------------------------------------------------
create table if not exists app.webhook_events (
  event_id     text primary key,          -- Razorpay's x-razorpay-event-id (unique)
  event_type   text,
  payload      jsonb,
  status       text not null default 'received'
                 check (status in ('received', 'processed', 'failed')),
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table app.enrollments   enable row level security;
alter table app.payments      enable row level security;
alter table app.onboarding    enable row level security;
alter table app.webhook_events enable row level security;

-- enrollments: a user reads ONLY their own. No client writes (server/service_role
-- only — service_role bypasses RLS, so no insert/update/delete policy is given).
drop policy if exists enrollments_select_own on app.enrollments;
create policy enrollments_select_own on app.enrollments
  for select to authenticated
  using (profile_id = auth.uid());

-- payments: a user reads payments tied to their own enrollment. No client writes.
drop policy if exists payments_select_own on app.payments;
create policy payments_select_own on app.payments
  for select to authenticated
  using (exists (
    select 1 from app.enrollments e
    where e.id = payments.enrollment_id and e.profile_id = auth.uid()
  ));

-- onboarding: the user owns their survey row — can read, create, and update it.
drop policy if exists onboarding_select_own on app.onboarding;
create policy onboarding_select_own on app.onboarding
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists onboarding_insert_own on app.onboarding;
create policy onboarding_insert_own on app.onboarding
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists onboarding_update_own on app.onboarding;
create policy onboarding_update_own on app.onboarding
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- webhook_events: NO policies. Server-only (service_role bypasses RLS).

-- ---------------------------------------------------------------------------
-- lessons gating policy (depends on enrollments, so it lives here)
-- A lesson body is served only if it's a preview OR the user has an ACTIVE
-- enrollment in a batch of that lesson's course.
-- ---------------------------------------------------------------------------
drop policy if exists lessons_select_gated on app.lessons;
create policy lessons_select_gated on app.lessons
  for select to authenticated
  using (
    is_preview = true
    or exists (
      select 1
      from app.modules   m
      join app.batches    b on b.course_id = m.course_id
      join app.enrollments e on e.batch_id = b.id
      where m.id = lessons.module_id
        and e.profile_id = auth.uid()
        and e.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on app.enrollments to authenticated;
grant select on app.payments    to authenticated;
grant select, insert, update on app.onboarding to authenticated;
-- intentionally NO grants on app.webhook_events
