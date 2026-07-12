# SEO & discoverability analysis

**Key framing:** this is a **gated, logged-in learner portal**, not a content site.
So "SEO" here is *not* about ranking pages on Google — the learning content lives
behind auth and **must never be indexed**. The real goals are:

1. **Keep the private app out of search indexes** (correctness + security).
2. Make the **one public page** (`/login`) and any marketing links look right when
   shared (social cards, favicon, title).
3. Get the *marketing* site (`elystai.com/ai-for-work`) doing the actual ranking —
   that's where SEO effort belongs, and it's a separate codebase.

## 1. Prevent indexing of the app (do this — it's a real risk)

Right now nothing stops Google from crawling `app.elystai.com`. Even though pages
redirect to `/login`, the login page itself and any leaked URLs can be indexed.

- Add `app/robots.ts` returning `Disallow: /` for the whole app host.
- Add a default `robots` meta of `noindex, nofollow` in the root layout metadata,
  and only *override* it to `index` on genuinely public pages (there are none in
  the app today, so blanket noindex is correct).
- Do **not** submit `app.elystai.com` to Google Search Console for indexing.

> Why it matters: an indexed `/learn/…/lesson/…` URL is both an SEO smell and a
> minor info leak (reveals structure, titles). Blanket noindex closes it.

## 2. Metadata / tags the app *should* have (for the shareable surfaces)

Even a private app needs correct metadata so a pasted `app.elystai.com` link
renders a proper card in WhatsApp/Slack (you're sending learners there):

- **`app/layout.tsx` metadata:**
  - `title` template: `"%s · Elyst AI"`, default `"Elyst AI — Accelerator Hub"`.
  - `description`: one line, e.g. "Your AI for Work learning space."
  - `metadataBase: new URL("https://app.elystai.com")`.
  - **Open Graph**: `og:title`, `og:description`, `og:image` (a 1200×630 branded
    card — reuse the login hero or a wordmark-on-green image), `og:type: website`.
  - **Twitter**: `card: summary_large_image`.
- **Favicon / app icons:** ship `app/icon.png` (and `apple-icon.png`) — Next.js
  picks these up automatically. Right now the browser tab shows a generic/"N" mark.
- **`theme-color`** meta (the emerald) so mobile browser chrome matches the brand.
- **`lang="en"`** on `<html>` (accessibility + correctness).
- **Web app manifest** (`app/manifest.ts`) so "Add to Home Screen" on mobile gives
  a branded icon + standalone launch — meaningful since 80–90% of users are mobile.

## 3. "Graphy" (Open Graph / social) — the practical checklist

When you paste `app.elystai.com` into WhatsApp to invite the cohort, it should show:
- ✅ Elyst wordmark or a branded card image (not a blank/broken thumbnail)
- ✅ "Elyst AI — Accelerator Hub"
- ✅ a one-line description

That's entirely driven by the OG tags above. **Test it** with
`https://www.opengraph.xyz/` or by pasting the link into a WhatsApp chat to
yourself before you send it to 100 learners.

## 4. Performance = the SEO that actually matters here

For a logged-in app, Core Web Vitals affect *user experience*, not ranking, but
they're still worth hitting (you already fixed the big one — the 3–4s load via
region pinning). Quick wins:
- Run **Lighthouse** (Chrome DevTools) on `/login` and `/learn` once; aim >90 perf.
- Ensure the login hero image is sized/compressed (it's a large JPG).
- Fonts: confirm `next/font` (self-hosted) so there's no render-blocking fetch.

## 5. Where real SEO belongs: the marketing site

Ranking for "AI for work course India" etc. is the job of **elystai.com** (the
marketing/landing codebase), not this app. That's where you want:
- keyword-targeted landing copy, a blog, structured data (`Course` schema.org),
  sitemap, Search Console, backlinks.
This app's only SEO job is: **be invisible to crawlers, beautiful when shared.**

## Priority order
1. `robots.ts` + blanket `noindex` (security/correctness) — **do before prod**.
2. Favicon + OG image + metadata (social cards look right) — **do before you send invite links**.
3. `manifest.ts` + theme-color (mobile "add to home screen") — nice-to-have.
4. Lighthouse pass — nice-to-have.
