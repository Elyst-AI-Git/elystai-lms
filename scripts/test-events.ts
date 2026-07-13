/**
 * Integrity tests for the event taxonomy (src/lib/lms/events.ts). Guards the
 * spec-D4 contract: names are unique, dot-namespaced, snake_case, and match
 * the object path they hang off — so a stray literal or typo fails CI, not prod.
 * Run: npx tsx scripts/test-events.ts
 */
import { LMS_EVENTS } from "../src/lib/lms/events";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`);
}

function collect(obj: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const value of Object.values(obj)) {
    if (typeof value === "string") out.push(value);
    else if (value && typeof value === "object") out.push(...collect(value as Record<string, unknown>));
  }
  return out;
}

const names = collect(LMS_EVENTS);

check("taxonomy is non-empty", names.length > 0, true);
check("every event is unique", new Set(names).size, names.length);

const namePattern = /^[a-z]+(\.[a-z_]+)+$/;
const badFormat = names.filter((n) => !namePattern.test(n));
check("all names are lowercase dot-namespaced", badFormat.join(",") || "none", "none");

// Every leaf value must be reachable at a path whose top segment matches the
// event's first namespace (learner.* under learner, admin.* under admin).
const topMismatch: string[] = [];
for (const [top, group] of Object.entries(LMS_EVENTS)) {
  for (const n of collect(group as Record<string, unknown>)) {
    if (!n.startsWith(`${top}.`)) topMismatch.push(n);
  }
}
check("namespace matches object nesting", topMismatch.join(",") || "none", "none");

// Spot-check the auth events handoff 001 added, so a rename can't silently drift.
check("login_succeeded name stable", LMS_EVENTS.learner.auth.loginSucceeded, "learner.auth.login_succeeded");
check("signed_out name stable", LMS_EVENTS.learner.auth.signedOut, "learner.auth.signed_out");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll event-taxonomy assertions passed.");
