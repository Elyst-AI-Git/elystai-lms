import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Play } from "lucide-react";
import Link from "next/link";
import { CoursePath } from "@/components/learn/course-path";
import { NextLessonCard } from "@/components/learn/next-lesson-card";
import { ProgressRing } from "@/components/learn/progress-ring";
import { requireEnrollment } from "@/lib/lms/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/lms/constants";
import { currentDayNumber, isUnlocked, unlockDate } from "@/lib/lms/drip";
import { getProgress } from "@/lib/lms/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // auth and enrollment state must never be cached

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

function formatDayContext(today: number, startsOn: string) {
  if (today < 0) return `Your cohort starts ${IST_DATE.format(unlockDate(0, startsOn))}.`;
  return `Day ${today + 1} is ready when you are.`;
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
      .select("id, title, content_type, duration_seconds, unlock_day_offset, position, is_preview, live_link, live_starts_at, modules!inner(course_id)")
      .eq("modules.course_id", course.id)
      .order("unlock_day_offset", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const availableLessons = (lessons ?? []).filter(
    (lesson) => lesson.is_preview || isUnlocked(lesson.unlock_day_offset, batch.starts_on, now)
  );
  const continueLesson = availableLessons.find((lesson) => !completedIds.has(lesson.id));
  const nextLive = (lessons ?? [])
    .filter((lesson) => lesson.live_starts_at && new Date(lesson.live_starts_at) > new Date(now.getTime() - 90 * 60_000))
    .sort((a, b) => new Date(a.live_starts_at!).getTime() - new Date(b.live_starts_at!).getTime())[0];
  const liveStarts = nextLive?.live_starts_at ? new Date(nextLive.live_starts_at) : null;
  const liveJoinable = Boolean(
    liveStarts && nextLive?.live_link && liveStarts.getTime() - now.getTime() < 30 * 60_000
  );
  const liveStarted = Boolean(liveStarts && liveStarts.getTime() <= now.getTime());
  const nextLiveAvailable = Boolean(
    nextLive && (nextLive.is_preview || isUnlocked(nextLive.unlock_day_offset, batch.starts_on, now))
  );
  const firstName = profile?.full_name?.split(" ")[0];
  const courseDays = progress.perDay.length;

  return (
    <div className="space-y-6 pb-3">
      <header className="rise" style={{ ["--stagger-i" as string]: 0 }}>
        <p className="eyebrow text-emerald">{course.title}</p>
        <h1 className="mt-1 text-h2 text-fg">{firstName ? `Welcome back, ${firstName}.` : "Welcome back."}</h1>
        <p className="mt-2 text-small text-fg-2">{formatDayContext(today, batch.starts_on)}</p>
      </header>

      <section className="rise flex items-center gap-4 rounded-card border border-border bg-white p-4 shadow-card sm:p-5" style={{ ["--stagger-i" as string]: 1 }}>
        <ProgressRing percent={progress.overallPercent} size={72} />
        <div className="min-w-0 flex-1">
          <p className="text-small font-bold text-fg">Your course progress</p>
          <p className="mt-1 text-label text-fg-3">
            {progress.completedLessons} of {progress.totalLessons} lessons complete
            {courseDays > 0 ? ` · ${courseDays} learning days` : ""}
          </p>
        </div>
      </section>

      {liveJoinable && nextLive?.live_link && liveStarts ? (
        <section className="rise rounded-card border border-green/30 bg-green/10 p-5" style={{ ["--stagger-i" as string]: 2 }}>
          <div className="flex items-center gap-2 text-label font-bold uppercase tracking-wide text-emerald">
            <span className="live-dot h-2 w-2 rounded-pill bg-emerald" />
            {liveStarted ? "Live now" : "Starting soon"}
          </div>
          <h2 className="mt-2 font-display text-h3 text-fg">{nextLive.title}</h2>
          <p className="mt-2 flex items-center gap-2 text-label text-fg-2">
            <CalendarClock className="h-4 w-4" aria-hidden />
            {liveStarted ? "Started" : "Starts"} {IST_TIME.format(liveStarts)} IST
          </p>
          <a className="pressable mt-5 flex min-h-12 w-full items-center justify-between rounded-md bg-emerald px-4 text-small font-bold text-fg-on-dark transition hover:bg-emerald-light" href={nextLive.live_link} rel="noreferrer" target="_blank">
            Join live session
            <Play className="h-4 w-4" aria-hidden />
          </a>
        </section>
      ) : continueLesson ? (
        <div className="rise" style={{ ["--stagger-i" as string]: 2 }}>
          <NextLessonCard courseSlug={course.slug} lesson={continueLesson} />
        </div>
      ) : (
        <section className="rise rounded-card border border-green/30 bg-green/10 p-5" style={{ ["--stagger-i" as string]: 2 }}>
          <CheckCircle2 className="h-6 w-6 text-emerald" aria-hidden />
          <h2 className="mt-3 font-display text-h3 text-fg">You&apos;re all caught up.</h2>
          <p className="mt-2 text-small text-fg-2">The next lesson will appear here as your cohort unlocks it.</p>
        </section>
      )}

      {!liveJoinable && nextLive && liveStarts && (
        <section className="rise rounded-card bg-surface-muted p-4" style={{ ["--stagger-i" as string]: 3 }}>
          <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-emerald">
            <Clock3 className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label font-bold uppercase tracking-wide text-emerald">Coming up</p>
            <p className="mt-0.5 truncate text-small font-bold text-fg">{nextLive.title}</p>
            <p className="text-label text-fg-3">{IST_DATE.format(liveStarts)} · {IST_TIME.format(liveStarts)} IST</p>
          </div>
          </div>
          {nextLiveAvailable && (
            <Link className="mt-3 inline-flex min-h-11 items-center gap-2 text-label font-bold text-emerald underline-offset-4 hover:underline" href={`/learn/${course.slug}/lesson/${nextLive.id}`}>
              Session details
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </section>
      )}

      <div className="rise" style={{ ["--stagger-i" as string]: 4 }}>
        <CoursePath courseSlug={course.slug} perDay={progress.perDay} today={today} />
      </div>

      <Link className="mx-auto flex min-h-11 w-fit items-center gap-2 px-3 text-label font-bold text-fg-3 underline-offset-4 hover:text-emerald hover:underline" href="/learn/vault">
        Browse your resource vault
      </Link>
    </div>
  );
}
