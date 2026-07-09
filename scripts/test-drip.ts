/**
 * Plain-assertion unit tests for src/lib/lms/drip.ts (T1 acceptance).
 * Run: npx tsx scripts/test-drip.ts
 *
 * Dates are constructed as UTC instants and asserted against IST behaviour,
 * so the suite passes identically on any machine timezone.
 */
import { currentDayNumber, isUnlocked, unlockDate } from "../src/lib/lms/drip";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
}

const STARTS_ON = "2026-08-03"; // batch start date (an IST calendar day)

// --- day 0 at 00:01 IST -----------------------------------------------------
// 2026-08-03 00:01 IST == 2026-08-02 18:31 UTC
const day0Morning = new Date(Date.UTC(2026, 7, 2, 18, 31));
check("day 0 at 00:01 IST → day number 0", currentDayNumber(STARTS_ON, day0Morning), 0);
check("day 0 at 00:01 IST → offset 0 unlocked", isUnlocked(0, STARTS_ON, day0Morning), true);
check("day 0 at 00:01 IST → offset 1 locked", isUnlocked(1, STARTS_ON, day0Morning), false);

// --- 23:59 IST day boundary --------------------------------------------------
// 2026-08-03 23:59 IST == 2026-08-03 18:29 UTC (still day 0)
const day0Night = new Date(Date.UTC(2026, 7, 3, 18, 29));
check("23:59 IST still day 0", currentDayNumber(STARTS_ON, day0Night), 0);
check("23:59 IST → offset 1 still locked", isUnlocked(1, STARTS_ON, day0Night), false);
// two minutes later: 2026-08-04 00:01 IST == 2026-08-03 18:31 UTC (day 1)
const day1Morning = new Date(Date.UTC(2026, 7, 3, 18, 31));
check("00:01 IST next day → day 1", currentDayNumber(STARTS_ON, day1Morning), 1);
check("00:01 IST next day → offset 1 unlocked", isUnlocked(1, STARTS_ON, day1Morning), true);

// --- GCC evening (UTC+4) -----------------------------------------------------
// Gulf learner at 22:31 local on 2026-08-03 == 18:31 UTC == 00:01 IST Aug 4:
// day 1 content unlocks for them at ~22:30 their evening (spec A7).
check("GCC 22:31 evening sees next day unlocked", isUnlocked(1, STARTS_ON, day1Morning), true);
// At 22:29 Gulf (18:29 UTC) it is still locked.
check("GCC 22:29 evening still locked", isUnlocked(1, STARTS_ON, day0Night), false);

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
// 2026-08-16 00:01 IST == 2026-08-15 18:31 UTC → day 13 unlocks
const day13 = new Date(Date.UTC(2026, 7, 15, 18, 31));
check("offset 13 unlocks on day 13", isUnlocked(13, STARTS_ON, day13), true);
check("offset 13 locked one minute before midnight IST",
  isUnlocked(13, STARTS_ON, new Date(Date.UTC(2026, 7, 15, 18, 29))), false);

// --- unlockDate round-trips ------------------------------------------------
// Midnight IST of day 1 == 2026-08-03 18:30 UTC.
check("unlockDate(1) is midnight IST of day 1",
  unlockDate(1, STARTS_ON).toISOString(), "2026-08-03T18:30:00.000Z");
check("unlockDate(0) is midnight IST of starts_on",
  unlockDate(0, STARTS_ON).toISOString(), "2026-08-02T18:30:00.000Z");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll drip assertions passed.");
