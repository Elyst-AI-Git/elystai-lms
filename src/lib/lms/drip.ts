/**
 * Calendar-drip logic (spec D2/A7). Single source of truth for unlock math.
 *
 * All day boundaries are fixed to Asia/Kolkata (UTC+05:30, no DST) regardless
 * of server or learner timezone: the whole cohort — India and GCC — unlocks
 * at the same instant (midnight IST ≈ 22:30 Gulf). Pure functions only; no
 * Supabase, no env, so they are unit-testable with fixed dates.
 */

const IST_OFFSET_MINUTES = 330; // UTC+05:30, constant — IST has no DST
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
 * day) — used by the UI to show "unlocks on …" for locked days.
 */
export function unlockDate(unlockDayOffset: number, batchStartsOn: string): Date {
  const epochDay = startEpochDay(batchStartsOn) + unlockDayOffset;
  return new Date(epochDay * MS_PER_DAY - IST_OFFSET_MINUTES * 60 * 1000);
}
