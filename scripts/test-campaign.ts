/**
 * Full HTTP test campaign against the running dev server (localhost:3000) +
 * the TEST Supabase project. Covers integration, security (STRIDE/abuse-case),
 * and business-functionality flows with four personas. This IS the automation
 * suite (re-runnable). Not part of `next build` (scripts/ is tsconfig-excluded).
 *
 * Prereq: dev server running; persona cookies written to scratchpad by the
 * campaign setup (cookie-enrolled.txt / cookie-outsider.txt / cookie-admin.txt).
 * Run: npx tsx scripts/test-campaign.ts
 */
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const SP = process.env.SP as string; // scratchpad dir, passed in
const REF = "cmihoglafjxtswtbitsz";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL as string;

const cookie = (who: string) => readFileSync(`${SP}/cookie-${who}.txt`, "utf8").trim();
const ENROLLED = cookie("enrolled");
const OUTSIDER = cookie("outsider");
const ADMIN = cookie("admin");
const EID = readFileSync(`${SP}/eid.txt`, "utf8").trim();

// fixtures (today = day offset 5; days 0-5 unlocked, 6-13 locked)
const L_UNLOCKED = "d4fc1b65-4283-4482-9d99-c867cf7fa12c"; // day 0
const L_LOCKED = "51d4e267-d079-4f7b-83d2-af459f2ecb51"; // day 13

let pass = 0, fail = 0;
const fails: string[] = [];
function check(cat: string, name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS [${cat}] ${name}`); }
  else { fail++; fails.push(`[${cat}] ${name} ${detail}`); console.log(`  FAIL [${cat}] ${name} ${detail}`); }
}

async function req(path: string, opts: RequestInit & { cookie?: string } = {}) {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
  const text = await res.text().catch(() => "");
  return { status: res.status, location: res.headers.get("location") ?? "", text, headers: res.headers };
}
async function sb(path: string) {
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Accept-Profile": "app" },
  });
  return r.json();
}

async function main() {
  console.log("\n=== INTEGRATION ===");
  // Page-level auth routing
  check("INT", "anon /learn → /login", (await req("/learn")).location.includes("/login"));
  check("INT", "enrolled /learn → 200", (await req("/learn", { cookie: ENROLLED })).status === 200);
  check("INT", "outsider /learn → /no-access", (await req("/learn", { cookie: OUTSIDER })).location.includes("/no-access"));
  check("INT", "anon /admin → 404 (hidden)", (await req("/admin")).status === 404);
  check("INT", "enrolled /admin → 404 (not admin)", (await req("/admin", { cookie: ENROLLED })).status === 404);
  const adminLanding = await req("/admin", { cookie: ADMIN });
  check("INT", "admin /admin → admin surface (200 or → /admin/content)", adminLanding.status === 200 || adminLanding.location.includes("/admin/content"), `status ${adminLanding.status} loc ${adminLanding.location}`);

  // Progress mutation round-trip (RLS exercised via user client)
  const mark = await req("/api/learn/progress", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: L_UNLOCKED, completed: true }) });
  check("INT", "mark-done unlocked lesson → 2xx", mark.status >= 200 && mark.status < 300, `got ${mark.status}`);
  const rows = await sb(`lesson_progress?enrollment_id=eq.${EID}&lesson_id=eq.${L_UNLOCKED}`);
  check("INT", "lesson_progress row created", Array.isArray(rows) && rows.length === 1);
  const ev = await sb(`interaction_events?event=eq.learner.lesson.completed&order=created_at.desc&limit=1`);
  check("INT", "completion event logged", Array.isArray(ev) && ev.length === 1);
  const unmark = await req("/api/learn/progress", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: L_UNLOCKED, completed: false }) });
  check("INT", "un-mark → 2xx", unmark.status >= 200 && unmark.status < 300, `got ${unmark.status}`);
  const rows2 = await sb(`lesson_progress?enrollment_id=eq.${EID}&lesson_id=eq.${L_UNLOCKED}`);
  check("INT", "lesson_progress row removed on un-mark", Array.isArray(rows2) && rows2.length === 0);

  // Heartbeat
  const hb = await req("/api/learn/heartbeat", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: L_UNLOCKED, positionSeconds: 30 }) });
  check("INT", "heartbeat unlocked → 2xx", hb.status >= 200 && hb.status < 300, `got ${hb.status}`);

  console.log("\n=== SECURITY ===");
  // Drip bypass (Elevation via time)
  check("SEC", "locked lesson page deep-link → 404", (await req(`/learn/ai-for-work/lesson/${L_LOCKED}`, { cookie: ENROLLED })).status === 404);
  const lockedMark = await req("/api/learn/progress", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: L_LOCKED, completed: true }) });
  check("SEC", "mark-done LOCKED lesson via API → 403", lockedMark.status === 403, `got ${lockedMark.status}`);
  const lockedHb = await req("/api/learn/heartbeat", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: L_LOCKED, positionSeconds: 30 }) });
  check("SEC", "heartbeat LOCKED lesson → 403", lockedHb.status === 403, `got ${lockedHb.status}`);

  // Broken access control / IDOR
  const outsiderMark = await req("/api/learn/progress", { method: "POST", cookie: OUTSIDER, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: L_UNLOCKED, completed: true }) });
  check("SEC", "outsider (no enrollment) mark-done → 4xx", outsiderMark.status >= 400, `got ${outsiderMark.status}`);
  const outsiderRows = await sb(`lesson_progress?lesson_id=eq.${L_UNLOCKED}`);
  check("SEC", "outsider write did NOT persist", Array.isArray(outsiderRows) && !outsiderRows.some((r: { enrollment_id: string }) => r.enrollment_id !== EID));

  // Admin authZ (Elevation of privilege)
  check("SEC", "non-admin POST admin content → 403", (await req("/api/admin/content/lessons", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "x", module_id: "x" }) })).status === 403);
  check("SEC", "anon POST admin content → 403", (await req("/api/admin/content/lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "x" }) })).status === 403);

  // Event injection (Tampering)
  check("SEC", "arbitrary event name rejected → 400", (await req("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "admin.secret.hack" }) })).status === 400);
  check("SEC", "malformed events JSON → 400", (await req("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })).status === 400);

  // Open redirect (auth callback)
  const cb = await req("/auth/callback?code=totally-invalid-code");
  check("SEC", "invalid oauth code → /login?error=oauth (no open redirect)", cb.location.includes("/login") && !cb.location.startsWith("http") || cb.location.includes("localhost:3000/login"), `loc=${cb.location}`);
  const cbEvil = await req("/auth/callback?code=x&next=https://evil.com");
  check("SEC", "callback ignores attacker next= param", !cbEvil.location.includes("evil.com"), `loc=${cbEvil.location}`);

  console.log("\n=== BUSINESS FUNCTIONALITY ===");
  // Drip correctness: unlocked count on dashboard
  const dash = (await req("/learn", { cookie: ENROLLED })).text;
  check("BIZ", "dashboard shows 'Day 6 of 14' cohort rhythm", dash.includes("Day 6 of 14"), "today=offset5");
  check("BIZ", "unlocked lesson title present (day 0)", dash.includes("Welcome &amp; how AI actually works") || dash.includes("Welcome & how AI actually works"));
  const vault = (await req("/learn/vault", { cookie: ENROLLED })).text;
  check("BIZ", "vault renders (Resource library)", vault.includes("Resource library"));
  // Locked areas: Area 4-7 unlock day >= 6 => locked today
  const modules = await sb(`modules?select=title,position&order=position`);
  check("BIZ", "7 areas seeded", Array.isArray(modules) && modules.length === 7);
  const lessons = await sb(`lessons?select=unlock_day_offset`);
  check("BIZ", "14 daily lessons", Array.isArray(lessons) && lessons.length === 14);
  const mats = await sb(`resources?select=id&lesson_id=not.is.null`);
  check("BIZ", "14 day-materials attached", Array.isArray(mats) && mats.length === 14);
  // Progress math: mark 3 unlocked done -> 21%
  const three = ["d4fc1b65-4283-4482-9d99-c867cf7fa12c", "4171d5e5-15e5-4aa0-871d-014cf51e4a8d", "e1614a22-63ac-43cc-b928-9c6ec059b10d"];
  for (const id of three) await req("/api/learn/progress", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: id, completed: true }) });
  const dash2 = (await req("/learn", { cookie: ENROLLED })).text;
  check("BIZ", "3/14 complete → shows 21%", dash2.includes("21%"), "round(3/14*100)=21");
  check("BIZ", "lessons-done shows '3 of 14'", dash2.includes("3 of 14"));
  // cleanup
  for (const id of three) await req("/api/learn/progress", { method: "POST", cookie: ENROLLED, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: id, completed: false }) });

  // Signout LAST — it revokes the enrolled session, so nothing may run after it.
  console.log("\n=== SECURITY (session teardown) ===");
  const signout = await req("/api/auth/signout", { method: "POST", cookie: ENROLLED });
  const setC = signout.headers.get("set-cookie") ?? "";
  check("SEC", "signout redirects to /login (303)", signout.status === 303 && signout.location.includes("/login"), `status ${signout.status}`);
  check("SEC", "signout expires the auth cookie", /sb-.*auth-token=;/i.test(setC) || /expires=Thu, 01 Jan 1970/i.test(setC) || setC.includes("Max-Age=0"), "no-clear");
  check("SEC", "post-signout /learn → /login", (await req("/learn", { cookie: ENROLLED })).location.includes("/login"), "session not revoked");

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
  if (fail) { console.log("\nFAILURES:"); fails.forEach((f) => console.log("  - " + f)); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
