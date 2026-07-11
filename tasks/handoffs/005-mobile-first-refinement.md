# Handoff 005 - Mobile-first refinement pass (founder device walkthrough)

**Owner:** Codex · **Branch:** `codex/005-mobile-refinement` (from a freshly pulled `dev`) · **Reviewer:** Claude
**Source:** founder walkthrough on a real iPhone (Safari) + desktop, 2026-07-11.
**Gates:** every `scripts/test-*.ts` suite + `npm run build` + `npm run lint` green.

## How to work this handoff (read first)

1. **Verify in a real browser as you go.** Set up the Playwright MCP
   (`npx @playwright/mcp@latest` — add it to your MCP config) or use whatever
   browser tooling you have. Test at **390×844 (primary), 768×1024, 1440×900**
   after every change. The dev server runs on `http://localhost:3000`
   (`npm run dev`). Screenshot → inspect → fix → re-check. Do not mark an item
   done without having SEEN it correct at 390px.
2. **Read `.agents/ui-ux-pro-max/SKILL.md`** (design intelligence: styles,
   type scales, UX guidelines) and `.agents/addy-skills/skills/frontend-ui-engineering/SKILL.md`.
   Apply their mobile guidance. If useful, research current mobile-web UI best
   practices (touch targets, thumb zones, type ramp on small screens).
3. **You are ENCOURAGED to go beyond this list**: polish anything that looks
   off at 390px, as long as it does not conflict with an explicit item below,
   the design tokens (brand colors only, lucide icons, light-only), or the
   hard boundaries in AGENTS.md. List every extra change you made at the
   bottom of this file under "EXTRAS:" so Claude can review them.
4. Auth for browser testing: sign in at `/login` with email OTP is not
   possible headlessly — instead ask Claude via QUESTIONS, or test signed-out
   pages + use the seeded session flow Claude uses. Simplest: run against
   your own session cookie obtained by logging in once manually in a headed
   browser and reusing its storage state.

## A. Bugs (fix first)

1. **Horizontal clipping on phones.** On a real iPhone (~390–430px), the
   right edge of cards is cut off: the "Catching up" pill and queue-item
   titles run off-screen (see founder screenshot). Something inside the plan
   card forces content wider than the viewport (suspects: `whitespace-nowrap`
   on the badge, a missing `min-w-0` on a flex/grid child, fixed min-width in
   the queue list). Diagnose properly with devtools (`document.documentElement.scrollWidth`
   vs `innerWidth` at 390px AND with real content), fix the root cause, and
   verify zero horizontal scroll on /learn, /learn/vault, and a lesson page.
2. **Bottom nav missing on lesson pages** (`src/components/learn/bottom-nav.tsx`
   returns null on `/lesson/` routes — the old "focus mode"). Remove that
   special case: the bottom nav shows on EVERY learner page now.
3. **Old text wordmark on mobile header.** The mobile header (learn layout)
   still renders the text "Elyst AI"; replace with `/logo-wordmark.svg`
   (~h-9, emerald version — light background here, no invert filter).

## B. Dashboard (`/learn`)

4. **Remove the "Catching up" badge everywhere** (all breakpoints). Delete the
   badge branch from `planHeadline` usage in the UI — keep the pure function
   in plan.ts (tests cover it) but stop rendering the pill. Day badge also
   goes — no pill on the plan card at all.
5. **Stat cards row (Course progress / Lessons done / Cohort rhythm):**
   - Move directly under the "<Name>'s learning plan" H1, full page width on
     mobile, BEFORE everything else.
   - **Perfect internal alignment**: all three cards share one identical
     internal layout — icon/ring slot (fixed height), then label, then value —
     so the three labels sit on the same baseline and the three values sit on
     the same baseline at every viewport. Use a shared component, not three
     hand-rolled divs. (Founder: "just a mess… very misaligned.")
   - **Colors form a ramp**: left = white (as now), right = the existing
     `green/10` tint (as now), middle = a pastel exactly between them — use an
     existing token at low opacity (e.g. `bg-green/5` or `bg-emerald/5`),
     NOT a new hex.
6. **Plan card footer:** remove "Work at your own pace" and "Open Day N plan".
   Keep ONLY "New days unlock with your cohort", centered horizontally in the
   card, at mobile, tablet, and desktop.
7. **Remove ALL live-session UI.** No "Live now/Starting soon" section, no
   join buttons, no live logic on the dashboard or anywhere learner-facing.
   The model is simply: every day has a video + at least one material. (Keep
   `live_link`/`live_starts_at` columns untouched in queries you don't need —
   just stop rendering. You may delete the dead code paths in the dashboard.)
8. **Up-next queue items:** remove the "Watch/Read/Build" type label row
   entirely; use the freed space for a larger, more readable title.
9. **"Your learning path" card (desktop layout fix — founder screenshot 4):**
   - Eyebrow "Your learning path" → **"Path"**.
   - Heading "Keep moving, one day at a time." → a 3-word replacement
     (e.g. **"Day by day."** — your call, ≤3 words).
   - Both card headings ("Continue with Day 1." and the new path heading)
     get a size bump.
   - **Fixed height, internal scroll:** the path card must NEVER exceed the
     learning-plan card's height. Remove the `<details>` "See N upcoming days"
     expander; render ALL days (unlocked rows + locked rows with lock icon,
     locked non-clickable) in one list that **scrolls inside the card**.
     Day rows drop the "Watch" text (they don't have it) but DO drop
     "0 of 1 lessons complete" → shorter status ("Not started" / "Done" /
     "Locked") to fit the narrower column.
   - **The whole desktop dashboard fits one 1440×900 viewport with NO page
     scroll.** Verify this in the browser. Kill the dead white space at the
     bottom of the plan card (it currently stretches with an empty gap —
     content should distribute, not leave a hole).

## C. Bottom nav (mobile)

10. Corner radius: match the main cards (`rounded-card`, 20px) instead of the
    current full pill.
11. Colors inverted: bar background = primary dark emerald (`bg-emerald` /
    surface-dark family), inactive items in light muted text, ACTIVE item gets
    a white chip with emerald text. Keep ≥44px touch targets.

## D. Lesson page

12. **Back link** ("← Day 1", top left): drop the plain "←" glyph; use the
    lucide `ArrowLeft` (same family as the `ArrowRight` on "Start this
    lesson"), slightly larger, and bump the label + page title size.
13. Rename **"Day materials" → "Materials"**, and add more vertical gap
    between the lesson description and the Materials section.
14. **Layout order**: video → description → Materials → **Mark as complete** →
    day pager (prev/next) → v1 footer. (Mark-complete currently sits above the
    pager context the founder described; make the order exactly this.)
15. **Day pager (bottom prev/next):** show ONLY "Day N" (e.g. "Day 2"), not
    the full lesson title. Same arrow treatment as item 12 (ArrowLeft /
    ArrowRight, slightly larger, larger label).
16. **Recording-pending state:** when a video lesson has no playable embed
    (resolveVideoEmbed → null), render a branded placeholder card in the
    video slot: "Today's session recording will appear here soon." (This is
    the real launch flow — live at 7 PM, recording uploaded after.) No error
    JSON, no empty black box.

## E. Vault (`/learn/vault`)

17. Founder verdict: current vault "looks ugly" — treat this page as a
    redesign within the existing card language, guided by the skills in §How-to.
    Specific requirements:
    - **Drip-lock areas**: an area (module) whose FIRST day is still locked
      renders as a locked card (lock icon, muted, not clickable, resources
      hidden). Area unlock day = min(unlock_day_offset) of its lessons; you
      already have drip helpers in `src/lib/lms/drip.ts`. Resources for
      locked days must not be tappable or fetch-visible in the UI.
    - **Remove per-resource descriptions on this page** (mobile AND desktop —
      title only), and use the space for larger resource titles.
    - Remove the per-area "N resources" count on MOBILE only (keep on desktop).
    - The "16 resources" count pill at the top: smaller corner radius
      (`rounded-md`, like buttons) instead of the full pill.
    - Apply the `.lms-surface` type scale here — this page was missed in 004;
      audit every text element.

## F. Admin (needed for the Monday launch workflow)

18. **Resources editor** (`/admin` → resources): expose the two new columns —
    a `description` text input and a **lesson picker** (dropdown of lessons,
    optional) that sets `lesson_id`. Wire through the existing admin resources
    API route (add both to its allowed fields). This is how the team attaches
    each day's PDF to that day's lesson.
19. Confirm the lesson editor's `youtube_id` field (from 002) saves and the
    learner page reflects it — this is the "paste the recording after the live
    session" flow.

## G. Global

20. **Type bump, one more notch:** everything except the H1/hero titles gets
    slightly larger via the `--lms-text-*` variables in `lms.css` (tune the
    variables, do NOT sprinkle per-element sizes). Founder: better reading
    experience for every text on every page.
21. **Em dashes → hyphens** in ALL UI copy (code-side strings; DB content
    already fixed by Claude). Grep `—` across `src/` and replace with `-`.
22. **V1 footer copy** (mobile footer AND desktop sidebar block) becomes
    exactly these two lines, centered on mobile:
    - Line 1: `Elyst AI Learning Portal - Version 1.0`
    - Line 2: `Got a feedback? Share it here` — where "Share it here" is a
      bold emerald link (dark and clearly tappable) to `https://wa.me/919633288931`
      (opens WhatsApp chat; `rel="noreferrer" target="_blank"`).

## Out of scope

Schema/migrations (done), Supabase config, login page (leave as merged),
handoff 003 items (separate), admin redesign beyond items 18–19, new deps
(Playwright MCP is tooling, not an app dependency).

## Acceptance (Claude re-verifies; every item at 390px AND 1440px)

Every lettered item above, plus: zero horizontal scroll on all learner pages
at 390px; desktop dashboard fits 1440×900 with no page scroll; all suites +
build + lint green; EXTRAS section lists your discretionary changes.

## EXTRAS:

(Codex: list your own improvements here.)

## QUESTIONS:

(Codex: append questions here instead of guessing.)
