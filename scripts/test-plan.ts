/**
 * Unit tests for the learner dashboard view-logic (src/lib/lms/plan.ts).
 * Pure functions — no Supabase, no React. Run: npx tsx scripts/test-plan.ts
 */
import {
  formatDurationLabel,
  partitionDays,
  planHeadline,
  queuedLessons,
  selectNextLesson,
  type PlanLesson,
} from "../src/lib/lms/plan";
import type { DayProgress } from "../src/lib/lms/progress";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${a}, want ${e})`}`);
}

const lesson = (id: string, unlock = 0, is_preview = false): PlanLesson => ({
  id,
  unlock_day_offset: unlock,
  is_preview,
});

// --- formatDurationLabel ---------------------------------------------------
check("duration null → null", formatDurationLabel(null), null);
check("duration 0 → null", formatDurationLabel(0), null);
check("duration 90s → 2 min (rounds)", formatDurationLabel(90), "2 min");
check("duration 20s → floors to 1 min minimum", formatDurationLabel(20), "1 min");
check("duration 600s → 10 min", formatDurationLabel(600), "10 min");

// --- selectNextLesson ------------------------------------------------------
const seq = [lesson("a"), lesson("b"), lesson("c")];
check("next = first incomplete", selectNextLesson(seq, ["a"])?.id, "b");
check("next skips all completed → undefined", selectNextLesson(seq, ["a", "b", "c"]), undefined);
check("next = first when none complete", selectNextLesson(seq, [])?.id, "a");
check("next ignores unknown completed ids", selectNextLesson(seq, ["zzz"])?.id, "a");

// --- queuedLessons ---------------------------------------------------------
check("queue = up to 3 after next", queuedLessons([lesson("a"), lesson("b"), lesson("c"), lesson("d"), lesson("e")], "a").map((l) => l.id), ["b", "c", "d"]);
check("queue empty when next is last", queuedLessons(seq, "c").map((l) => l.id), []);
check("queue empty when next id missing", queuedLessons(seq, "zzz").map((l) => l.id), []);
check("queue respects custom count", queuedLessons(seq, "a", 1).map((l) => l.id), ["b"]);

// --- planHeadline (the &apos; bug lives here) ------------------------------
check(
  "no next lesson → today copy, no literal entity",
  planHeadline(undefined, 4),
  { mode: "none", headline: "Today's focused work.", badge: "Day 5" }
);
check(
  "today headline has a real apostrophe, not &apos;",
  planHeadline(undefined, 4).headline.includes("&apos;"),
  false
);
check(
  "next lesson before today → catching up",
  planHeadline(lesson("x", 0), 3),
  { mode: "catching-up", headline: "Continue with Day 1.", badge: "Catching up" }
);
check(
  "next lesson on today → today's work",
  planHeadline(lesson("x", 4), 4),
  { mode: "today", headline: "Today's focused work.", badge: "Day 5" }
);
check(
  "preview lesson ahead of today → preview",
  planHeadline(lesson("x", 6, true), 4),
  { mode: "preview", headline: "Preview available for Day 7.", badge: "Preview" }
);
check(
  "preview lesson NOT ahead → not preview mode",
  planHeadline(lesson("x", 2, true), 4).mode,
  "catching-up"
);
check(
  "before cohort starts (today = -1) → no day badge",
  planHeadline(undefined, -1),
  { mode: "none", headline: "Today's focused work.", badge: null }
);

// --- partitionDays ---------------------------------------------------------
const days: DayProgress[] = [
  { day: 0, total: 2, completed: 2 },
  { day: 1, total: 1, completed: 0 },
  { day: 2, total: 3, completed: 3 },
  { day: 5, total: 1, completed: 0 },
];
check(
  "partition splits available vs future at today",
  partitionDays(days, 2),
  {
    available: [
      { day: 0, total: 2, completed: 2 },
      { day: 1, total: 1, completed: 0 },
      { day: 2, total: 3, completed: 3 },
    ],
    future: [{ day: 5, total: 1, completed: 0 }],
    completedDays: 2,
  }
);
check("partition before start → all future", partitionDays(days, -1).available.length, 0);
check("partition all open → no future", partitionDays(days, 10).future.length, 0);
check(
  "partition ignores empty days in completed count",
  partitionDays([{ day: 0, total: 0, completed: 0 }], 0).completedDays,
  0
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll plan assertions passed.");
