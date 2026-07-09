-- 0009_interaction_events.sql
-- Every step of a buyer's journey after they reach checkout, plus what our
-- servers answered, recorded in one append-only table. When a user says "I
-- paid and got nothing", support pastes one correlation_id (or their
-- razorpay order id) and sees the whole trace: what they clicked, what price
-- we computed, whether the webhook ever arrived, and where it stalled.
--
-- Trust model matches the rest of the app schema: server-only. Rows are
-- written exclusively by service_role (the /api/events sink and the API
-- routes). No client insert policy. RLS on, no policies granted to
-- authenticated/anon -> the app can never write or read these directly; only
-- service_role (which bypasses RLS) touches them. Never store OTP codes,
-- Razorpay secrets, or signatures in `payload`.

create table if not exists app.interaction_events (
  id             uuid primary key default gen_random_uuid(),
  correlation_id uuid,                        -- the journey id, minted client-side at checkout
  profile_id     uuid references public.profiles (id) on delete set null,
  event          text not null,              -- e.g. 'order.create.response', 'webhook.activated'
  source         text not null default 'server'
                   check (source in ('client', 'server', 'webhook')),
  order_id       text,                        -- razorpay order id when known
  http_status    integer,
  payload        jsonb,                       -- redacted, structured details
  created_at     timestamptz not null default now()
);

create index if not exists interaction_events_correlation_idx on app.interaction_events (correlation_id);
create index if not exists interaction_events_order_idx        on app.interaction_events (order_id);
create index if not exists interaction_events_profile_idx      on app.interaction_events (profile_id);
create index if not exists interaction_events_created_idx      on app.interaction_events (created_at desc);

-- Server-only, same as app.webhook_events. RLS on, zero policies.
alter table app.interaction_events enable row level security;

-- Belt-and-suspenders: this log can carry phone/city/amount detail, so revoke
-- explicitly rather than relying on "never granted" in case a future
-- default-privilege change opens the app schema up.
revoke all privileges on table app.interaction_events from anon, authenticated;

comment on table app.interaction_events is
  'Append-only journey + server-response log for the checkout/payment flow. Server-only (service_role). Joined to payments/enrollments via correlation_id or order_id for support and reconciliation.';
