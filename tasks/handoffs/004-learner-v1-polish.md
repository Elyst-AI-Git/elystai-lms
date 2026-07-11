# Handoff 004 — Learner V1 polish: typography, login, layout, day materials, performance

**Owner:** Codex · **Branch:** `codex/004-learner-v1-polish` (from `dev`) · **Reviewer:** Claude
**Prerequisite:** implement **handoff 002 (YouTube video)** on this SAME branch FIRST —
`scripts/test-video.ts` must go green before starting the work below. 002 also fixes the
broken video embed the founder saw on staging (the Bunny iframe rendered with
`libraryId: 'undefined'`; after 002, YouTube takes precedence and Bunny without a
library id resolves to null instead of a broken URL).

**Test contracts (must pass):** `npx tsx scripts/test-video.ts` + all existing
`scripts/test-*.ts` + `npm run build` + `npm run lint` + the acceptance checklist below.

Founder feedback source: staging walkthrough on 2026-07-11. Mobile is the PRIMARY
target — 80–90% of learners will be on phones. Build and verify every change at
375px first, then desktop. Do not regress the existing floating bottom nav on mobile.

---

## 0. Product model change (context — schema already migrated)

Batch 1 reality:
- 2-week program. **Every day has exactly one video lesson.** Alternating days
  starting day 1 (offsets 0, 2, 4, …) are LIVE sessions (live_link + live_starts_at);
  the recording is uploaded to the same lesson afterwards (youtube_id). Other days
  are recorded-only.
- **Each day ships one or more PDFs** ("day materials") with a short description.
- **There are NO in-app submissions.** Work is shared in the batch WhatsApp group.
  The submissions UI must no longer be reachable from learner pages (leave the API
  routes and table alone — no deletions).

Schema (migrations 0012 + 0013, ALREADY applied to TEST — do not write migrations):
- `app.lessons.youtube_id text` (handoff 002).
- `app.resources.lesson_id uuid null` — when set, the resource is a day material
  shown on that lesson's page. NULL = general vault resource.
- `app.resources.description text null` — learner-facing blurb for each resource.

TEST is reseeded to this shape: 7 modules ("Area 1 — …" to "Area 7 — …") × 2 days
each = 14 lessons (day 1–14), each with youtube_id, live days with live_link,
one attached PDF per day with a description, plus 2 general vault resources.

## 1. Typography scale — systemic, token-based (do this first)

Founder: content type is "just too small" **everywhere**, echoing the same issue on
the marketing site. Body/supporting copy on learner surfaces + login must grow
~40–50%. Rules:

- Do NOT touch `src/app/globals.css` (verbatim brand file — hard boundary).
- Define an LMS type scale in `src/app/lms.css` as CSS variables + utility classes,
  e.g. `--lms-text-body`, `--lms-text-label`, `--lms-text-meta`, with utilities
  `.lms-body`, `.lms-label`, `.lms-meta` (name them sensibly). Sizes: what is
  currently rendering ~12–13px should become ~16–17px; ~14px → ~18px; keep
  line-height comfortable (1.5–1.6). Headings (text-h1/h2/h3) are fine as-is.
- Replace the small-type usages across **learner pages + login** (`src/app/learn/**`,
  `src/app/login/**`, `src/app/no-access/**`, `src/components/learn/**`) with the new
  utilities — every instance flagged below plus their siblings. NO hardcoded
  `text-[13px]`-style one-offs; everything through the scale so one variable tunes it.
- Admin pages are out of scope for the type bump.

## 2. Login page (`src/app/login/login-form.tsx`)

1. **Logo:** replace the icon+wordmark at top-left with `/logo-emerald.svg`
   (already in `public/` — founder-supplied). Note: the file is a square
   1200×1200 mark; render it noticeably larger than the current lockup
   (~44–52px tall) with correct alt "Elyst AI". If it contains the name and
   reads too small at that height, scale up until legible.
2. **Card fit:** the card currently overflows the viewport bottom (top padding +
   overflow = scroll to see the bottom edge). Reduce the outer vertical padding and
   the card's internal `py` so the whole card fits a 900px-tall desktop viewport
   without scrolling. On mobile it may scroll naturally — that's fine.
3. **Copy/content:**
   - Remove the "AI for Work members" eyebrow.
   - Keep "Welcome to your learning space."
   - Right panel headline → **"Make AI useful at your work."**
   - Bump per §1: the sub-line ("Sign in with the account…"), email label + input,
     the bottom "New to AI for Work? Register…" line, ALL error messages, and the
     whole OTP step (the "Enter your 6-digit code" heading, "We sent it to …",
     "Use a different email").
4. **Buttons:**
   - "Email me a sign-in code": remove the arrow icon. Its corner radius must
     EXACTLY match the "Continue with Google" button (both `rounded-md` — the
     primary currently uses the pill-ish `btn` radius; unify).
   - "Continue with Google": use the **official multi-color Google "G"** as an
     inline SVG (self-contained, no new deps, no emoji) instead of the current
     shield icon. Standard 18–20px G on the left.

## 3. Learner shell (sidebar, header, footer) — all learner pages

1. **Header:** remove the "Learning portal" text (top bar on desktop AND the
   wordmark row on lesson pages). The sidebar/bottom-nav carries identity now.
2. **Desktop sidebar** (`src/components/learn/desktop-sidebar.tsx`):
   - Background switches to the primary dark green (`--surface-dark` /
     `.surface-dark-hero` family tokens); invert text/icon colors accordingly
     (fg-on-dark, green accents for active state). Active item styling must still
     be clearly visible.
   - Top: the proper Elyst AI logo. `logo-emerald.svg` is emerald-on-transparent
     and will vanish on dark green — render it white via CSS
     (`filter: brightness(0) invert(1)`) for now, and leave a QUESTIONS note that a
     white SVG variant from the founder can replace the filter hack.
   - Kill the dead space between the nav items and the bottom: pin a bottom block
     to the sidebar's end containing (a) the v1/feedback note from §3.3 in compact
     form, (b) the signed-in user's name/email in muted small type, (c) Sign out.
     Nav stays at top.
3. **V1 + feedback footer** on every learner page (desktop: sidebar bottom block
   per above; mobile: a short footer above the bottom-nav clearance): a quiet,
   friendly one-liner in muted type — message to convey: this is **version 1** of
   the learning portal and learner feedback directly shapes it. Something like:
   "Learning portal v1 — you're using the very first version. Spotted something
   off or have an idea? We'd love to hear it." with a `mailto:` link (use
   `mailofelystai@gmail.com`). Exact copy is yours; keep it to 1–2 lines, no
   banner, no emoji.

## 4. Dashboard (`src/app/learn/page.tsx`)

1. Remove the "Cohort day 5" text in the header row (right side).
2. Eyebrow: "AI for Work · Cohort learning" → just **"AI for Work"**.
3. Stat cards: "Cohort rhythm" card now shows **which day of the cohort it is**
   (e.g. "Day 5 of 14" — total = number of distinct unlock days), not "Day 6 next".
4. **Remove the "Your schedule" aside entirely.** Move **"Your learning path"**
   (CoursePath) into that right column, so on desktop the whole dashboard fits one
   viewport without scrolling (learning plan left, learning path right). The
   next-live-session information should not be lost: fold a compact "Live today ·
   7:00 PM IST · Join" row INTO the learning-plan card when the next lesson is a
   live day (data is on the lesson: live_link/live_starts_at) — reuse the existing
   joinable/started logic from the old aside; keep the <30-min join gating.
5. "Up next in your plan" list: if a queued item is NOT unlocked yet (future day),
   render it visibly locked (lock icon, muted) and NOT clickable. Unlocked items
   in the list should be clickable links to their lesson (they currently are not).
6. Name personalization already works via `profiles.full_name` — add a fallback to
   `user.user_metadata.full_name` (Google users) before "Your learning plan".
7. Live-attended learners just mark the lesson done without watching — no change
   needed, but confirm mark-done works on a live-day lesson without playing video.
8. Type bump per §1 across every listed element (Day 1 label, lesson titles,
   Watch/Build/Read metas, "Work at your own pace", "Open Day 1 plan", day rows…).

## 5. Lesson page (`src/app/learn/[courseSlug]/lesson/[id]/page.tsx`)

1. Remove the "VIDEO" type badge (top right) and the header wordmark row (§3.1).
2. Video renders via 002 (`resolveVideoEmbed`) — YouTube player, heartbeat intact.
3. **Day materials section** (NEW, below the video/body): fetch
   `app.resources where lesson_id = <lesson>` and render each as a card:
   doc icon, title, `description`, opens `url_or_storage_path` in a new tab
   (`rel="noreferrer"`). This section replaces submissions as "the day's work".
4. **Kill the submission UI:** the task-type lesson layout must no longer render
   the upload form. Render `task_instructions` (markdown) + day materials instead.
   Do not delete `submission-form.tsx` or the API routes — just stop rendering.
5. Prev/next day-pager + "← Day 2"-style links: type bump per §1 (currently tiny).
6. Live-day lessons: keep showing the join link while joinable; after the session,
   the same lesson shows the recording (youtube_id) — this already falls out of the
   data model, just make sure both render cleanly together.

## 6. Resources page (`src/app/learn/vault/page.tsx`)

1. Same shell cleanup (§3) + type bump (§1).
2. Areas render one card per module — with the reseed there are 7 areas; day PDFs
   appear under their area plus the general resources. Show `description` under
   each resource title when present. Verify the grouping renders sensibly with
   14+ items on mobile (no giant wall — consider per-area collapse if it's long,
   your call).

## 7. Performance — in-code part (the other half is infra, already done)

Context: staging felt 3–4s per click. Main cause was Vercel (iad1, US East) ↔
Supabase (ap-southeast-1, Singapore) — every sequential DB/auth round trip cost
~300ms. Claude pinned Vercel functions to `sin1` via `vercel.json` (done). Your
half — cut the NUMBER of sequential round trips:

1. `requireEnrollment()` currently runs getUser → course → enrollments serially,
   then each page runs its own queries. You may NOT change auth.ts signatures
   (extend-only rule), but you MAY parallelize inside functions and pass data down.
2. Dashboard double-fetches lessons (once inside `getProgress`, once in the page).
   Restructure so lessons are fetched once and shared (e.g. export a
   `getProgressFromRows(...)` alongside `getProgress` — additive, keep the old one
   for other callers).
3. Audit each learner page: everything not order-dependent goes in `Promise.all`.
4. Do NOT cache auth/enrollment state, do NOT add middleware, keep `force-dynamic`
   (spec D5/D10 — hard boundaries).

Target: ≤3 sequential Supabase round trips per learner page render.

## Out of scope (do NOT touch)

Schema/migrations (0012+0013 already applied), admin UI (except nothing —
leave admin alone this handoff), Supabase dashboard config (Google provider —
founder), vercel.json (done), signup/registration, dark mode, new deps.

## Acceptance — manual (Claude verifies on review, mobile first)

| # | Check |
|---|---|
| 1 | 375px: login fits cleanly; type legible without zoom; Google G official; both buttons same radius; no arrow on OTP button |
| 2 | 375px + desktop: dashboard has no "Learning portal", no "Cohort day N" header text, no schedule aside; learning path sits in right column (desktop) and below plan (mobile); everything fits one desktop viewport |
| 3 | Cohort rhythm card reads "Day 5 of 14" (on 2026-07-12 IST: Day 6 of 14) |
| 4 | Locked queue items show lock + are not clickable; unlocked ones navigate |
| 5 | Lesson page: YouTube video plays (seeded id), heartbeat row appears after ~30s, day-materials card shows the PDF with its description, no submission UI anywhere |
| 6 | Live-day lesson (Day 5): join row appears when within 30 min of 7 PM IST; recording renders regardless; mark-done works without playing |
| 7 | Resources: 7 area cards, descriptions visible, sane on mobile |
| 8 | Sidebar: dark green, white logo, no dead space, v1/feedback note + sign out pinned bottom; mobile footer shows the v1 note |
| 9 | Greeting shows "Nihal's learning plan" for a profile with full_name (staging test user has it set) |
| 10 | All test suites + build + lint green; no hardcoded font sizes introduced |

## QUESTIONS:

(Codex: append questions here instead of guessing.)
