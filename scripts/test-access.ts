/**
 * Test contract for handoff 001 (auth entry + access gate).
 * Written test-first by Claude (test engineer) — FAILS until Codex implements
 * src/lib/lms/access.ts with the exact signature in the handoff.
 * Run: npx tsx scripts/test-access.ts
 */
import { resolveAccess, type EnrollmentLike } from "../src/lib/lms/access";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
}

const COURSE = "course-aiw";
const OTHER_COURSE = "course-other";
const e = (status: string, courseId = COURSE): EnrollmentLike => ({
  status,
  batch: { course_id: courseId },
});

// --- no session: always login, regardless of enrollments ------------------
check("anon → login", resolveAccess(false, [], COURSE), "login");
check("anon with (stale) enrollments still → login", resolveAccess(false, [e("active")], COURSE), "login");

// --- session, no eligible enrollment → denied ------------------------------
check("authed, zero enrollments → denied", resolveAccess(true, [], COURSE), "denied");
check("authed, pending only → denied", resolveAccess(true, [e("pending")], COURSE), "denied");
check("authed, cancelled only → denied", resolveAccess(true, [e("cancelled")], COURSE), "denied");
check("authed, refunded only → denied", resolveAccess(true, [e("refunded")], COURSE), "denied");
check(
  "authed, active but for a DIFFERENT course → denied",
  resolveAccess(true, [e("active", OTHER_COURSE)], COURSE),
  "denied"
);

// --- session + active enrollment for the course → ok -----------------------
check("authed, active → ok", resolveAccess(true, [e("active")], COURSE), "ok");
check(
  "authed, active among non-active siblings → ok",
  resolveAccess(true, [e("refunded"), e("active"), e("pending")], COURSE),
  "ok"
);
check(
  "authed, active for course + active for other course → ok",
  resolveAccess(true, [e("active", OTHER_COURSE), e("active")], COURSE),
  "ok"
);

// --- defensive: unknown status strings never grant access ------------------
check("authed, unknown status 'Active' (case-sensitive) → denied", resolveAccess(true, [e("Active")], COURSE), "denied");
check("authed, empty status → denied", resolveAccess(true, [e("")], COURSE), "denied");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll access-gate assertions passed.");
