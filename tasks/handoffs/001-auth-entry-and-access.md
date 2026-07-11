# Handoff 001 — Auth entry point + access gate

**Owner:** Codex · **Branch:** `codex/001-auth-entry` · **Reviewer:** Claude
**Test contract (must pass):** `npx tsx scripts/test-access.ts` + manual matrix below.

## Why

The portal has no login UI. `requireUser()` redirects to `/register` (doesn't exist here) and
non-enrolled users are redirected to `/ai-for-work` (also doesn't exist here). The portal will
live on `learn.elystai.com`; existing AI-for-Work buyers must sign in with the SAME Supabase
account they registered with (same Supabase project → same `auth.users`), via Google OAuth or
email OTP. Product decisions from the founder:

- Sessions persist — learners should NOT have to sign in every visit (Supabase refresh-token
  default; do not shorten it, never cache auth state ourselves).
- No redirect to marketing pages for ineligible users: show an in-app "no access" screen.
- Root `/` should never show a dead placeholder again.

## Build (all in `src/`, nothing else)

1. **`src/lib/lms/access.ts`** — pure decision function (this is what `scripts/test-access.ts`
   imports; match the contract exactly):
   ```ts
   export type AccessDecision = "login" | "denied" | "ok";
   export interface EnrollmentLike { status: string; batch: { course_id: string } }
   export function resolveAccess(
     hasSession: boolean,
     enrollments: EnrollmentLike[],
     courseId: string
   ): AccessDecision
   ```
   Rules: no session → "login"; session but no enrollment with `status === "active"` for
   `courseId` → "denied"; otherwise "ok". Non-active statuses (pending/cancelled/refunded)
   never grant access.

2. **`/login` page** (`src/app/login/page.tsx` + client component):
   - Email OTP: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`
     then 6-digit `verifyOtp({ type: "email" })`. `shouldCreateUser: false` is REQUIRED —
     login must not create accounts; registration stays on elystai.com.
   - Google: `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo:
     `${origin}/auth/callback` } })`.
   - Use the browser client from `src/lib/supabase/browser.ts`. On success → `router.push("/learn")`.
   - Design: brand tokens, dark-hero panel style from `lms.css` (`surface-dark-hero`), Manrope
     heading, mobile-first, input-otp primitive from `src/components/ui/input-otp.tsx` if usable.
   - Visible error states (wrong OTP, unknown email → "No account found — register at
     elystai.com/ai-for-work").

3. **`/auth/callback` route** (`src/app/auth/callback/route.ts`): `exchangeCodeForSession(code)`
   via the server client, then redirect to `/learn`. On error → `/login?error=oauth`.

4. **`/no-access` page**: shown to authenticated users without an active enrollment. Copy:
   "This portal is exclusively for AI for Work members." + the signed-in email + a sign-out
   button + link to `https://elystai.com/ai-for-work` to join. Brand-styled, not a 404.

5. **Rewire `src/lib/lms/auth.ts`** (signatures unchanged — extend-only rule):
   - `requireUser()`: redirect to `/login` instead of `/register`.
   - `requireEnrollment()`: on no-active-enrollment, redirect to `/no-access` instead of
     `/${courseSlug}`. Internally use `resolveAccess()` so the tested function is the one
     in production.
   - Add `signOut` server action or `/api/auth/signout` route (POST) used by /no-access and
     a small "Sign out" affordance at the bottom of the learner dashboard.

6. **Root `/` page**: server component — session? redirect `/learn` : redirect `/login`.
   Delete the placeholder.

7. Log events: `learner.auth.login_succeeded|login_failed|signed_out` — ADD these three consts
   to `src/lib/lms/events.ts` (additive only) and log from the client via the existing
   `/api/events`-style pattern — if no such route exists, log server-side where possible
   (callback route logs login_succeeded; signout logs signed_out). Do not log OTP codes or
   tokens (redaction list already covers them — still, never pass them).

## Out of scope (do NOT build)

Registration, password auth, magic links, remember-me toggles, admin login changes
(`requireAdmin` already 404s), DNS/Vercel config (founder + Claude handle), any schema change.

## Acceptance — automated

`npx tsx scripts/test-access.ts` → all cases pass (contract is already committed; it fails
until `access.ts` exists).

## Acceptance — manual matrix (Claude verifies on review)

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | Anon | visit `/` | → `/login` |
| 2 | Anon | visit `/learn` deep link | → `/login` |
| 3 | Enrolled (probe-enrolled@test.elystai.local, pw login N/A — use OTP user or seeded session) | email OTP flow | lands on `/learn` dashboard |
| 4 | Enrolled | close browser, reopen `/learn` | still signed in (no login prompt) |
| 5 | Authed non-member (probe-outsider) | visit `/learn` | `/no-access` screen w/ email + sign-out |
| 6 | Non-member | sign out from `/no-access` | back to `/login`, session gone |
| 7 | Unknown email | request OTP | inline "No account found" error, no user created |
| 8 | Enrolled | `/` | → `/learn` directly |
| 9 | Any | wrong OTP code | inline error, can retry |
| 10 | Enrolled | Google sign-in (needs provider redirect URL for localhost — founder task) | lands on `/learn` |

## QUESTIONS:

(Codex: append questions here instead of guessing.)
