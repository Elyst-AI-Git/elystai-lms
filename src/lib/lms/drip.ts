/**
 * Calendar-drip logic (spec D2/A7). Single source of truth for unlock math.
 *
 * All day boundaries are fixed to Asia/Kolkata (UTC+05:30, no DST) regardless
 * of server or learner timezone: the whole cohort - India and GCC - unlocks
 * at the same instant (midnight IST ≈ 22:30 Gulf). Pure functions only; no
 * Supabase, no env, so they are unit-testable with fixed dates.
 */

const IST_OFFSET_MINUTES = 330; // UTC+05:30, constant - IST has no DST
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * TEST-ONLY time compression. When DRIP_INTERVAL_MINUTES is set (e.g. "2"),
 * the "one day" unlock cadence is replaced by that many real minutes, anchored
 * at DRIP_TEST_ANCHOR (ISO instant) or, failing that, IST-midnight of
 * starts_on. This lets a reviewer watch all 14 days unlock in ~28 minutes.
 * Unset in prod → returns null → the real calendar-day logic below runs
 * unchanged, so all unit tests (which never set the env) are unaffected.
 */
function testIntervalMs(): number | null {
  const raw = process.env.DRIP_INTERVAL_MINUTES;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n * 60 * 1000 : null;
}

/**
 * Instant day-0 unlocks in test mode. Explicit DRIP_TEST_ANCHOR wins; else
 * the moment this module first loaded (≈ dev-server start), so a reviewer just
 * runs `npm run dev` and day 0 is live, day 1 unlocks one interval later.
 */
const TEST_MODE_LOAD_MS = Date.now();
function testAnchorMs(): number {
  const anchor = process.env.DRIP_TEST_ANCHOR;
  const parsed = anchor ? Date.parse(anchor) : NaN;
  return Number.isFinite(parsed) ? parsed : TEST_MODE_LOAD_MS;
}

/**
 * The IST calendar date containing `now`, as days since the Unix epoch.
 */
function istEpochDay(now: Date): number {
  return Math.floor((now.getTime() + IST_OFFSET_MINUTES * 60 * 1000) / MS_PER_DAY);
}

/**
 * `starts_on` is a Postgres `date` (YYYY-MM-DD) and means "that calendar day
 * in IST", so it maps directly to an epoch day with no timezone shift.
 */
function startEpochDay(batchStartsOn: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(batchStartsOn);
  if (!match) throw new Error(`Invalid batch starts_on date: ${batchStartsOn}`);
  const [, y, m, d] = match;
  return Math.floor(Date.UTC(Number(y), Number(m) - 1, Number(d)) / MS_PER_DAY);
}

/**
 * Day number of the batch in IST: 0 on `starts_on`, 1 the next IST day, …
 * Negative before the batch starts.
 */
export function currentDayNumber(batchStartsOn: string, now: Date): number {
  const intervalMs = testIntervalMs();
  if (intervalMs !== null) {
    return Math.floor((now.getTime() - testAnchorMs()) / intervalMs);
  }
  return istEpochDay(now) - startEpochDay(batchStartsOn);
}

/**
 * A lesson is unlocked iff the cohort has reached its day:
 * today_IST >= starts_on + unlock_day_offset. Late joiners see the same
 * state as everyone else because this depends only on the batch, never on
 * the enrollment date. Preview lessons bypass this at the call site.
 */
export function isUnlocked(
  unlockDayOffset: number,
  batchStartsOn: string,
  now: Date
): boolean {
  return currentDayNumber(batchStartsOn, now) >= unlockDayOffset;
}

/**
 * The UTC instant at which a given day offset unlocks (midnight IST of that
 * day) - used by the UI to show "unlocks on …" for locked days.
 */
export function unlockDate(unlockDayOffset: number, batchStartsOn: string): Date {
  const intervalMs = testIntervalMs();
  if (intervalMs !== null) {
    return new Date(testAnchorMs() + unlockDayOffset * intervalMs);
  }
  const epochDay = startEpochDay(batchStartsOn) + unlockDayOffset;
  return new Date(epochDay * MS_PER_DAY - IST_OFFSET_MINUTES * 60 * 1000);
}
