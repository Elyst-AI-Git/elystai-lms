import { CalendarDays, CheckCircle2, Clock3, Play } from "lucide-react";
import { CoursePath } from "@/components/learn/course-path";
import { LearningPlanCanvas } from "@/components/learn/learning-plan-canvas";
import { ProgressRing } from "@/components/learn/progress-ring";
import { requireEnrollment } from "@/lib/lms/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/lms/constants";
import { currentDayNumber, isUnlocked } from "@/lib/lms/drip";
import { getProgressFromRows } from "@/lib/lms/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const IST_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
});

export default async function LearnDashboard() {
  const { user, enrollment, batch, course } = await requireEnrollment(DEFAULT_COURSE_SLUG);
  const now = new Date();
  const today = currentDayNumber(batch.starts_on, now);
  const supabase = await createServerSupabaseClient();
  const [{ data: profile }, { data: lessons }, { data: progressRows }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .schema("app")
      .from("lessons")
      .select("id, title, content_type, duration_seconds, unlock_day_offset, position, is_preview, live_link, live_starts_at, modules!inner(course_id)")
      .eq("modules.course_id", course.id)
      .order("unlock_day_offset", { ascending: true })
      .order("position", { ascending: true }),
    supabase.schema("app").from("lesson_progress").select("lesson_id").eq("enrollment_id", enrollment.id),
  ]);

  const progress = getProgressFromRows(lessons ?? [], progressRows ?? []);

  const allLessons = (lessons ?? []).map((lesson) => ({
    ...lesson,
    isUnlocked: lesson.is_preview || isUnlocked(lesson.unlock_day_offset, batch.starts_on, now),
  }));
  const completedLessonIds = progress.completedLessonIds;
  const nextLive = (lessons ?? [])
    .filter((lesson) => lesson.live_starts_at && new Date(lesson.live_starts_at) > new Date(now.getTime() - 90 * 60_000))
    .sort((a, b) => new Date(a.live_starts_at!).getTime() - new Date(b.live_starts_at!).getTime())[0];
  const liveStarts = nextLive?.live_starts_at ? new Date(nextLive.live_starts_at) : null;
  const nextLiveAvailable = Boolean(nextLive && (nextLive.is_preview || isUnlocked(nextLive.unlock_day_offset, batch.starts_on, now)));
  const liveJoinable = Boolean(nextLiveAvailable && liveStarts && nextLive?.live_link && liveStarts.getTime() - now.getTime() < 30 * 60_000);
  const liveStarted = Boolean(liveStarts && liveStarts.getTime() <= now.getTime());
  const firstName = profile?.full_name?.split(" ")[0] ?? user.user_metadata.full_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 pb-3">
      <header className="rise order-1 flex flex-wrap items-end justify-between gap-4" style={{ ["--stagger-i" as string]: 0 }}>
        <div>
          <p className="eyebrow text-emerald">AI for Work</p>
          <h1 className="mt-1 text-h1 text-fg">{firstName ? `${firstName}'s learning plan` : "Your learning plan"}</h1>
        </div>
      </header>

      {liveJoinable && nextLive?.live_link && liveStarts && (
        <section className="rise order-2 rounded-card border border-green/30 bg-green/10 p-4 lg:hidden" style={{ ["--stagger-i" as string]: 1 }}>
          <p className="text-label font-bold uppercase tracking-wide text-emerald">{liveStarted ? "Live now" : "Starting soon"}</p>
          <h2 className="mt-1 font-display text-h3 text-fg">{nextLive.title}</h2>
          <p className="mt-2 flex items-center gap-2 text-label text-fg-2"><Clock3 className="h-4 w-4" aria-hidden />{liveStarted ? "Started" : "Starts"} {IST_TIME.format(liveStarts)} IST</p>
          <a className="pressable mt-4 flex min-h-12 w-full items-center justify-between rounded-md bg-emerald px-4 text-small font-bold text-fg-on-dark hover:bg-emerald-light" href={nextLive.live_link} rel="noreferrer" target="_blank">
            Join live session
            <Play className="h-4 w-4" aria-hidden />
          </a>
        </section>
      )}

      <section aria-label="Course overview" className={`rise grid grid-cols-3 gap-2 sm:gap-3 lg:order-2 ${liveJoinable ? "order-4" : "order-3"}`} style={{ ["--stagger-i" as string]: 1 }}>
        <div className="rounded-card border border-border bg-white p-2.5 sm:p-4">
          <ProgressRing percent={progress.overallPercent} size={44} />
          <p className="mt-1 text-micro font-bold uppercase tracking-wide text-fg-3 sm:mt-3">Course progress</p>
          <p className="mt-1 text-small font-bold text-fg">{progress.overallPercent}% complete</p>
        </div>
        <div className="rounded-card border border-border bg-surface-muted p-2.5 sm:p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald" aria-hidden />
          <p className="mt-1 text-micro font-bold uppercase tracking-wide text-fg-3 sm:mt-3">Lessons done</p>
          <p className="mt-1 text-small font-bold text-fg">{progress.completedLessons} of {progress.totalLessons}</p>
        </div>
        <div className="rounded-card border border-green/30 bg-green/10 p-2.5 sm:p-4">
          <CalendarDays className="h-5 w-5 text-emerald" aria-hidden />
          <p className="mt-1 text-micro font-bold uppercase tracking-wide text-fg-3 sm:mt-3">Cohort rhythm</p>
          <p className="mt-1 text-small font-bold text-fg">{today >= 0 ? `Day ${today + 1} of ${progress.perDay.length}` : `Day 1 of ${progress.perDay.length}`}</p>
        </div>
      </section>

      <div className={`grid gap-6 lg:order-3 lg:grid-cols-[minmax(0,1fr)_20rem] ${liveJoinable ? "order-3" : "order-2"}`}>
        <div className="rise lg:h-full" style={{ ["--stagger-i" as string]: 2 }}>
          <LearningPlanCanvas courseSlug={course.slug} completedLessonIds={completedLessonIds} lessons={allLessons} today={today} />
        </div>
        <div className="rise lg:h-full" style={{ ["--stagger-i" as string]: 3 }}>
          <CoursePath courseSlug={course.slug} perDay={progress.perDay} today={today} />
        </div>
      </div>
    </div>
  );
}
