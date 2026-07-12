# Admin operations guide + coverage audit

How the founder admin works today, what it covers, where it falls short of the
**current product model** (every day = 1 video + ≥1 PDF, no live sessions, no
submissions, calendar drip), and step-by-step instructions for the real tasks.

---

## How to get in

- **URL:** `https://app.elystai.com/admin` (redirects to `/admin/content`).
- **Who:** only auth users whose id is in `public.admin_users`. Everyone else gets
  a **404** — deliberate, so the admin surface is invisible to learners. There is
  **no separate admin login page or subdomain**; it's the same app + allowlist.
- Both founder emails are already in the TEST allowlist. For prod, insert them
  into prod `public.admin_users` (pre-prod checklist B).
- If you get a 404 as an admin, it's almost always: (a) Vercel pointing at a
  different Supabase project, or (b) you're logged in as a non-admin email.

## What the admin UI covers today (nav: Content · Resources · Progress · Submissions)

| Surface | Does | Model fit |
|---|---|---|
| **Content** | Lists courses → open a course → its modules/lessons | ✅ |
| **Content → Lesson editor** | Edit title, `content_type`, **`youtube_id`**, `unlock_day_offset`, `is_preview`, duration, body, task instructions, (legacy) `live_link`/`live_starts_at` | ◐ works, but exposes dead live-session fields |
| **Resources** | Create/edit resources; attach to a **module**, a **batch**, and/or a **lesson**; set kind, URL, sort order | ✅ this is how you attach the daily PDFs |
| **Progress** | View enrollments and per-learner completion | ✅ |
| **Submissions** | Review learner file submissions | ❌ **dead surface** — batch 1 has no submissions |

## Coverage gaps vs. the current product 🔴

1. 🔴 **No batch management UI — `starts_on` is not editable anywhere.** This is the
   single most important launch lever (it sets the cohort start date that drives
   every unlock). Today you can only set it via SQL. **Recommend building a tiny
   "Batches" admin surface** (list batches, edit `name` + `starts_on`) before you
   run a second cohort — for Monday, setting it once via SQL is acceptable.
2. 🟡 **Submissions nav + page are stale.** The product dropped submissions for
   batch 1. Leaving it in the nav is confusing. **Recommend hiding the nav item**
   (and the page) until/unless submissions return.
3. 🟡 **Lesson editor still shows `live_link` / `live_starts_at`.** No live sessions
   in the current model. Harmless but clutters. **Recommend collapsing/hiding**
   these fields.
4. 🟡 **No PDF upload — resources take a URL only.** So PDFs currently point at an
   external sample. **Recommend a Storage upload control** in the resource form so
   you drag-drop the workbook and it's hosted + mobile-downloadable.
5. 🟢 No "preview as learner" button — you can't see a day exactly as a learner will
   without a second account. Nice-to-have.

> These are logged so the admin surface matches reality. #1 is the only one that
> blocks a clean *second* cohort; for Monday, the SQL `starts_on` set is fine.

---

## Step-by-step: the real admin tasks

### Set the cohort launch date (drives all drip) — ⚠️ SQL for now
Until gap #1 is built, set `starts_on` directly:
```sql
-- prod, ON EXPLICIT GO ONLY
update app.batches set starts_on = '2026-07-13' where name = '<your batch name>';
```
Effect: day 1 unlocks at **midnight IST on 2026-07-13**, day 2 the next midnight, …
day 14 on 2026-07-26. (In TEST right now `DRIP_INTERVAL_MINUTES=2` compresses this
to 2-minute steps — delete that env line for real daily behaviour.)

### Put a YouTube video on a lesson
1. `/admin/content` → click the course → click the day's lesson.
2. In **`youtube_id`**, paste **only the bare video id** (the `abc123XYZ` part, not
   the full URL). YouTube takes precedence over Bunny. Save.
3. For batch 1, set the video **Unlisted or Private** on YouTube.
4. Verify: open `/learn/<course>/lesson/<id>` as a learner and play it on a phone.

### Attach the daily PDF (the "materials")
1. `/admin/content/resources`.
2. Create a resource: set **title**, **description**, **kind = doc**, and the
   **URL** (for now). Link it to the **lesson** (so it shows on that day's page)
   via the lesson picker.
3. It appears under "Materials" on the lesson and in the vault, grouped by area.
   > Before prod, replace the URL with a Supabase Storage-hosted file (gap #4).

### Check who's progressing
1. `/admin/progress` → see enrollments + completion.
2. Click an enrollment for per-lesson detail.

### Add another admin
Insert their `profiles.id` into `public.admin_users` (SQL or Supabase table editor).
There's no UI for this yet (intentional — it's a rare, high-trust action).

---

## Recommended admin follow-ups (post-launch, in priority order)
1. **Batches surface** (edit `starts_on`) — removes the last SQL dependency.
2. **Hide Submissions** nav/page while unused.
3. **Storage upload** in the resource form.
4. Collapse legacy live-session fields in the lesson editor.
5. "Preview as learner" link per day.
