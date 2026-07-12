# Testing & quality strategy

Two audiences for this doc: (1) what we've *actually* done and where the gaps are,
and (2) how a 5–10 person team would do it, so you can decide what's worth
borrowing with our AI-agent workflow instead of headcount.

---

## Part 1 — What we've applied so far (the honest ledger)

### Applied ✅
| Area | What exists |
|---|---|
| **Unit tests** | 6 pure-logic suites, 78 assertions (`scripts/test-*.ts`), run with `tsx`. Cover drip math, access rules, plan selection, storage validation, event taxonomy, video embed. No framework — deliberately light. |
| **Integration / security** | `scripts/test-campaign.ts` — 34 assertions across 4 personas (anon, enrolled, outsider, admin) hitting real HTTP + DB + RLS. Re-runnable regression gate. |
| **Security method** | STRIDE + OWASP abuse-cases (see `testing/001-full-test-campaign.md`). 12 abuse-cases, all pass. |
| **RLS** | Row-Level Security is the real boundary; drip is app-layer pacing on top. Probed with `scripts/probe-rls.ts`. |
| **Manual walkthroughs** | Screenshot passes at 390px + 1280px before merges. |
| **Perf** | Region pinning (Vercel ↔ Supabase co-location), sub-second page latency measured. |

### Findings so far
- **1 real bug caught & fixed:** the heartbeat route accepted telemetry for *locked*
  lessons while the progress route correctly blocked it. Drip parity restored.
- XSS is contained: `rehype-sanitize` strips `<script>`/`onerror`/`javascript:`.
- No secrets in event payloads (verified on the events path).

### What we're missing (gaps) ⚠️
1. **No CI** — tests only run when someone remembers. → *Fixing now:* `.github/workflows/ci.yml` runs lint + unit suites + build on every push.
2. **No browser E2E automation** — journeys are checked by hand/screenshot, not a script that clicks through login → lesson → mark-done and asserts. → *Recommended next:* Playwright (free).
3. **No error tracking in prod** — if a learner hits a 500 Monday morning, we find out only if they tell us. → *Recommended:* Sentry free tier.
4. **No uptime/synthetic monitor** — nothing pings the site every minute. → *Recommended:* Better Stack / UptimeRobot free tier.
5. **`/api/events` unauthenticated writes** (MEDIUM) & **OTP email enumeration** (LOW) — tracked in handoff 003, deferred to pre-prod.
6. **Accessibility** not formally audited (keyboard nav, contrast, screen-reader labels are mostly present but unverified).

### Suggestions to raise the bar (in priority order)
1. CI gate (doing now) — stops a broken build reaching `dev`.
2. Playwright smoke suite — 3–4 critical journeys, run in CI headless.
3. Sentry — 5-minute setup, catches the errors real users hit.
4. Uptime monitor + a status check on `/login`.
5. Close handoff-003 security items before prod.
6. One Lighthouse/axe pass for a11y + SEO score.

---

## Part 2 — How a 5–10 person team tests (and our AI equivalent)

A real team splits testing across roles and *stages*. Here's the map, and how we
replicate each with agents instead of people. **We don't need all of it** — the
"Adopt now?" column is my honest recommendation for a 2-week launch.

| Team role / stage | What they do | Our AI/tooling equivalent | Adopt now? |
|---|---|---|---|
| **Developer (unit)** | Writes tests alongside code (TDD) | Claude writes the failing test first, Codex implements | ✅ already doing |
| **CI/DevOps** | Every push runs the suite automatically; red = no merge | GitHub Actions (free) | ✅ **wiring up now** |
| **QA engineer (E2E)** | Scripts full user journeys in a browser | Playwright, driven by Claude via the Preview tools | ◐ recommended, light |
| **QA (manual/exploratory)** | Clicks around trying to break it | Claude does screenshot walkthroughs; you do device testing | ✅ already doing |
| **Security engineer** | Threat models, pentests | STRIDE campaign + abuse-cases (done); close handoff-003 | ✅ mostly done |
| **SRE (monitoring)** | Dashboards, alerts, on-call | Sentry + uptime monitor (free tiers) | ◐ recommended |
| **Perf engineer** | Load tests, Core Web Vitals | Lighthouse CI (free); k6 for load (probably overkill at your scale) | later |
| **Release manager** | Staging → prod promotion, rollback plan | `dev` branch = staging; documented pre-prod checklist | ✅ have it |
| **Product/UAT** | "Does it do the business thing?" | The 2-min drip walkthrough you asked for = compressed UAT | ✅ set up now |

### The "ideal flow" for *us* (small, AI-driven)
```
1. Claude writes failing test  →  2. Codex implements on codex/* branch
        ↓
3. Push → GitHub Actions runs lint + unit + build (auto)      [NEW]
        ↓
4. Claude reviews diff + runs test-campaign.ts against TEST
        ↓
5. Claude screenshot-walkthrough at 390px + 1280px
        ↓
6. Merge to dev  →  Vercel auto-deploys a staging preview
        ↓
7. You do the 2-minute drip walkthrough on a real phone (compressed UAT)
        ↓
8. Pre-prod checklist  →  promote dev → main  →  prod deploy
        ↓
9. Sentry + uptime monitor watch prod                          [RECOMMENDED]
```

---

## Part 3 — Tools: free vs paid (so you know the landscape)

You asked to understand the market even if we don't buy. Here's the honest picture.

| Need | Free (what we'd use) | Paid (what teams buy) | Verdict for us |
|---|---|---|---|
| CI | **GitHub Actions** (2,000 min/mo free) | CircleCI, Buildkite | Free is plenty |
| Browser E2E | **Playwright** (free, open source) | — | Free is the *best* option; nobody pays for the runner |
| E2E at scale / recording | Playwright | **Cypress Cloud, BrowserStack, Sauce Labs** ($$) | Skip — for big test matrices across many real devices |
| Error tracking | **Sentry free** (5k errors/mo) | Sentry Team, Datadog | Free tier fine for launch |
| Uptime | **UptimeRobot / Better Stack free** | Pingdom, Datadog Synthetics | Free fine |
| Perf/CWV | **Lighthouse, PageSpeed Insights** (free) | SpeedCurve, Calibre | Free fine |
| Load testing | **k6 open-source** | k6 Cloud, Gatling | Skip until you have 100s concurrent |
| Session replay | PostHog free tier | **FullStory, LogRocket, Hotjar** ($$) | *Nice-to-have* — watch real learners struggle; PostHog free is worth a look post-launch |
| Accessibility | **axe DevTools (free), Lighthouse** | axe paid, Deque | Free fine |

**Bottom line:** for your scale, the entire "professional QA stack" is achievable
on **free tiers** — Actions + Playwright + Sentry + UptimeRobot + Lighthouse. The
paid tools exist for large device matrices, high error volumes, and compliance —
none of which apply to a 2-week cohort. Don't spend money here.

---

## Part 4 — Minimal free setup (what I'm wiring up now)

1. **`.github/workflows/ci.yml`** ✅ created — runs on every push to `dev`/`main`.
   - Requires two repo secrets (both are the TEST project's *public* values, safe
     to expose, kept as secrets only to keep keys out of the file):
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
     Add via GitHub → Settings → Secrets and variables → Actions.
2. **Playwright** (recommended next, ~30 min): `npm i -D @playwright/test`, one
   smoke spec that logs in a probe user and asserts the dashboard renders, wired
   into the same CI file. I can do this on request.
3. **Sentry** (recommended, ~15 min, do before prod): `npx @sentry/wizard@latest -i nextjs`.
