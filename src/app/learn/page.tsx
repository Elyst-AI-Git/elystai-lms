import Link from "next/link";
import { requireEnrollment } from "@/lib/lms/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/lms/constants";
import { currentDayNumber, isUnlocked, unlockDate } from "@/lib/lms/drip";
import { getProgress } from "@/lib/lms/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // never cache auth/enrollment state

const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
});
const IST_DATETIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function LearnDashboard() {
  const { enrollment, batch, course } = await requireEnrollment(DEFAULT_COURSE_SLUG);
  const now = new Date();
  const today = currentDayNumber(batch.starts_on, now);
  const progress = await getProgress(enrollment.id);

  const supabase = await createServerSupabaseClient();
  const { data: liveLessons } = await supabase
    .schema("app")
    .from("lessons")
    .select("id, title, live_starts_at, modules!inner(course_id)")
    .eq("modules.course_id", course.id)
    .not("live_starts_at", "is", null)
    .gte("live_starts_at", now.toISOString())
    .order("live_starts_at", { ascending: true })
    .limit(1);
  const nextLive = liveLessons?.[0];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-eyebrow font-semibold uppercase tracking-wide text-emerald">
          {course.title}
        </p>
        <h1 className="font-display text-h3 font-bold tracking-display text-fg">
          {today < 0
            ? `Starts ${IST_DATE.format(unlockDate(0, batch.starts_on))}`
            : `Today is Day ${today + 1}`}
        </h1>
      </section>

      <section className="rounded-card bg-white p-5 shadow-card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-small font-semibold text-fg-2">Your progress</h2>
          <span className="font-display text-h3 font-bold text-emerald">
            {progress.overallPercent}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-muted">
          <div
            className="h-full rounded-pill bg-emerald transition-all"
            style={{ width: `${progress.overallPercent}%` }}
          />
        </div>
        <p className="mt-2 text-label text-fg-3">
          {progress.completedLessons} of {progress.totalLessons} lessons completed
        </p>
      </section>

      {nextLive && (
        <section className="rounded-card border border-emerald/20 bg-emerald/5 p-5">
          <p className="text-label font-semibold uppercase tracking-wide text-emerald">
            Next live session
          </p>
          <p className="mt-1 font-semibold text-fg">{nextLive.title}</p>
          <p className="text-label text-fg-3">
            {IST_DATETIME.format(new Date(nextLive.live_starts_at))} IST
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-small font-semibold text-fg-2">Day by day</h2>
        {progress.perDay.length === 0 && (
          <p className="text-small text-fg-3">Content is being prepared — check back soon.</p>
        )}
        {progress.perDay.map((day) => {
          const unlocked = isUnlocked(day.day, batch.starts_on, now);
          const isToday = day.day === today;
          return unlocked ? (
            <Link
              key={day.day}
              href={`/learn/${course.slug}/day/${day.day}`}
              className={`flex items-center justify-between rounded-card bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover ${
                isToday ? "ring-2 ring-emerald" : ""
              }`}
            >
              <div>
                <p className="font-semibold text-fg">
                  Day {day.day + 1}
                  {isToday && <span className="ml-2 text-label font-semibold text-emerald">Today</span>}
                </p>
                <p className="text-label text-fg-3">
                  {day.completed}/{day.total} done
                </p>
              </div>
              <span aria-hidden className="text-fg-3">→</span>
            </Link>
          ) : (
            <div
              key={day.day}
              className="flex items-center justify-between rounded-card bg-surface-muted p-4 opacity-70"
            >
              <div>
                <p className="font-semibold text-fg-3">Day {day.day + 1} · Locked</p>
                <p className="text-label text-fg-3">
                  Unlocks {IST_DATE.format(unlockDate(day.day, batch.starts_on))}
                </p>
              </div>
              <span aria-hidden className="text-fg-3">🔒</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
