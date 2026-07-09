import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Progress calculation (spec D3): completion truth is app.lesson_progress
 * rows only. Heartbeats never count. Days are grouped by
 * lessons.unlock_day_offset; only lessons of the enrollment's course count.
 */

export interface DayProgress {
  day: number;
  total: number;
  completed: number;
}

export interface Progress {
  totalLessons: number;
  completedLessons: number;
  /** 0–100, rounded; 0 when the course has no lessons. */
  overallPercent: number;
  perDay: DayProgress[];
  completedLessonIds: string[];
}

export async function getProgress(enrollmentId: string): Promise<Progress> {
  const admin = createAdminSupabaseClient();

  const { data: enrollment, error: enrollmentError } = await admin
    .schema("app")
    .from("enrollments")
    .select("id, batches!inner(course_id)")
    .eq("id", enrollmentId)
    .single();
  if (enrollmentError || !enrollment) {
    throw new Error(`Enrollment not found: ${enrollmentId}`);
  }
  const batch = Array.isArray(enrollment.batches)
    ? enrollment.batches[0]
    : enrollment.batches;

  const [{ data: lessons, error: lessonsError }, { data: progressRows, error: progressError }] =
    await Promise.all([
      admin
        .schema("app")
        .from("lessons")
        .select("id, unlock_day_offset, modules!inner(course_id)")
        .eq("modules.course_id", batch.course_id),
      admin
        .schema("app")
        .from("lesson_progress")
        .select("lesson_id")
        .eq("enrollment_id", enrollmentId),
    ]);
  if (lessonsError) throw new Error(`Failed to load lessons: ${lessonsError.message}`);
  if (progressError) throw new Error(`Failed to load progress: ${progressError.message}`);

  const completedIds = new Set((progressRows ?? []).map((r) => r.lesson_id));
  const byDay = new Map<number, DayProgress>();
  let completedLessons = 0;

  for (const lesson of lessons ?? []) {
    const day = lesson.unlock_day_offset;
    const entry = byDay.get(day) ?? { day, total: 0, completed: 0 };
    entry.total += 1;
    if (completedIds.has(lesson.id)) {
      entry.completed += 1;
      completedLessons += 1;
    }
    byDay.set(day, entry);
  }

  const totalLessons = lessons?.length ?? 0;
  return {
    totalLessons,
    completedLessons,
    overallPercent:
      totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
    perDay: [...byDay.values()].sort((a, b) => a.day - b.day),
    completedLessonIds: [...completedIds],
  };
}
