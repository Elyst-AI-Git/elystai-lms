import { CoursePath } from "@/components/learn/course-path";
import { LearningPlanCanvas } from "@/components/learn/learning-plan-canvas";
import { ProgressRing } from "@/components/learn/progress-ring";
import { requireEnrollment } from "@/lib/lms/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/lms/constants";
import { currentDayNumber, isUnlocked } from "@/lib/lms/drip";
import { getProgressFromRows } from "@/lib/lms/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function StatStrip({
  label,
  value,
  right,
  reverseOnMobile = false,
  tone,
}: {
  label: string;
  value?: string;
  right?: React.ReactNode;
  reverseOnMobile?: boolean;
  tone: string;
}) {
  // reverseOnMobile flips label/value order on mobile only (sm: restores it),
  // giving the alternating strip pattern the dashboard asks for.
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 ${tone} ${
        reverseOnMobile ? "flex-row-reverse sm:flex-row" : ""
      }`}
    >
      <p className="min-w-0 text-micro font-bold uppercase tracking-wide text-fg-3">{label}</p>
      {right ?? <p className="shrink-0 text-h3 font-bold leading-none text-fg">{value}</p>}
    </div>
  );
}

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
      .select("id, title, content_type, duration_seconds, unlock_day_offset, position, is_preview, modules!inner(course_id)")
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
  const firstName = profile?.full_name?.split(" ")[0] ?? user.user_metadata.full_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 pb-3">
      <header className="rise order-1 flex flex-wrap items-end justify-between gap-4" style={{ ["--stagger-i" as string]: 0 }}>
        <div>
          <p className="eyebrow text-emerald">AI for Work</p>
          <h1 className="mt-1 text-h1 text-fg">{firstName ? `${firstName}'s learning plan` : "Your learning plan"}</h1>
        </div>
      </header>

      <section aria-label="Course overview" className="rise order-2 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" style={{ ["--stagger-i" as string]: 1 }}>
        <StatStrip label="Course progress" tone="bg-white" right={<ProgressRing percent={progress.overallPercent} size={48} />} />
        <StatStrip label="Lessons done" tone="bg-green/5" reverseOnMobile value={`${progress.completedLessons} of ${progress.totalLessons}`} />
        <StatStrip
          label="Cohort rhythm"
          tone="bg-green/10"
          value={
            progress.perDay.length === 0
              ? "Starting soon"
              : today >= 0
                ? `Day ${today + 1} of ${progress.perDay.length}`
                : `Day 1 of ${progress.perDay.length}`
          }
        />
      </section>

      <div className="order-3 grid min-w-0 gap-6 lg:h-[max(28.5rem,calc(100dvh-26rem))] lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[minmax(0,1fr)]">
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
