import type { DayProgress } from "@/lib/lms/progress";

/**
 * Pure view-logic for the learner dashboard. Kept out of the (server) React
 * components so the branching that decides "what does the learner see next"
 * is unit-testable in isolation (scripts/test-plan.ts). No Supabase, no React.
 */

/** Minimal shape the plan logic needs from a lesson row. */
export interface PlanLesson {
  id: string;
  is_preview: boolean;
  unlock_day_offset: number;
}

/** Human duration label, or null when a lesson has no/zero duration. */
export function formatDurationLabel(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** The first lesson (in given order) the learner has not completed. */
export function selectNextLesson<T extends { id: string }>(
  lessons: T[],
  completedLessonIds: string[]
): T | undefined {
  const completed = new Set(completedLessonIds);
  return lessons.find((lesson) => !completed.has(lesson.id));
}

/** The up-to-`count` lessons queued after the current next lesson. */
export function queuedLessons<T extends { id: string }>(
  lessons: T[],
  nextLessonId: string,
  count = 3
): T[] {
  const index = lessons.findIndex((lesson) => lesson.id === nextLessonId);
  return index >= 0 ? lessons.slice(index + 1, index + 1 + count) : [];
}

export type PlanMode = "preview" | "catching-up" | "today" | "none";

export interface PlanHeadline {
  mode: PlanMode;
  /** Rendered as JSX text - plain characters only, never HTML entities. */
  headline: string;
  /** Pill copy, or null when no badge should show. */
  badge: string | null;
}

/**
 * Decides the plan card's heading + badge from the next lesson and today's
 * cohort day. `today` is the drip day number (0-based; negative before the
 * cohort starts).
 */
export function planHeadline(
  nextLesson: PlanLesson | undefined,
  today: number
): PlanHeadline {
  const dayBadge = today >= 0 ? `Day ${today + 1}` : null;

  if (!nextLesson) {
    return { mode: "none", headline: "Today's focused work.", badge: dayBadge };
  }

  const dayLabel = nextLesson.unlock_day_offset + 1;

  if (nextLesson.is_preview && nextLesson.unlock_day_offset > today) {
    return {
      mode: "preview",
      headline: `Preview available for Day ${dayLabel}.`,
      badge: "Preview",
    };
  }

  if (nextLesson.unlock_day_offset < today) {
    return {
      mode: "catching-up",
      headline: `Continue with Day ${dayLabel}.`,
      badge: "Catching up",
    };
  }

  return { mode: "today", headline: "Today's focused work.", badge: dayBadge };
}

export interface DayPartition {
  /** Days at or before today - visible in the course path. */
  available: DayProgress[];
  /** Days after today - shown collapsed as locked. */
  future: DayProgress[];
  /** Count of available days whose lessons are all complete. */
  completedDays: number;
}

/** Splits the per-day progress into available vs. locked-future buckets. */
export function partitionDays(perDay: DayProgress[], today: number): DayPartition {
  const available = perDay.filter((day) => day.day <= today);
  const future = perDay.filter((day) => day.day > today);
  const completedDays = available.filter(
    (day) => day.total > 0 && day.completed === day.total
  ).length;
  return { available, future, completedDays };
}
