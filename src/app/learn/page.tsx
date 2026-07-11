import { CalendarDays, CheckCircle2 } from "lucide-react";
import { CoursePath } from "@/components/learn/course-path";
import { LearningPlanCanvas } from "@/components/learn/learning-plan-canvas";
import { ProgressRing } from "@/components/learn/progress-ring";
import { requireEnrollment } from "@/lib/lms/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/lms/constants";
import { currentDayNumber, isUnlocked } from "@/lib/lms/drip";
import { getProgressFromRows } from "@/lib/lms/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return <div className={`grid min-w-0 grid-rows-[3rem_auto_auto] rounded-card border border-border p-3 sm:p-4 ${tone}`}>
    <div className="flex h-12 items-center">{icon}</div>
    <p className="min-w-0 text-micro font-bold uppercase tracking-wide text-fg-3">{label}</p>
    <p className="mt-1 min-w-0 text-small font-bold text-fg">{value}</p>
  </div>;
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

      <section aria-label="Course overview" className="rise order-2 grid grid-cols-3 gap-2 sm:gap-3" style={{ ["--stagger-i" as string]: 1 }}>
        <StatCard icon={<ProgressRing percent={progress.overallPercent} size={44} />} label="Course progress" value={`${progress.overallPercent}% complete`} tone="bg-white" />
        <StatCard icon={<CheckCircle2 className="h-6 w-6 text-emerald" aria-hidden />} label="Lessons done" value={`${progress.completedLessons} of ${progress.totalLessons}`} tone="bg-green/5" />
        <StatCard icon={<CalendarDays className="h-6 w-6 text-emerald" aria-hidden />} label="Cohort rhythm" value={today >= 0 ? `Day ${today + 1} of ${progress.perDay.length}` : `Day 1 of ${progress.perDay.length}`} tone="bg-green/10" />
      </section>

      <div className="order-3 grid min-w-0 gap-6 lg:h-[34rem] lg:grid-cols-[minmax(0,1fr)_20rem]">
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
