import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { LessonTypeIcon } from "@/components/learn/lesson-icon";
import { requireEnrollment } from "@/lib/lms/auth";
import { isUnlocked, unlockDate } from "@/lib/lms/drip";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { video: "Watch", text: "Read", task: "Build" };
const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
});

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export default async function DayView({
  params,
}: {
  params: Promise<{ courseSlug: string; n: string }>;
}) {
  const { courseSlug, n } = await params;
  const day = Number.parseInt(n, 10);
  if (!Number.isInteger(day) || day < 0) notFound();

  const { enrollment, batch, course } = await requireEnrollment(courseSlug);
  const now = new Date();
  const unlocked = isUnlocked(day, batch.starts_on, now);
  const supabase = await createServerSupabaseClient();
  const { data: lessons } = await supabase
    .schema("app")
    .from("lessons")
    .select("id, title, content_type, position, is_preview, duration_seconds, modules!inner(course_id, title)")
    .eq("modules.course_id", course.id)
    .eq("unlock_day_offset", day)
    .order("position", { ascending: true });
  if (!lessons?.length) notFound();

  const [{ data: done }, { data: dayOffsets }] = await Promise.all([
    supabase.schema("app").from("lesson_progress").select("lesson_id").eq("enrollment_id", enrollment.id),
    supabase.schema("app").from("lessons").select("unlock_day_offset, modules!inner(course_id)").eq("modules.course_id", course.id),
  ]);
  const doneIds = new Set((done ?? []).map((entry) => entry.lesson_id));
  const days = [...new Set((dayOffsets ?? []).map((lesson) => lesson.unlock_day_offset))].sort((a, b) => a - b);
  const dayIndex = days.indexOf(day);
  const previousDay = dayIndex > 0 ? days[dayIndex - 1] : null;
  const nextDay = dayIndex >= 0 && dayIndex < days.length - 1 ? days[dayIndex + 1] : null;
  const courseModule = Array.isArray(lessons[0].modules) ? lessons[0].modules[0] : lessons[0].modules;
  const completedCount = lessons.filter((lesson) => doneIds.has(lesson.id)).length;
  const nextLesson = lessons.find((lesson) => (unlocked || lesson.is_preview) && !doneIds.has(lesson.id));
  const hasPreview = lessons.some((lesson) => lesson.is_preview);
  const primaryIsPreview = Boolean(nextLesson?.is_preview && !unlocked);

  return (
    <article className="space-y-6 pb-2">
      <header className="rise" style={{ ["--stagger-i" as string]: 0 }}>
        <Link className="inline-flex min-h-11 items-center text-label font-bold text-fg-3 hover:text-emerald" href="/learn">
          ← Back to your course
        </Link>
        <p className="eyebrow mt-4 text-emerald">{courseModule?.title ?? "Learning plan"}</p>
        <h1 className="mt-1 text-h2 text-fg">Day {day + 1}</h1>
        <p className="mt-2 text-small text-fg-2">
          {unlocked
            ? `${completedCount} of ${lessons.length} lessons complete.`
            : hasPreview
              ? `A preview is ready now. The full day unlocks ${IST_DATE.format(unlockDate(day, batch.starts_on))}.`
              : `Unlocks ${IST_DATE.format(unlockDate(day, batch.starts_on))}.`}
        </p>
      </header>

      {!unlocked && !hasPreview && (
        <section className="rise rounded-card border border-border bg-surface-muted p-5" style={{ ["--stagger-i" as string]: 1 }}>
          <LockKeyhole className="h-6 w-6 text-emerald" aria-hidden />
          <h2 className="mt-3 font-display text-h3 text-fg">This day is waiting for you.</h2>
          <p className="mt-2 text-small text-fg-2">Come back on {IST_DATE.format(unlockDate(day, batch.starts_on))} for the full lesson plan.</p>
        </section>
      )}

      <section aria-labelledby="lesson-plan-heading" className="rise rounded-card border border-border bg-white p-4 shadow-card sm:p-5" style={{ ["--stagger-i" as string]: 2 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-emerald">Your lesson plan</p>
            <h2 id="lesson-plan-heading" className="mt-1 text-h3 text-fg">{primaryIsPreview ? "Start with a preview." : "Follow this order."}</h2>
          </div>
          <span className="text-label font-bold text-fg-3">{lessons.length} lessons</span>
        </div>

        <ol className="mt-5 space-y-3">
          {lessons.map((lesson, index) => {
            const clickable = unlocked || lesson.is_preview;
            const completed = doneIds.has(lesson.id);
            const primary = nextLesson?.id === lesson.id;
            const duration = formatDuration(lesson.duration_seconds);

            if (primary) {
              return (
                <li key={lesson.id}>
                  <Link className="pressable block rounded-md bg-emerald p-4 text-fg-on-dark transition hover:bg-emerald-light" href={`/learn/${course.slug}/lesson/${lesson.id}`}>
                    <p className="text-label font-bold uppercase tracking-wide text-green">{primaryIsPreview ? "Preview available" : "Start here"}</p>
                    <p className="mt-1 font-display text-h3 font-bold tracking-display">{lesson.title}</p>
                    <p className="mt-2 flex items-center gap-2 text-label text-fg-muted-dark">
                      <LessonTypeIcon className="h-3.5 w-3.5" type={lesson.content_type} />
                      {TYPE_LABEL[lesson.content_type] ?? "Lesson"}
                      {duration && <><span aria-hidden>•</span>{duration}</>}
                    </p>
                    <span className="mt-4 flex min-h-11 items-center justify-between rounded-md bg-green px-3 text-label font-bold text-ink">
                      {completed ? "Review lesson" : primaryIsPreview ? "Open preview" : "Start lesson"}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            }

            const row = (
              <>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-label font-bold ${completed ? "bg-emerald text-fg-on-dark" : clickable ? "bg-surface-muted text-fg-2" : "bg-surface-muted text-fg-3"}`}>
                  {completed ? <Check className="h-4 w-4" aria-hidden /> : clickable ? index + 1 : <LockKeyhole className="h-4 w-4" aria-label="Locked" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-small font-bold ${clickable ? "text-fg" : "text-fg-3"}`}>{lesson.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-label text-fg-3">
                    <LessonTypeIcon className="h-3.5 w-3.5" type={lesson.content_type} />
                    {completed ? "Complete" : TYPE_LABEL[lesson.content_type] ?? "Lesson"}
                    {duration && <><span aria-hidden>•</span>{duration}</>}
                  </span>
                </span>
                {clickable && <ArrowRight className="h-4 w-4 text-fg-3" aria-hidden />}
              </>
            );

            return (
              <li key={lesson.id}>
                {clickable ? (
                  <Link className="pressable flex min-h-16 items-center gap-3 rounded-md px-2 py-2 transition hover:bg-emerald/5" href={`/learn/${course.slug}/lesson/${lesson.id}`}>
                    {row}
                  </Link>
                ) : (
                  <div className="flex min-h-16 items-center gap-3 rounded-md px-2 py-2 opacity-70">{row}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <nav aria-label="Day navigation" className="flex items-center justify-between border-t border-border pt-4 text-label font-bold">
        {previousDay !== null ? <Link className="min-h-11 py-2 text-fg-3 hover:text-emerald" href={`/learn/${course.slug}/day/${previousDay}`}>← Day {previousDay + 1}</Link> : <span />}
        {nextDay !== null && <Link className="min-h-11 py-2 text-fg-3 hover:text-emerald" href={`/learn/${course.slug}/day/${nextDay}`}>Day {nextDay + 1} →</Link>}
      </nav>
    </article>
  );
}
