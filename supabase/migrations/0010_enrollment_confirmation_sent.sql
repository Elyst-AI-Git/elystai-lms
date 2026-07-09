-- 0010_enrollment_confirmation_sent.sql
-- Single-fire guard for the post-payment confirmation email (Issue 1).
--
-- Activation can now happen from TWO places — the Razorpay webhook and the
-- new synchronous /api/checkout/verify on return (Issue 4 fix) — plus webhook
-- retries. The confirmation email must go out exactly once regardless. This
-- column is the claim token: whoever atomically flips it from NULL to now()
-- (via `update ... where confirmation_sent_at is null returning id`) wins the
-- right to send; everyone else skips. Server-only table, no RLS change needed.

alter table app.enrollments
  add column if not exists confirmation_sent_at timestamptz;

comment on column app.enrollments.confirmation_sent_at is
  'Set atomically when the confirmation email is claimed/sent. NULL = not yet sent. Guarantees the email fires once across webhook + verify + retries.';
