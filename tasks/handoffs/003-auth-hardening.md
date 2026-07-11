# Handoff 003 — Auth surface hardening (pre-production)

**Owner:** Codex · **Branch:** `codex/003-auth-hardening` (from `dev`) · **Reviewer:** Claude
**Priority:** before the PROD cutover, not blocking staging.
**Source:** security-auditor pass on 2026-07-11 (handoff 001 surface).

## Findings to fix

1. **[MEDIUM] `POST /api/events` accepts unauthenticated service-role writes.**
   `src/app/api/events/route.ts` inserts via the RLS-bypassing admin client after
   only *reading* the user (a null user still inserts). An anonymous caller can
   flood `app.interaction_events`. Fix:
   - Drop the insert when `user` is null for these auth events (they're
     meaningless without a subject) **and/or** add a lightweight per-IP rate limit
     (in-memory token bucket is fine for V1 — no new dependency; a `Map` keyed on
     `x-forwarded-for` with a short window). Prefer: require a session OR cap
     unauthenticated calls to a few/minute/IP. Keep the existing event allowlist.
   - Keep NOT forwarding `body.payload` to `logEvent` (correct today — do not
     regress; OTP/tokens must never be logged).

2. **[LOW] OTP request step enumerates members.**
   `src/app/login/login-form.tsx` shows "No account found — register at…" only for
   non-members, revealing who is enrolled. Fix: on the request-code step, always
   advance to the code entry screen with a uniform "If that email is registered, a
   code is on its way." Move the register link to static helper text (not an error
   branch). The real wrong-email failure then surfaces harmlessly at verify time.

3. **[LOW] Logout CSRF — accept as-is, document why.**
   `POST /api/auth/signout` has no CSRF token, but Supabase SSR cookies are
   `SameSite=Lax`, so a cross-site POST arrives with no session and no-ops. No
   code change required — add a one-line comment on the route noting the Lax-cookie
   mitigation so nobody "fixes" it by loosening SameSite. Optionally add a
   `Sec-Fetch-Site` reject for defense-in-depth.

Not in scope: the vault RLS backstop the auditor flagged as PLAUSIBLE was
**verified correct** on the TEST project (policy `resources_select_enrolled`
scopes rows to `batch_id is null OR batch_id = caller's active batch`) — no change
needed, though adding a JS `.or()` batch filter as fail-closed defense is a nice-to-have.

## Acceptance

- New `scripts/test-*.ts` if Claude supplies one for the rate-limit/enumeration
  behavior (ask in QUESTIONS if you want a contract first). Otherwise: `build` +
  `lint` clean, all existing suites green, and a manual check that (a) anonymous
  `POST /api/events` is rejected or capped, (b) the login request step no longer
  distinguishes member vs non-member emails.

## QUESTIONS:

(Codex: append questions here instead of guessing.)
