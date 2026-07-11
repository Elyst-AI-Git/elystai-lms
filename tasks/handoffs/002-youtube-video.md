# Handoff 002 — YouTube video support (batch 1)

**Owner:** Codex · **Branch:** `codex/002-youtube-video` (from `dev`) · **Reviewer:** Claude
**Test contract (must pass):** `npx tsx scripts/test-video.ts` + the manual check below.

## Why

Batch 1 delivers lesson video via a **private/unlisted YouTube** embed instead of
Bunny Stream. Migration `0012_lesson_youtube.sql` (already applied to the TEST
project) added `app.lessons.youtube_id text`. The app should prefer `youtube_id`
when set and fall back to the existing `bunny_video_id` otherwise, so nothing
already built breaks. Video completion is still manual mark-done; the 30s
heartbeat stays telemetry-only (spec D3) — do not add YouTube JS-API progress.

## Build (all in `src/`, nothing else)

1. **`src/lib/lms/video.ts`** — pure helper the test imports; match the contract exactly:
   ```ts
   export type VideoProvider = "youtube" | "bunny";
   export interface VideoEmbed { provider: VideoProvider; url: string }
   export function resolveVideoEmbed(input: {
     youtubeId: string | null;
     bunnyVideoId: string | null;
     bunnyLibraryId: string | undefined;
   }): VideoEmbed | null
   ```
   Rules:
   - `youtubeId` present AND valid → `{ provider: "youtube", url:
     "https://www.youtube-nocookie.com/embed/<id>?rel=0" }`. Use the
     **youtube-nocookie.com** host (privacy-enhanced). `?rel=0` only.
   - else `bunnyVideoId` present AND `bunnyLibraryId` defined →
     `{ provider: "bunny", url: "https://iframe.mediadelivery.net/embed/<lib>/<id>" }`.
   - else `null`.
   - **Validate the youtube id**: bare id only — reject empty string and any value
     containing `/`, `?`, `&`, `=`, or whitespace (a pasted URL must NOT be
     embedded raw — that's an injection/oEmbed-abuse vector). Rejected id → fall
     through to Bunny, or `null` if no Bunny id.

2. **`src/app/learn/[courseSlug]/lesson/[id]/page.tsx`** — replace the inline
   Bunny-only `embedUrl` construction (currently ~line 86) with
   `resolveVideoEmbed({ youtubeId: lesson.youtube_id, bunnyVideoId:
   lesson.bunny_video_id, bunnyLibraryId: process.env.BUNNY_STREAM_LIBRARY_ID })`.
   Add `youtube_id` to the lesson `select(...)` column list. Pass the resolved
   `url` to `<VideoEmbed>` as today. `VideoEmbed` already renders any iframe src —
   it needs **no change** (the `allow`/`allowFullScreen` attrs already cover
   YouTube). Confirm the heartbeat still fires.

3. **Admin lesson editor** (`src/app/admin/content/lesson/[id]/...`): add a
   **YouTube video ID** text input bound to `youtube_id`, next to the existing
   Bunny field, with helper text "Unlisted/private YouTube video ID only (the part
   after `watch?v=`), not a full URL." Wire it through the existing admin content
   PATCH handler — add `youtube_id` to that route's allowed `fields` list. One
   `admin.content.updated` event per save as usual (no new event names).

## Out of scope

Bunny token auth, YouTube Data API / analytics, autoplay, playlists, captions
upload, any schema change (0012 already applied), DNS/deploy.

## Acceptance

- `npx tsx scripts/test-video.ts` green (contract already committed; fails until
  `video.ts` exists), plus `test-plan|storage|events|access|drip` still green,
  `npm run build` + `npm run lint` clean.
- Manual: the two seeded video lessons already have `youtube_id = "aqz-KE-bpKQ"`
  (a public embeddable dummy). Open "How this cohort works (video)" as an enrolled
  learner → the YouTube player renders and plays; mark-done still works; a
  `learner.video.heartbeat` row appears after ~30s.

## QUESTIONS:

(Codex: append questions here instead of guessing.)
