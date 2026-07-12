# Domain, subdomain & platform architecture

**Context:** the LMS starts as the *AI for Work* learner portal, but you're planning
to consolidate **AI Circle member resources + pricing/membership** (today on a NAS)
onto the same platform. That future shape should drive the domain decision now,
because a subdomain is expensive to change once learners have bookmarked it and
Google has indexed it.

## Recommendation: `app.elystai.com`

Pick a **product-agnostic umbrella**, not a course-specific name.

| Candidate | Verdict |
|---|---|
| `learn.elystai.com` | Clear *today*, but boxes you in. When AI Circle pricing/membership lives here too, "learn" is wrong. |
| `accelerator.elystai.com` | Matches the "Accelerator Hub" footer, but it's a *program* name — you'll run other programs. Long to type. |
| `hub.elystai.com` | Good middle ground; reads as "the place where member stuff lives." Fine if you prefer a warmer word than "app". |
| **`app.elystai.com`** ✅ | The convention for "the logged-in product surface" (Notion, Linear, Vercel all use it). Survives every expansion: course today, membership + resources + billing tomorrow, all under one authenticated app. |

**Structure the product as sections under one app**, not multiple subdomains:

```
elystai.com                      → marketing site (existing)
app.elystai.com/learn            → AI for Work course (what you have)
app.elystai.com/circle           → AI Circle member resources (migrate off NAS)
app.elystai.com/membership       → pricing / plan / billing
app.elystai.com/admin            → founder admin (already built)
```

One domain = one auth session = one Supabase project = one deploy. A member logs
in once and moves between course, resources, and membership seamlessly. Splitting
into `learn.` / `circle.` / `billing.` subdomains would fracture the auth cookie
(cookies are per-host) and triple your ops.

> Keep `elystai.com` (the apex) for marketing. Never put the app on the apex —
> you want the marketing site and the app to deploy and cache independently.

## How to wire `app.elystai.com` (Vercel + Supabase)

1. **Vercel → Project → Settings → Domains → Add** `app.elystai.com`.
2. Vercel shows a **CNAME** target (e.g. `cname.vercel-dns.com`). In your DNS
   provider (wherever elystai.com's DNS lives), add:
   `CNAME  app  →  cname.vercel-dns.com`. Propagation: minutes to ~1 hour.
3. **Supabase → Authentication → URL Configuration:**
   - **Site URL:** `https://app.elystai.com`
   - **Redirect URLs (allow list):** add `https://app.elystai.com/auth/callback`
     (and keep `http://localhost:3000/auth/callback` for local dev).
   Without this, magic-link / OAuth redirects are rejected.
4. **Google Cloud OAuth** (this is why "Continue with Google" fails today — see
   `pre-prod-checklist.md`): the authorized origins/redirects must include the
   Supabase callback and `https://app.elystai.com`.
5. Re-issue the marketing-site "Join / Login" links to `https://app.elystai.com`.

## Migration note (AI Circle off the NAS)

When you're ready to move Circle resources here, the model already fits:
- Files → **Supabase Storage** buckets (same pattern as course PDFs), with RLS so
  only paying members' rows are readable. No NAS, no VPN, works on mobile.
- Membership tiers → a `memberships` table keyed to `profiles`, gating `/circle`
  the same way `enrollments` gates `/learn` today.
- Pricing/checkout → you already have Razorpay wired for the course; reuse it.

Nothing here needs deciding now — flagging that the `app.elystai.com` +
single-Supabase-project choice keeps that door open at zero extra cost.
