/**
 * Plain-assertion unit tests for src/lib/lms/drip.ts (T1 acceptance).
 * Run: npx tsx scripts/test-drip.ts
 *
 * Dates are constructed as UTC instants and asserted against IST behaviour,
 * so the suite passes identically on any machine timezone.
 *
 * Day boundary is 04:00 IST (NOT midnight): 04:00 IST == 22:30 UTC of the
 * previous calendar day == 02:30 Gulf (UTC+4). The 4am buffer keeps GCC
 * learners on the same "day" through their whole evening and gives the
 * content team the night to finish uploads.
 */
import { currentDayNumber, isUnlocked, unlockDate } from "../src/lib/lms/drip";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
}

const STARTS_ON = "2026-08-03"; // batch start date (an IST calendar day)

// --- the 04:00 IST boundary on day 0 ---------------------------------------
// 2026-08-03 03:59 IST == 2026-08-02 22:29 UTC → still the PREVIOUS unlock day
const beforeBoundary = new Date(Date.UTC(2026, 7, 2, 22, 29));
check("03:59 IST on starts_on → still day -1", currentDayNumber(STARTS_ON, beforeBoundary), -1);
check("03:59 IST on starts_on → offset 0 locked", isUnlocked(0, STARTS_ON, beforeBoundary), false);
// 2026-08-03 04:01 IST == 2026-08-02 22:31 UTC → day 0 begins
const day0Morning = new Date(Date.UTC(2026, 7, 2, 22, 31));
check("04:01 IST on starts_on → day number 0", currentDayNumber(STARTS_ON, day0Morning), 0);
check("04:01 IST on starts_on → offset 0 unlocked", isUnlocked(0, STARTS_ON, day0Morning), true);
check("04:01 IST on starts_on → offset 1 locked", isUnlocked(1, STARTS_ON, day0Morning), false);

// --- midnight no longer unlocks the next day --------------------------------
// 2026-08-04 00:01 IST == 2026-08-03 18:31 UTC: calendar day 2 has started in
// IST, but the unlock day is still 0 until 04:00.
const midnightOwl = new Date(Date.UTC(2026, 7, 3, 18, 31));
check("00:01 IST next date → STILL day 0 (no midnight unlock)", currentDayNumber(STARTS_ON, midnightOwl), 0);
check("00:01 IST next date → offset 1 still locked", isUnlocked(1, STARTS_ON, midnightOwl), false);
// 2026-08-04 03:59 IST == 2026-08-03 22:29 UTC: one minute before boundary
check("03:59 IST next date → offset 1 still locked",
  isUnlocked(1, STARTS_ON, new Date(Date.UTC(2026, 7, 3, 22, 29))), false);
// 2026-08-04 04:01 IST == 2026-08-03 22:31 UTC → day 1
const day1Morning = new Date(Date.UTC(2026, 7, 3, 22, 31));
check("04:01 IST next date → day 1", currentDayNumber(STARTS_ON, day1Morning), 1);
check("04:01 IST next date → offset 1 unlocked", isUnlocked(1, STARTS_ON, day1Morning), true);

// --- GCC (UTC+4) perspective -------------------------------------------------
// 04:00 IST == 02:30 Gulf. A Gulf learner at 23:30 local on Aug 3 (19:30 UTC)
// is still on day 0 — their evening is never cut short by an early unlock.
check("GCC 23:30 evening still on day 0", currentDayNumber(STARTS_ON, new Date(Date.UTC(2026, 7, 3, 19, 30))), 0);
// At 02:31 Gulf (22:31 UTC) the next day unlocks.
check("GCC 02:31 night sees day 1 unlocked", isUnlocked(1, STARTS_ON, day1Morning), true);

// --- before batch start --------------------------------------------------
// 2026-08-02 12:00 IST == 06:30 UTC → day -1, nothing unlocked (not even offset 0)
const beforeStart = new Date(Date.UTC(2026, 7, 2, 6, 30));
check("day before start → day number -1", currentDayNumber(STARTS_ON, beforeStart), -1);
check("day before start → offset 0 locked", isUnlocked(0, STARTS_ON, beforeStart), false);

// --- late joiner sees the same state ------------------------------------
// Drip depends only on batch + clock, so any two calls at the same instant
// agree regardless of when the learner enrolled. Assert determinism at a
// mid-batch instant: 2026-08-10 09:00 IST == 03:30 UTC (day 7).
const midBatch = new Date(Date.UTC(2026, 7, 10, 3, 30));
check("mid-batch day number is 7", currentDayNumber(STARTS_ON, midBatch), 7);
check("late joiner: offset 7 unlocked", isUnlocked(7, STARTS_ON, midBatch), true);
check("late joiner: offset 8 locked", isUnlocked(8, STARTS_ON, midBatch), false);

// --- offset 13 (end of a 2-week cohort) -----------------------------------
// Day 13 unlocks at 2026-08-16 04:00 IST == 2026-08-15 22:30 UTC.
check("offset 13 unlocks at 04:01 IST on day 13",
  isUnlocked(13, STARTS_ON, new Date(Date.UTC(2026, 7, 15, 22, 31))), true);
check("offset 13 locked one minute before the 4am boundary",
  isUnlocked(13, STARTS_ON, new Date(Date.UTC(2026, 7, 15, 22, 29))), false);

// --- unlockDate round-trips ------------------------------------------------
// 04:00 IST of day 1 == 2026-08-03 22:30 UTC.
check("unlockDate(1) is 04:00 IST of day 1",
  unlockDate(1, STARTS_ON).toISOString(), "2026-08-03T22:30:00.000Z");
check("unlockDate(0) is 04:00 IST of starts_on",
  unlockDate(0, STARTS_ON).toISOString(), "2026-08-02T22:30:00.000Z");
// unlockDate must agree with isUnlocked: locked 1ms before, unlocked at instant.
const d5 = unlockDate(5, STARTS_ON);
check("isUnlocked flips exactly at unlockDate(5)",
  `${isUnlocked(5, STARTS_ON, new Date(d5.getTime() - 1))}->${isUnlocked(5, STARTS_ON, d5)}`,
  "false->true");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll drip assertions passed.");
