# Test Campaign 001 — full pre-launch pass

**Run:** 2026-07-12 · **By:** Claude (test lead) · **Branch:** `dev` @ 74d7a40
**Environment:** dev server (localhost:3000) + TEST Supabase (`cmihoglafjxtswtbitsz`, ap-southeast-1)
**Personas:** anon · enrolled (`probe-enrolled`) · outsider (`probe-outsider`, authed no enrollment) · admin (`probe-admin`)
**Drip state on run day:** batch `starts_on` 2026-07-07 → today = day offset 5 → days 0–5 unlocked, 6–13 locked.

Methodology from `.agents/addy-skills/skills/{test-driven-development,security-and-hardening,code-review-and-quality}`: Prove-It (reproduce before fix), STRIDE + abuse-cases, boundary/edge coverage.

## Result summary

| Category | Scenarios | Result |
|---|---|---|
| 1. Unit | 78 assertions / 6 suites | ✅ all pass |
| 2. Integration | 12 assertions | ✅ all pass |
| 3. E2E | full journey (HTTP + prior visual) | ✅ pass |
| 4. Automation | `scripts/test-campaign.ts` (34) re-runnable | ✅ pass |
| 5. Manual business flow | cohort lifecycle | ✅ pass |
| 6. Security | 12 abuse-cases | ✅ pass (**1 bug found + fixed**) |
| 7. Business functionality | 8 checks | ✅ all pass |
| 8. Monitoring / performance | latency + logging | ✅ healthy |

**Bug found & fixed this run:** heartbeat route accepted telemetry for **locked** lessons (progress route already 403'd). Drip-boundary parity restored (74d7a40). Telemetry-only, no data leak.

---

## 1. Unit testing — 78 assertions, 6 pure-logic suites (`npx tsx scripts/test-*.ts`)

- **drip** (18): IST midnight boundaries, GCC evening, late-joiner, offset 13, `unlockDate`/`isUnlocked`/`currentDayNumber`.
- **access** (12): resolveAccess anon→login, active→ok, pending/cancelled/refunded/other-course/case-sensitive `Active`/empty→denied.
- **plan** (24): next-lesson selection, queued slice, headline/badge modes (preview/catching-up/today/none), day partitioning, duration format, the `&apos;` regression guard.
- **storage** (10): submission image validate — accepts jpeg/png/webp/gif, rejects pdf/svg/empty-type, 5MB boundary (exact vs +1), type-before-size ordering.
- **events** (6): taxonomy unique, dot-namespaced, snake_case, namespace-matches-nesting, auth-name stability.
- **video** (8): youtube-nocookie precedence, bunny fallback, missing library→null, rejects pasted URLs / slashes / empty id.

## 2. Integration testing — API + DB + RLS (12/12)

Auth routing: anon `/learn`→`/login`; enrolled→200; outsider→`/no-access`; anon `/admin`→404; non-admin `/admin`→404; admin `/admin`→`/admin/content`.
Mutation round-trips (user client, RLS exercised): mark-done unlocked→2xx → `lesson_progress` row created → `learner.lesson.completed` event logged → un-mark→2xx → row removed. Heartbeat unlocked→2xx.

## 3. E2E testing — full learner journey

Exercised end-to-end at the HTTP layer (authoritative): unauthenticated visit → redirect to `/login` (also confirmed in-browser); authenticated dashboard render → open unlocked lesson → mark complete (persisted + event) → un-mark (reverted). Page rendering across dashboard / lesson / vault visually verified at 390px and 1440px in prior review passes with live sessions. Signed-out session correctly cannot reach `/learn`.

## 4. Automation testing — `scripts/test-campaign.ts`

Single re-runnable harness: mints 4 persona sessions, runs 34 assertions across integration + security + business, self-cleans mutated state, tears down with signout last. Green: **34 passed, 0 failed**. Excluded from `next build` (tsconfig `scripts/`), run on demand.

## 5. Manual business-flow testing — cohort lifecycle

- **Enroll → access:** only `status === "active"` for the course grants `/learn`; outsider (no enrollment) → `/no-access`; wrong-course active enrollment → denied (unit + integration).
- **Drip pacing:** today day-5 → lessons 0–5 open, 6–13 locked; locked lesson page 404s, locked mutation 403s.
- **Complete a day:** mark-done writes the only completion truth; progress recomputes (3/14 → 21%, "3 of 14").
- **Materials:** each of 14 days has ≥1 attached PDF; areas 1–3 open, 4–7 drip-locked in vault.
- **Admin content op (Monday flow):** admin reaches `/admin/content`; lesson `youtube_id` + resource `description`/`lesson_id` editable (schema verified; admin write path 403s for non-admins).

## 6. Security testing — STRIDE + OWASP abuse-cases (12/12)

| Threat | Test | Result |
|---|---|---|
| Elevation (time) | locked lesson page deep-link | 404 ✅ |
| Elevation (time) | mark-done locked via API | 403 ✅ |
| Elevation (time) | **heartbeat locked via API** | was 200 → **fixed to 403** ✅ |
| Broken access / IDOR | outsider mark-done | 4xx, no persist ✅ |
| Elevation (role) | non-admin / anon POST admin content | 403 ✅ |
| Tampering | arbitrary event name to `/api/events` | 400 ✅ |
| Tampering | malformed JSON to `/api/events` | 400 ✅ |
| Open redirect | `/auth/callback` bad code / evil `next=` | →`/login?error=oauth`, no external redirect ✅ |
| XSS (stored) | `<script>`/`onerror`/`javascript:` in lesson body | all stripped by rehype-sanitize, safe text kept ✅ |
| Session | signout | 303→`/login`, cookie expired, session revoked ✅ |

**Known, tracked (handoff 003, not fixed this run):** `/api/events` accepts unauthenticated service-role writes (rate-limit/DoS-pollution — MEDIUM); OTP request step enumerates members (LOW). Both pre-existing, queued for the pre-prod hardening branch. Service-role client confirmed server-only (not in client bundle).

## 7. Business-functionality testing (8/8)

Cohort rhythm "Day 6 of 14"; day-0 lesson visible; vault renders; 7 areas / 14 lessons / 14 day-materials seeded; progress math 3/14→21% and "3 of 14" exact.

## 8. Monitoring / performance (dev-mode, this machine → Singapore DB)

- `/learn` ~0.7–1.3s · `/learn/vault` ~0.5–0.7s · lesson ~0.6–0.9s · heartbeat API ~0.45s.
- All sub-second in dev with the DB a continent away → no pathological query fan-out. Prod co-locates Vercel `sin1` + Supabase Singapore, so materially faster. Latency floor here is DB round-trip distance, not app work.
- **Observability:** every learner/admin mutation logs exactly one namespaced event (`interaction_events`); auth events (`login_succeeded/failed/signed_out`) present; no OTP/token/PII in payloads (confirmed on the events path).

## Follow-ups

1. Handoff 003 (events rate-limit + OTP enumeration) before prod cutover.
2. Re-run `scripts/test-campaign.ts` after any auth/drip/admin change (it's the regression gate for those).
3. Real-device Bunny/YouTube playback + founder admin walkthrough remain in T11.
