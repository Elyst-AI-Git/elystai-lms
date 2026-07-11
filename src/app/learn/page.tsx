import { ArrowRight, LogOut } from "lucide-react";
import Link from "next/link";
import { CheckNode } from "@/components/learn/check-node";
import { LessonTypeIcon, LockIcon } from "@/components/learn/lesson-icon";
import { DayStrip } from "@/components/learn/day-strip";
import { ProgressRing } from "@/components/learn/progress-ring";
import { requireEnrollment } from "@/lib/lms/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/lms/constants";
import { currentDayNumber, isUnlocked, unlockDate } from "@/lib/lms/drip";
import { getProgress } from "@/lib/lms/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // never cache auth/enrollment state

const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const IST_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
});

// IST calendar-day difference (a session at 00:30 IST tonight is "tomorrow",
// not "today", regardless of hour distance).
const IST_DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function relativeDays(target: Date, now: Date): string {
  const days = Math.round(
    (Date.parse(IST_DAY_KEY.format(target)) - Date.parse(IST_DAY_KEY.format(now))) / 864e5
  );
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export default async function LearnDashboard() {
  const { user, enrollment, batch, course } = await requireEnrollment(DEFAULT_COURSE_SLUG);
  const now = new Date();
  const today = currentDayNumber(batch.starts_on, now);
  const progress = await getProgress(enrollment.id);
  const completedIds = new Set(progress.completedLessonIds);

  const supabase = await createServerSupabaseClient();
  const [{ data: profile }, { data: lessons }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .schema("app")
      .from("lessons")
      .select("id, title, content_type, unlock_day_offset, position, is_preview, live_link, live_starts_at, modules!inner(course_id)")
      .eq("modules.course_id", course.id)
      .order("unlock_day_offset", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];
  const continueLesson = (lessons ?? []).find(
    (l) =>
      !completedIds.has(l.id) &&
      (l.is_preview || isUnlocked(l.unlock_day_offset, batch.starts_on, now))
  );

  const nextLive = (lessons ?? [])
    .filter((l) => l.live_starts_at && new Date(l.live_starts_at) > new Date(now.getTime() - 90 * 60_000))
    .sort((a, b) => new Date(a.live_starts_at!).getTime() - new Date(b.live_starts_at!).getTime())[0];
  const liveStarts = nextLive?.live_starts_at ? new Date(nextLive.live_starts_at) : null;
  const liveJoinable =
    liveStarts !== null && liveStarts.getTime() - now.getTime() < 30 * 60_000 && nextLive?.live_link;

  return (
    <div className="space-y-5">
      {/* --- hero: today ---------------------------------------------------- */}
      <section className="surface-dark-hero rise rounded-card p-5" style={{ ["--stagger-i" as string]: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow font-semibold uppercase tracking-wide text-green">
              {firstName ? `Hey ${firstName}` : course.title}
            </p>
            <h1 className="mt-1 font-display text-h3 font-bold tracking-display">
              {today < 0
                ? `Starts ${IST_DATE.format(unlockDate(0, batch.starts_on))}`
                : `Day ${today + 1} of ${Math.max(...progress.perDay.map((d) => d.day + 1), today + 1)}`}
            </h1>
            <p className="tnum mt-1 text-label text-fg-muted-dark">
              {progress.completedLessons} of {progress.totalLessons} lessons done
            </p>
          </div>
          <ProgressRing percent={progress.overallPercent} onDark />
        </div>
        {progress.perDay.length > 0 && (
          <div className="mt-4">
            <DayStrip perDay={progress.perDay} today={today} />
          </div>
        )}
      </section>

      {/* --- continue -------------------------------------------------------- */}
      {continueLesson && (
        <Link
          href={`/learn/${course.slug}/lesson/${continueLesson.id}`}
          className="pressable rise flex items-center justify-between gap-4 rounded-card border-2 border-green/60 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
          style={{ ["--stagger-i" as string]: 1 }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald/10 text-emerald">
              <LessonTypeIcon type={continueLesson.content_type} />
            </span>
            <div className="min-w-0">
              <p className="text-label font-semibold uppercase tracking-wide text-emerald">Continue</p>
              <p className="mt-0.5 truncate font-display font-bold text-fg">{continueLesson.title}</p>
            </div>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-green text-ink">
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </span>
        </Link>
      )}

      {/* --- next live session ------------------------------------------------ */}
      {nextLive && liveStarts && (
        <section
          className="surface-dark-hero rise rounded-card p-5"
          style={{ ["--stagger-i" as string]: 2 }}
        >
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-pill bg-green" />
            <p className="text-label font-semibold uppercase tracking-wide text-green">
              Live session · {relativeDays(liveStarts, now)}
            </p>
          </div>
          <p className="mt-2 font-display text-body font-bold">{nextLive.title}</p>
          <p className="text-label text-fg-muted-dark">
            {IST_DATE.format(liveStarts)} · {IST_TIME.format(liveStarts)} IST
          </p>
          {liveJoinable ? (
            <a
              href={nextLive.live_link!}
              target="_blank"
              rel="noreferrer"
              className="pressable mt-4 inline-flex min-h-[48px] items-center justify-center rounded-md bg-green px-6 font-bold text-ink"
            >
              Join now
            </a>
          ) : (
            <Link
              href={`/learn/${course.slug}/lesson/${nextLive.id}`}
              className="mt-3 inline-block text-label font-semibold text-green"
            >
              Session details →
            </Link>
          )}
        </section>
      )}

      {/* --- day by day -------------------------------------------------------- */}
      <section className="space-y-2">
        <h2 className="text-small font-semibold text-fg-2">Day by day</h2>
        {progress.perDay.length === 0 && (
          <p className="text-small text-fg-3">Content is being prepared — check back soon.</p>
        )}
        {progress.perDay.map((day, i) => {
          const unlocked = isUnlocked(day.day, batch.starts_on, now);
          const isToday = day.day === today;
          const done = day.total > 0 && day.completed === day.total;
          const nextToUnlock =
            !unlocked && progress.perDay.filter((d) => !isUnlocked(d.day, batch.starts_on, now))[0]?.day === day.day;

          const numeral = String(day.day + 1).padStart(2, "0");

          if (unlocked && done && !isToday) {
            // completed past day: slim row
            return (
              <Link
                key={day.day}
                href={`/learn/${course.slug}/day/${day.day}`}
                className="pressable rise flex items-center gap-3 rounded-card bg-white/60 px-4 py-2.5"
                style={{ ["--stagger-i" as string]: i + 3 }}
              >
                <span className="tnum w-9 font-display text-small font-bold text-fg-3">{numeral}</span>
                <CheckNode done />
                <p className="flex-1 text-small font-medium text-fg-2">Day {day.day + 1}</p>
                <span className="tnum text-label text-fg-3">{day.completed}/{day.total}</span>
              </Link>
            );
          }
          return unlocked ? (
            <Link
              key={day.day}
              href={`/learn/${course.slug}/day/${day.day}`}
              className={`pressable rise flex items-center justify-between rounded-card bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover ${
                isToday ? "ring-2 ring-emerald" : ""
              }`}
              style={{ ["--stagger-i" as string]: i + 3 }}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`tnum w-12 font-display text-h2 font-bold leading-none tracking-display ${
                    isToday ? "text-emerald" : "text-fg-3/40"
                  }`}
                >
                  {numeral}
                </span>
                <div>
                  <p className="font-display font-bold text-fg">
                    Day {day.day + 1}
                    {isToday && (
                      <span className="ml-2 rounded-pill bg-green/15 px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-emerald">
                        Today
                      </span>
                    )}
                  </p>
                  <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-pill bg-surface-muted">
                    <div
                      className="bar-progress h-full rounded-pill bg-emerald"
                      style={{ width: `${day.total ? (day.completed / day.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <span className="tnum text-label text-fg-3">
                {day.completed}/{day.total}
              </span>
            </Link>
          ) : (
            <div
              key={day.day}
              className="rise flex items-center justify-between rounded-card bg-surface-muted p-4"
              style={{ ["--stagger-i" as string]: i + 3 }}
            >
              <div className="flex items-center gap-4">
                <span className="tnum w-12 font-display text-h2 font-bold leading-none tracking-display text-fg-3/30">
                  {numeral}
                </span>
                <div>
                  <p className="font-display font-bold text-fg-2">Day {day.day + 1}</p>
                  <p className="text-label text-fg-3">
                    Unlocks {IST_DATE.format(unlockDate(day.day, batch.starts_on))}
                  </p>
                </div>
              </div>
              <span className={nextToUnlock ? "live-dot text-fg-3" : "text-fg-3"}>
                <LockIcon />
              </span>
            </div>
          );
        })}
      </section>
      <form action="/api/auth/signout" className="pt-3 text-center" method="post">
        <button className="inline-flex min-h-11 items-center gap-2 px-3 text-label font-semibold text-fg-3 underline-offset-4 hover:text-emerald hover:underline" type="submit">
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}
