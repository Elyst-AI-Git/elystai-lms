# Pre-production checklist

Everything to clear before promoting `dev → main` and cutting over to prod.
Grouped by blocker level. **Nothing here is done automatically — this is the gate.**

Legend: 🔴 blocker · 🟡 strongly recommended · 🟢 nice-to-have

---

## A. Secrets & credentials 🔴

- [ ] 🔴 **Rotate every credential pasted in chat** before go-live: Supabase
      management token (`sbp_…`), the `sb_secret_…` service-role key, Razorpay
      keys, webhook secret. Treat all as compromised.
- [ ] 🔴 Confirm **no `.env*` file is committed** (they're gitignored — verify with
      `git ls-files | grep env`).
- [ ] 🔴 **Delete the test-only drip accelerator** from any prod env: ensure
      `DRIP_INTERVAL_MINUTES` is **unset** in Vercel prod. (The code is dormant
      without it, but double-check.)
- [ ] 🟡 Confirm the **service-role key is server-only** (never in a
      `NEXT_PUBLIC_*` var, never in the client bundle) — already verified once.

## B. Supabase project cutover 🔴

- [ ] 🔴 Decide prod project: the real prod is `rvgyavnojkzleyvqowta`. **Apply the
      migrations** (`0012_lesson_youtube.sql`, `0013_lesson_attachments.sql`, and
      any others) to prod **only on explicit go** — they've only been applied to
      TEST so far.
- [ ] 🔴 Seed prod content (7 areas × 2 days = 14 lessons, 1 PDF/day) via the admin
      UI or a seed script — TEST content does not carry over.
- [ ] 🔴 **Set the real batch `starts_on` = Monday 2026-07-13** (this drives all
      drip; wrong date = wrong unlocks for everyone). ⚠️ Currently only settable
      via SQL — see `admin-operations.md` gap #1.
- [ ] 🔴 Enroll the real cohort (status `active`) into the AI-for-Work course.
- [ ] 🔴 Add the two founder emails to prod `public.admin_users`.
- [ ] 🟡 Verify prod **RLS policies** are enabled on all `app.*` tables (they're the
      security boundary, not the drip logic).

## C. Auth & Google sign-in 🔴

> This is why "Continue with Google" fails on the Vercel URL today.

- [ ] 🔴 **Google Cloud Console → APIs & Services → Credentials → OAuth client:**
      - Authorized JavaScript origins: `https://app.elystai.com`
      - Authorized redirect URIs: the **Supabase callback**
        `https://<prod-ref>.supabase.co/auth/v1/callback`
      - Move the OAuth consent screen from "Testing" to **"In production"** (else
        only allow-listed test users can sign in).
- [ ] 🔴 **Supabase → Authentication → Providers → Google:** enable it, paste the
      Google **Client ID + Secret**. (Until this is on, the button errors
      "provider is not enabled" — that's the current TEST state too.)
- [ ] 🔴 **Supabase → Authentication → URL Configuration:** Site URL
      `https://app.elystai.com`; add `https://app.elystai.com/auth/callback` to
      the redirect allow-list.
- [ ] 🟡 Confirm **OTP email** deliverability from prod (Supabase default SMTP is
      rate-limited & lands in spam at volume — configure a real SMTP/Resend before
      inviting 100 people, or magic-link login will silently fail for some).

## D. Domain & hosting 🔴

- [ ] 🔴 Add `app.elystai.com` to Vercel + DNS CNAME (see `domain-and-architecture.md`).
- [ ] 🔴 Set `vercel.json` region to prod DB region (`bom1` = Mumbai/ap-south-1 if
      prod DB is there; `sin1` if Singapore). Co-location fixed the 3–4s load.
- [ ] 🟡 Set all prod **environment variables** in Vercel (prod Supabase URL/keys,
      Razorpay, `BUNNY_STREAM_LIBRARY_ID` if using Bunny).
- [ ] 🟡 Force HTTPS + confirm the SSL cert is issued for the subdomain.

## E. Content & media 🟡

- [ ] 🔴 **Real video IDs** on each lesson (YouTube unlisted/private for batch 1),
      set via admin lesson editor. Verify playback on a real phone.
- [ ] 🟡 **Host the real PDFs in Supabase Storage** and repoint each resource's
      `url_or_storage_path` — the current sample points at a third-party demo URL
      (`pdfobject.com`) and gives no download UI on mobile. See admin doc.
- [ ] 🟢 Proofread all lesson titles/descriptions (em-dashes → hyphens already done
      in seed; recheck any new content).

## F. Quality gates 🟡

- [ ] 🟡 Add the two `NEXT_PUBLIC_*` repo secrets so **CI** (`.github/workflows/ci.yml`)
      goes green on push.
- [ ] 🟡 Run `scripts/test-campaign.ts` against TEST one final time — it's the
      regression gate for auth/drip/admin.
- [ ] 🟡 Close **handoff 003** security items: rate-limit/auth-gate `/api/events`
      (MEDIUM), uniform OTP request step to stop member enumeration (LOW).
- [ ] 🟢 Add Sentry + an uptime monitor (see `testing-strategy.md`).

## G. SEO / discoverability 🟡

- [ ] 🟡 Add `robots.ts` → `Disallow: /` and blanket `noindex` (keep the private app
      out of Google). See `seo-and-discoverability.md`.
- [ ] 🟡 Favicon + OG image + metadata so invite links render a proper card.

## H. Launch-day dry run 🟢

- [ ] 🟢 With prod live but before inviting the cohort: log in as a founder admin,
      open `/admin`, confirm you can see content + progress.
- [ ] 🟢 Log in as a real test enrollee, confirm day-1 is unlocked and days 2–14 are
      locked, open the lesson, play the video, open a PDF, mark complete.
- [ ] 🟢 Paste the login link into WhatsApp — confirm the preview card looks right.

---

### The single most important three, if you do nothing else
1. **C — Google OAuth + Supabase provider** (or Google login stays broken).
2. **B — migrations + `starts_on` + enrollments + admins on the *prod* project.**
3. **A — rotate the leaked credentials.**
