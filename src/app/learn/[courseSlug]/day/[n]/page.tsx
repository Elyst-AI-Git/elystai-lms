import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEnrollment } from "@/lib/lms/auth";
import { isUnlocked, unlockDate } from "@/lib/lms/drip";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPE_ICON: Record<string, string> = { video: "▶", text: "📄", task: "✏️" };

const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
});

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
    .select("id, title, content_type, position, is_preview, live_starts_at, modules!inner(course_id, title, position)")
    .eq("modules.course_id", course.id)
    .eq("unlock_day_offset", day)
    .order("position", { ascending: true });
  if (!lessons || lessons.length === 0) notFound();

  const { data: done } = await supabase
    .schema("app")
    .from("lesson_progress")
    .select("lesson_id")
    .eq("enrollment_id", enrollment.id);
  const doneIds = new Set((done ?? []).map((d) => d.lesson_id));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/learn" className="text-label text-fg-3 hover:text-emerald">← Dashboard</Link>
        <h1 className="mt-1 font-display text-h3 font-bold tracking-display text-fg">
          Day {day + 1}
        </h1>
        {!unlocked && (
          <p className="mt-1 text-small text-fg-3">
            Locked — unlocks {IST_DATE.format(unlockDate(day, batch.starts_on))}.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {lessons.map((lesson) => {
          const clickable = unlocked || lesson.is_preview;
          const completed = doneIds.has(lesson.id);
          const body = (
            <>
              <div className="flex items-center gap-3">
                <span aria-hidden>{TYPE_ICON[lesson.content_type] ?? "•"}</span>
                <div>
                  <p className={`font-semibold ${clickable ? "text-fg" : "text-fg-3"}`}>
                    {lesson.title}
                  </p>
                  <p className="text-label capitalize text-fg-3">{lesson.content_type}</p>
                </div>
              </div>
              <span aria-hidden className={completed ? "text-emerald" : "text-fg-3"}>
                {completed ? "✓" : clickable ? "→" : "🔒"}
              </span>
            </>
          );
          return clickable ? (
            <Link
              key={lesson.id}
              href={`/learn/${course.slug}/lesson/${lesson.id}`}
              className="flex items-center justify-between rounded-card bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
            >
              {body}
            </Link>
          ) : (
            <div
              key={lesson.id}
              className="flex items-center justify-between rounded-card bg-surface-muted p-4 opacity-70"
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
