-- 0008_enrollment_overview_view.sql
-- Nihal reported that browsing app.enrollments in Supabase Studio shows only
-- IDs (profile_id, batch_id) — no name/email/phone, which live on
-- public.profiles. Getting that info today means manually joining three
-- tables by hand in the SQL editor every time.
--
-- This view does that join once, read-only, so Table Editor → Views shows a
-- single human-readable row per enrollment: who they are, what they signed up
-- for, whether they paid, and what they said in onboarding.
--
-- Deliberately NOT granted to anon/authenticated — this is for the team
-- browsing via Supabase Studio (which connects as postgres, bypassing RLS
-- entirely), not for the app to query. No new access is opened up.

create or replace view app.enrollment_overview as
select
  e.id                    as enrollment_id,
  e.status                as enrollment_status,
  e.created_at             as enrolled_at,
  p.id                     as profile_id,
  p.full_name,
  p.email,
  p.phone,
  p.city,
  p.country,
  c.title                  as course_title,
  b.name                   as batch_name,
  pay.status               as payment_status,
  pay.amount                as payment_amount,
  pay.currency,
  pay.discount_applied,
  pay.paid_at,
  ds.name                  as discount_segment,
  ob.audience_type,
  ob.role                  as onboarding_role,
  ob.industry,
  ob.seniority,
  ob.ai_experience,
  ob.primary_goal,
  ob.goal_other,
  ob.heard_about_us,
  ob.linkedin_url,
  e.utm_source,
  e.utm_medium,
  e.utm_campaign,
  e.referrer
from app.enrollments e
join public.profiles p          on p.id = e.profile_id
join app.batches b               on b.id = e.batch_id
join app.courses c                on c.id = b.course_id
left join public.discount_segments ds on ds.id = e.discount_segment_id
left join app.onboarding ob        on ob.profile_id = e.profile_id
left join lateral (
  select status, amount, currency, discount_applied, paid_at
  from app.payments
  where enrollment_id = e.id
  order by created_at desc
  limit 1
) pay on true
order by e.created_at desc;

-- Belt-and-suspenders: this view bundles email/phone/LinkedIn/UTM data, so
-- don't rely on "we just never granted it" — revoke explicitly in case a
-- future default-privilege change (e.g. a PUBLIC grant on the app schema)
-- would otherwise expose it.
revoke all privileges on table app.enrollment_overview from anon, authenticated;

comment on view app.enrollment_overview is
  'Read-only, human-readable rollup of enrollments for browsing in Supabase Studio. One row per enrollment: identity + course/batch + latest payment + onboarding survey. Not exposed to anon/authenticated.';
