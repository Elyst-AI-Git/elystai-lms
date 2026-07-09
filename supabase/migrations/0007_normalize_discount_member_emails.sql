-- discount_segment_members.email was stored "as-entered" (mixed case), but
-- the checkout route's lookup (src/app/api/checkout/order/route.ts) does an
-- exact match on `user.email.toLowerCase()` — a member row stored as
-- "John@Gmail.com" silently never matches, missing the Circle discount even
-- though the case-insensitive unique index treats it as a duplicate of
-- "john@gmail.com". Normalize existing data and enforce lowercase on every
-- future write so the column always matches what checkout actually queries.

update public.discount_segment_members
set email = lower(email)
where email <> lower(email);

alter table public.discount_segment_members
  drop constraint if exists discount_segment_members_email_lowercase;

alter table public.discount_segment_members
  add constraint discount_segment_members_email_lowercase
  check (email = lower(email));
