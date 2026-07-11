import { ArrowRight, Check, CircleCheckBig, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { NextLessonCard } from "@/components/learn/next-lesson-card";
import { unlockDate } from "@/lib/lms/drip";
import {
  planHeadline,
  queuedLessons as selectQueuedLessons,
  selectNextLesson,
} from "@/lib/lms/plan";

type LessonSummary = {
  id: string;
  title: string;
  content_type: string;
  duration_seconds: number | null;
  unlock_day_offset: number;
  is_preview: boolean;
  isUnlocked: boolean;
};

const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function LearningPlanCanvas({
  courseSlug,
  lessons,
  completedLessonIds,
  today,
  batchStartsOn,
}: {
  courseSlug: string;
  lessons: LessonSummary[];
  completedLessonIds: string[];
  today: number;
  batchStartsOn: string;
}) {
  const completed = new Set(completedLessonIds);
  const nextLesson = selectNextLesson(lessons.filter((lesson) => lesson.isUnlocked), completedLessonIds);
  const queuedLessons = nextLesson ? selectQueuedLessons(lessons, nextLesson.id, 2) : [];
  const { headline } = planHeadline(nextLesson, today);

  return (
    <section aria-labelledby="learning-plan-heading" className="flex h-full flex-col rounded-md border border-border bg-white p-4 shadow-card sm:p-5">
      <div className="min-w-0">
        <div>
          <p className="eyebrow text-emerald">Your learning plan</p>
          <h2 id="learning-plan-heading" className="mt-1 text-h3 text-fg">{headline}</h2>
        </div>
      </div>

      {nextLesson ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <NextLessonCard courseSlug={courseSlug} headingLevel="h3" lesson={nextLesson} />
          <div className="rounded-md border border-border bg-surface-muted p-4">
            <p className="text-label font-bold uppercase tracking-wide text-emerald">Up next in your plan</p>
            {queuedLessons.length > 0 ? (
              <ol className="mt-4 space-y-1">
                {queuedLessons.map((lesson, index) => {
                  const isDone = completed.has(lesson.id);
                  const dateLabel = `Day ${lesson.unlock_day_offset + 1} · ${IST_DATE.format(unlockDate(lesson.unlock_day_offset, batchStartsOn))}`;
                  const row = (
                    <>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-label font-bold ${isDone ? "bg-emerald text-fg-on-dark" : lesson.isUnlocked ? "bg-white text-fg-2" : "bg-surface-muted text-fg-3"}`}>
                        {isDone ? <Check className="h-4 w-4" aria-hidden /> : lesson.isUnlocked ? index + 1 : <LockKeyhole className="h-4 w-4" aria-label="Locked" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-small font-bold leading-snug text-fg">{lesson.title}</span>
                        <span className="mt-1 block text-label text-fg-3">
                          {isDone ? "Complete" : lesson.isUnlocked ? dateLabel : `${dateLabel} · Locked`}
                        </span>
                      </span>
                      <ArrowRight className={`h-4 w-4 shrink-0 ${lesson.isUnlocked ? "text-fg-3" : "text-border"}`} aria-hidden />
                    </>
                  );
                  return <li key={lesson.id}>{lesson.isUnlocked ? <Link className="pressable flex min-h-16 items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-emerald/5" href={`/learn/${courseSlug}/lesson/${lesson.id}`}>{row}</Link> : <div className="flex min-h-16 items-center gap-3 px-2 py-2.5 opacity-60">{row}</div>}</li>;
                })}
              </ol>
            ) : (
              <p className="mt-3 text-small text-fg-2">One focused lesson is enough for now. Your next step will appear as you move through the plan.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-md bg-green/10 p-4">
          <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden />
          <div>
            <p className="text-small font-bold text-fg">You&apos;re caught up.</p>
            <p className="mt-1 text-label text-fg-2">Your next unlocked lesson will be added to this plan automatically.</p>
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-center gap-2 border-t border-border pt-4 text-center text-label text-fg-3">
        <LockKeyhole className="h-4 w-4" aria-hidden />New days unlock with your cohort
      </div>
    </section>
  );
}
