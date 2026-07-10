import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckNode } from "@/components/learn/check-node";
import { requireEnrollment } from "@/lib/lms/auth";
import { isUnlocked, unlockDate } from "@/lib/lms/drip";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { video: "Video", text: "Read", task: "Task" };

const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
});

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
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
    .select(
      "id, title, content_type, position, is_preview, duration_seconds, live_starts_at, modules!inner(course_id, title, position)"
    )
    .eq("modules.course_id", course.id)
    .eq("unlock_day_offset", day)
    .order("position", { ascending: true });
  if (!lessons || lessons.length === 0) notFound();

  const [{ data: done }, { data: dayOffsets }] = await Promise.all([
    supabase
      .schema("app")
      .from("lesson_progress")
      .select("lesson_id")
      .eq("enrollment_id", enrollment.id),
    supabase
      .schema("app")
      .from("lessons")
      .select("unlock_day_offset, modules!inner(course_id)")
      .eq("modules.course_id", course.id),
  ]);
  const doneIds = new Set((done ?? []).map((d) => d.lesson_id));
  const days = [...new Set((dayOffsets ?? []).map((l) => l.unlock_day_offset))].sort((a, b) => a - b);
  const dayIdx = days.indexOf(day);
  const prevDay = dayIdx > 0 ? days[dayIdx - 1] : null;
  const nextDay = dayIdx >= 0 && dayIdx < days.length - 1 ? days[dayIdx + 1] : null;

  const firstModule = lessons[0] && (Array.isArray(lessons[0].modules) ? lessons[0].modules[0] : lessons[0].modules);
  const completedCount = lessons.filter((l) => doneIds.has(l.id)).length;

  return (
    <div className="space-y-6">
      {/* chapter header */}
      <div className="rise" style={{ ["--stagger-i" as string]: 0 }}>
        <Link href="/learn" className="text-label text-fg-3 hover:text-emerald">← Dashboard</Link>
        <div className="mt-2 flex items-end gap-4">
          <span className="font-display text-h1 font-bold leading-none tracking-display text-emerald">
            {day + 1}
          </span>
          <div className="pb-1.5">
            <p className="text-eyebrow font-semibold uppercase tracking-wide text-emerald">
              {firstModule?.title ?? "Day"}
            </p>
            <p className="text-label text-fg-3">
              {unlocked
                ? `${completedCount}/${lessons.length} complete`
                : `Locked — unlocks ${IST_DATE.format(unlockDate(day, batch.starts_on))}`}
            </p>
          </div>
        </div>
      </div>

      {/* connected checklist */}
      <ol className="relative space-y-0">
        {lessons.map((lesson, i) => {
          const clickable = unlocked || lesson.is_preview;
          const completed = doneIds.has(lesson.id);
          const duration = formatDuration(lesson.duration_seconds);
          const isLast = i === lessons.length - 1;
          const inner = (
            <>
              <div className="relative flex flex-col items-center self-stretch">
                <CheckNode done={completed} locked={!clickable} />
                {!isLast && <span className="w-0.5 flex-1 bg-border" aria-hidden />}
              </div>
              <div className={`min-w-0 flex-1 pb-6 ${isLast ? "pb-1" : ""}`}>
                <div
                  className={`pressable rounded-card p-4 transition-shadow ${
                    clickable
                      ? "bg-white shadow-card hover:shadow-card-hover"
                      : "bg-surface-muted opacity-70"
                  }`}
                >
                  <p className={`font-display font-bold ${clickable ? "text-fg" : "text-fg-3"}`}>
                    {lesson.title}
                  </p>
                  <p className="mt-0.5 text-label text-fg-3">
                    {TYPE_LABEL[lesson.content_type] ?? lesson.content_type}
                    {duration ? ` · ${duration}` : ""}
                    {lesson.is_preview && !unlocked ? " · free preview" : ""}
                  </p>
                </div>
              </div>
            </>
          );
          return (
            <li key={lesson.id} className="rise" style={{ ["--stagger-i" as string]: i + 1 }}>
              {clickable ? (
                <Link href={`/learn/${course.slug}/lesson/${lesson.id}`} className="flex gap-3">
                  {inner}
                </Link>
              ) : (
                <div className="flex gap-3">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>

      {/* day pager */}
      <nav className="flex items-center justify-between border-t border-border pt-4 text-label">
        {prevDay !== null ? (
          <Link href={`/learn/${course.slug}/day/${prevDay}`} className="font-medium text-fg-3 hover:text-emerald">
            ← Day {prevDay + 1}
          </Link>
        ) : (
          <span />
        )}
        {nextDay !== null && (
          <Link href={`/learn/${course.slug}/day/${nextDay}`} className="font-medium text-fg-3 hover:text-emerald">
            Day {nextDay + 1} →
          </Link>
        )}
      </nav>
    </div>
  );
}
