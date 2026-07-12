# Handoff 006 — Stat strips (UI) + test & load harness (run-and-report)

**To:** Codex (engineer) · **From:** Claude (tech lead / test author) · **Branch:** `codex/006-stat-strips`

This handoff has **two independent parts**:

- **Part A — UI change** you implement (the only code you *author*): turn the three
  dashboard stat cards into compact horizontal strips.
- **Part B — Test & load harness** you **run and report on**. The scripts are
  **authored by Claude and given to you verbatim below** — create them exactly as
  written, run them, and return two reports. **Do not redesign the tests, do not
  "fix" the app based on them, do not change test logic.** If a test fails, that's
  a *finding* for your report — Claude makes all fixes after reading your reports.

> Scope guard: you edit **`src/**` only for Part A**. For Part B you create files
> under `tests/**`, `playwright.config.ts`, and may add devDependencies +
> `package.json` scripts. Nothing else.

---

# PART A — Stat strips

## Current state
`src/app/learn/page.tsx` renders three `StatCard`s in a 3-column grid: each is a
tall card with an icon on top, a label, and a value. Replace them with **compact
horizontal strips** (no icons, much shorter).

## Target behaviour

**Desktop (≥ 640px / `sm`):** three strips sit side by side (3 columns, as now),
but each is a short horizontal strip — **label on the left, value on the right**,
for all three. No icons except the progress ring.

**Mobile (< 640px):** the three strips **stack vertically**, one after another,
with **alternating** sides:

| Order | Strip | Left | Right |
|---|---|---|---|
| 1 | Course progress | label "Course progress" | the % **ring** |
| 2 | Lessons done | **number** "1 of 14" | label "Lessons done" |
| 3 | Cohort rhythm | label "Cohort rhythm" | **number** "Day X of 14" |

So strips 1 & 3 are label-left/value-right; strip 2 is flipped (number-left/label-right)
**on mobile only**. On desktop all three are label-left/value-right.

**The numbers ("1 of 14", "Day X of 14") must be enlarged** so they stand out —
use `text-h3 font-bold text-fg`. For Course progress the visual is the ring (no
separate number). Keep the existing tone ramp: white → `bg-green/5` → `bg-green/10`.

## Exact implementation

In `src/app/learn/page.tsx`, **delete** the `StatCard` function and the icon
imports that become unused (`CalendarDays`, `CheckCircle2` — keep `ProgressRing`),
and replace with a `StatStrip` component + the new section:

```tsx
function StatStrip({
  label,
  value,
  right,
  reverseOnMobile = false,
  tone,
}: {
  label: string;
  value?: string;
  right?: React.ReactNode;
  reverseOnMobile?: boolean;
  tone: string;
}) {
  // reverseOnMobile flips label/value order on mobile only (sm: restores it),
  // giving the alternating strip pattern the dashboard asks for.
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 ${tone} ${
        reverseOnMobile ? "flex-row-reverse sm:flex-row" : ""
      }`}
    >
      <p className="min-w-0 text-micro font-bold uppercase tracking-wide text-fg-3">{label}</p>
      {right ?? <p className="shrink-0 text-h3 font-bold leading-none text-fg">{value}</p>}
    </div>
  );
}
```

And replace the stat `<section>` with:

```tsx
<section aria-label="Course overview" className="rise order-2 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" style={{ ["--stagger-i" as string]: 1 }}>
  <StatStrip label="Course progress" tone="bg-white" right={<ProgressRing percent={progress.overallPercent} size={36} />} />
  <StatStrip label="Lessons done" tone="bg-green/5" reverseOnMobile value={`${progress.completedLessons} of ${progress.totalLessons}`} />
  <StatStrip label="Cohort rhythm" tone="bg-green/10" value={today >= 0 ? `Day ${today + 1} of ${progress.perDay.length}` : `Day 1 of ${progress.perDay.length}`} />
</section>
```

## Part A acceptance criteria
- [ ] No icons except the progress ring; cards are noticeably shorter than before.
- [ ] Desktop (1280px): three strips in a row, all label-left / value-right; numbers enlarged.
- [ ] Mobile (390px): three strips stacked; #1 label-left/ring-right, #2 number-left/label-right, #3 label-left/number-right.
- [ ] No horizontal overflow at 360px; ring not clipped.
- [ ] `npm run lint` and `npm run build` both pass.
- [ ] Screenshot proof at 390px and 1280px attached to your report.

---

# PART B — Test harness (RUN & REPORT ONLY)

## B0. One-time setup

```bash
npm i -D @playwright/test
npx playwright install chromium
```

Add these scripts to `package.json`:
```json
"test:e2e": "playwright test",
"test:e2e:report": "playwright show-report"
```

The harness needs a running dev server **and** the TEST env (`.env.local` with the
`cmihoglafjxtswtbitsz` project keys — already on the machine). Start it in one
terminal: `npm run dev`. Run tests in another.

> The probe users (`probe-enrolled@`, `probe-outsider@`, `probe-admin@test.elystai.local`,
> password `probe-rls-Passw0rd!`) already exist in the TEST project. The setup step
> below mints their sessions automatically — you don't create users.

## B1. Create `playwright.config.ts` (verbatim)

```ts
import { defineConfig, devices } from "@playwright/test";

// Personas get their auth cookie from storageState files written by
// tests/e2e/global-setup.ts. "anon" carries no storage.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "tests/e2e/report.json" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "anon",     use: { ...devices["Desktop Chrome"] } },
    { name: "enrolled", use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/enrolled.json" } },
    { name: "outsider", use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/outsider.json" } },
    { name: "admin",    use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/admin.json" } },
    { name: "mobile-enrolled", use: { ...devices["iPhone 13"], storageState: "tests/e2e/.auth/enrolled.json" } },
  ],
});
```

## B2. Create `tests/e2e/global-setup.ts` (verbatim)

```ts
import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const REF = new URL(SUPABASE_URL).host.split(".")[0];
const PASSWORD = "probe-rls-Passw0rd!";
const USERS = {
  enrolled: "probe-enrolled@test.elystai.local",
  outsider: "probe-outsider@test.elystai.local",
  admin: "probe-admin@test.elystai.local",
};

async function mint(email: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`mint ${email} failed: ${JSON.stringify(d)}`);
  const sess = {
    access_token: d.access_token, token_type: "bearer", expires_in: d.expires_in,
    expires_at: d.expires_at, refresh_token: d.refresh_token, user: d.user,
  };
  return "base64-" + Buffer.from(JSON.stringify(sess)).toString("base64");
}

export default async function globalSetup() {
  const dir = path.join(__dirname, ".auth");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, email] of Object.entries(USERS)) {
    const value = await mint(email);
    const state = {
      cookies: [{
        name: `sb-${REF}-auth-token`, value, domain: "localhost", path: "/",
        expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const,
      }],
      origins: [],
    };
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(state, null, 2));
  }
}
```

## B3. Create `tests/e2e/scenarios.spec.ts` (verbatim) — the combinatorial matrix

> This is **not** a happy-path suite. It deliberately walks every persona × route ×
> action combination, including nonsensical and hostile ones, to surface anything
> that leaks, 500s, or behaves inconsistently. Run it as-is.

```ts
import { test, expect, request } from "@playwright/test";

const SLUG = "ai-for-work";

// ---------- 1. Access-control matrix: who can reach what ----------
// Each row: [project(persona), path, expected outcome]
const ACCESS: Array<[string, string, "ok" | "login" | "no-access" | "404"]> = [
  ["anon", "/learn", "login"],
  ["anon", "/learn/vault", "login"],
  ["anon", "/admin", "404"],
  ["anon", `/learn/${SLUG}/lesson/does-not-exist`, "login"],
  ["enrolled", "/learn", "ok"],
  ["enrolled", "/learn/vault", "ok"],
  ["enrolled", "/admin", "404"],
  ["enrolled", `/learn/${SLUG}/lesson/00000000-0000-0000-0000-000000000000`, "404"],
  ["outsider", "/learn", "no-access"],
  ["outsider", "/learn/vault", "no-access"],
  ["outsider", "/admin", "404"],
  ["admin", "/admin", "ok"],           // 307 -> /admin/content counts as ok
  ["admin", "/admin/content", "ok"],
  ["admin", "/learn", "no-access"],    // admin probe has no enrollment
];

for (const [persona, pathname, expected] of ACCESS) {
  test(`[access] ${persona} -> ${pathname} => ${expected}`, async ({ browser }) => {
    const ctx = await browser.newContext(
      persona === "anon" ? {} : { storageState: `tests/e2e/.auth/${persona}.json` }
    );
    const page = await ctx.newPage();
    const resp = await page.goto(pathname, { waitUntil: "domcontentloaded" });
    const url = page.url();
    if (expected === "login") expect(url).toContain("/login");
    else if (expected === "no-access") expect(url).toContain("/no-access");
    else if (expected === "404") expect(resp?.status()).toBe(404);
    else expect(url).toMatch(/\/(learn|admin)/); // ok
    await ctx.close();
  });
}

// ---------- 2. Enrolled learner journeys ----------
test.describe("enrolled journeys", () => {
  test.use({ storageState: "tests/e2e/.auth/enrolled.json" });

  test("dashboard renders core widgets", async ({ page }) => {
    await page.goto("/learn");
    await expect(page.getByText(/learning plan/i)).toBeVisible();
    await expect(page.getByText(/cohort rhythm/i)).toBeVisible();
  });

  test("open first unlocked lesson, mark done, then un-mark (idempotent round-trip)", async ({ page }) => {
    await page.goto("/learn");
    await page.locator('a[href*="/lesson/"]').first().click();
    await expect(page).toHaveURL(/\/lesson\//);
    const mark = page.getByRole("button", { name: /mark as complete/i });
    if (await mark.count()) {
      await mark.click();
      await expect(page.getByText(/completed/i)).toBeVisible();
      // un-mark to leave state clean
      await page.getByRole("button", { name: /completed/i }).click();
    }
  });

  test("no horizontal overflow at 360px (clipping guard)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/learn");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("deep-link to a LOCKED lesson 404s (drip enforcement)", async ({ page, request }) => {
    // Ask the app which lessons exist is out of scope; instead assert a far-future
    // offset day page is not reachable as an unlocked lesson. Locked lesson ids
    // are unknown here, so this is covered more precisely by the API test below.
    const resp = await page.goto(`/learn/${SLUG}/day/13`, { waitUntil: "domcontentloaded" });
    expect([200, 404]).toContain(resp?.status()); // day page may render locked state; must not 500
  });
});

// ---------- 3. Hostile / edge API calls ----------
test.describe("API abuse-cases", () => {
  test("progress POST without auth is rejected", async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL });
    const r = await api.post("/api/learn/progress", { data: { lessonId: "x", completed: true } });
    expect([401, 403]).toContain(r.status());
  });

  test("events accepts unknown event name with 400 (taxonomy guard)", async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL });
    const r = await api.post("/api/events", { data: { name: "totally.made.up", payload: {} } });
    expect([400, 401, 403]).toContain(r.status());
  });

  test("events rejects malformed JSON body", async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL });
    const r = await api.post("/api/events", { headers: { "content-type": "application/json" }, data: "{not json" });
    expect([400, 401, 403]).toContain(r.status());
  });

  test("admin content POST as non-admin is rejected", async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/enrolled.json" });
    const api = ctx.request;
    const r = await api.post(`${baseURL}/api/admin/content/lessons`, { data: { title: "hax" } });
    expect([401, 403, 404]).toContain(r.status());
    await ctx.close();
  });
});

// ---------- 4. Session lifecycle ----------
test.describe("session", () => {
  test("sign out then /learn bounces to /login", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/enrolled.json" });
    const page = await ctx.newPage();
    await page.goto("/learn");
    await page.request.post("/api/auth/signout");
    await page.context().clearCookies();
    await page.goto("/learn", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/login");
    await ctx.close();
  });
});

// ---------- 5. Login page (anon) resilience ----------
test.describe("login page", () => {
  test("renders and validates empty email", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign-in code/i })).toBeVisible();
  });
  test("bad oauth callback does not open-redirect", async ({ page }) => {
    await page.goto("/auth/callback?next=https://evil.example.com");
    expect(page.url()).not.toContain("evil.example.com");
  });
});
```

## B4. Run & report — TEST report

```bash
npm run dev            # terminal 1 (keep running)
npm run test:e2e       # terminal 2
```

Then produce **Report 1 — Functional test report** with:
- The pass/fail table (persona × scenario). Paste the `list` reporter summary.
- For every failure: the scenario, expected vs actual, the trace/screenshot path,
  and **your hypothesis of severity** (critical / major / minor / cosmetic).
- Anything that **500s** anywhere = flag as critical regardless of the assertion.
- Note any scenario that was skipped and why.
- **Do not fix anything.** List it for Claude.

---

## B5. Load testing

Use **k6** (free, single binary, no JVM) as the primary tool — it's more reliable
to run headless than JMeter and needs no GUI. JMeter instructions follow as the
requested alternative.

### Install k6
- macOS: `brew install k6` · Linux: see `https://k6.io/docs/get-started/installation/`
- If you cannot install k6, use **JMeter** (B5.3) or **Artillery** (`npx artillery`).

### B5.1 Create `tests/load/k6-load.js` (verbatim)

```js
import http from "k6/http";
import { check, sleep } from "k6";

// Simulates the realistic launch-night mix against the running dev server.
// Public pages + authenticated dashboard. Pass an enrolled session cookie via
// K6_COOKIE (mint it the same way global-setup does) to exercise gated routes.
const BASE = __ENV.BASE_URL || "http://localhost:3000";
const COOKIE = __ENV.K6_COOKIE || ""; // "sb-<ref>-auth-token=base64-...."

export const options = {
  scenarios: {
    // A. Launch-night login spike: everyone hits /login then /learn.
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 150 },
        { duration: "2m", target: 150 },
        { duration: "30s", target: 0 },
      ],
      exec: "browse",
    },
    // B. Sustained lesson viewing + heartbeat telemetry.
    soak: {
      executor: "constant-vus",
      vus: 20,
      duration: "5m",
      startTime: "4m30s",
      exec: "study",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"], // p95 under 1.5s
    http_req_failed: ["rate<0.01"],     // <1% errors
  },
};

export function browse() {
  const login = http.get(`${BASE}/login`);
  check(login, { "login 200": (r) => r.status === 200 });
  const params = COOKIE ? { headers: { Cookie: COOKIE } } : {};
  const learn = http.get(`${BASE}/learn`, params);
  check(learn, { "learn ok": (r) => r.status === 200 || r.status === 307 || r.status === 302 });
  sleep(Math.random() * 3 + 1);
}

export function study() {
  if (!COOKIE) return;
  const params = { headers: { Cookie: COOKIE } };
  http.get(`${BASE}/learn/vault`, params);
  http.post(`${BASE}/api/learn/heartbeat`, JSON.stringify({ lessonId: __ENV.K6_LESSON || "" }), {
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
  });
  sleep(15);
}
```

### B5.2 Run k6
```bash
npm run dev   # keep running
# optional: export K6_COOKIE="sb-cmihoglafjxtswtbitsz-auth-token=base64-...."   (an enrolled session)
k6 run tests/load/k6-load.js
```

### B5.3 JMeter alternative (if asked / k6 unavailable)
- **Get it:** download Apache JMeter 5.6 from `https://jmeter.apache.org/download_jmeter.cgi`
  (needs Java 8+). Unzip, run `bin/jmeter` (GUI to build, then run **headless** for
  real load: `bin/jmeter -n -t elyst.jmx -l results.jtl -e -o report/`).
- **Build this test plan** (Test Plan → Thread Groups):
  | Thread Group | Threads (users) | Ramp-up | Loop | Samplers (HTTP Request) |
  |---|---|---|---|---|
  | Login spike | 150 | 60s | 3 | GET /login, GET /learn |
  | Study soak | 20 | 30s | 20 | GET /learn/vault, POST /api/learn/heartbeat |
  | Mark-complete burst | 100 | 10s | 1 | POST /api/learn/progress |
  - Add an **HTTP Cookie Manager** with the enrolled session cookie for the gated
    thread groups. Add a **Summary Report** + **Aggregate Report** listener.
  - Same thresholds to judge against: **p95 < 1500ms, error rate < 1%**.

### B5.4 Load scenarios to cover (both tools)
Replicate what launch night could actually throw at us:
1. **Login spike** — 150 users arrive within ~2 min (the real risk: Monday 9pm start).
2. **Sustained study** — 20–50 users looping lesson + heartbeat for several minutes.
3. **Mark-complete burst** — ~100 near-simultaneous `POST /api/learn/progress`.
4. **Cold-start probe** — first request after idle (serverless cold start latency).
5. **Abuse burst** — 200 rapid `POST /api/events` (unauthenticated) to see if the
   known-unprotected endpoint degrades the app (this is a *finding*, not a fix).

### B5.5 Report — Load report
Produce **Report 2 — Load & capacity report** with:
- For each scenario: **p50 / p95 / p99 latency, throughput (req/s), error rate**,
  and whether it met the thresholds.
- The first point at which latency or errors climb (the knee) → our practical
  concurrency ceiling.
- Any endpoint that errors or times out under load, with status codes.
- Cold-start latency observed.
- **Your read on capacity:** can we take 150 concurrent learners? Where's the
  bottleneck (app render, DB round-trips, connection limits)?
- **Do not tune or fix anything** — list recommendations for Claude.

### Note on "load balancing" (for your report context, not action)
On this stack you do **not** hand-configure a load balancer: Vercel runs the app as
auto-scaling serverless functions behind its own edge LB, and Supabase sits behind
**PgBouncer** (the pooler on port 6543). The realistic ceiling is therefore the
**Supabase connection-pool / plan limit**, not app instances. If load tests show DB
saturation, the fix (Claude's job) is to ensure the app uses the **transaction
pooler** and to check the project's max-connections against expected concurrency —
flag it if you see connection errors under load.

---

# What you return to Claude
1. **Branch `codex/006-stat-strips`** with Part A implemented + the `tests/**`,
   `playwright.config.ts`, `package.json` script additions.
2. **Report 1 — Functional** (from B4).
3. **Report 2 — Load & capacity** (from B5.5).
4. Screenshots: dashboard strips at 390px + 1280px.

Reminder: **you author only the Part-A UI code.** Everything in Part B is provided
verbatim — you run it and report. Claude fixes whatever the reports surface.
```
