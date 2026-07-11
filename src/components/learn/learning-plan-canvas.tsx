import { Check, CircleCheckBig, Clock3, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { LessonTypeIcon } from "@/components/learn/lesson-icon";
import { NextLessonCard } from "@/components/learn/next-lesson-card";

type LessonSummary = {
  id: string;
  title: string;
  content_type: string;
  duration_seconds: number | null;
  unlock_day_offset: number;
  is_preview: boolean;
};

const TYPE_LABEL: Record<string, string> = { video: "Watch", text: "Read", task: "Build" };

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function LearningPlanCanvas({
  courseSlug,
  lessons,
  completedLessonIds,
  today,
}: {
  courseSlug: string;
  lessons: LessonSummary[];
  completedLessonIds: string[];
  today: number;
}) {
  const completed = new Set(completedLessonIds);
  const nextLesson = lessons.find((lesson) => !completed.has(lesson.id));
  const nextLessonIndex = nextLesson ? lessons.findIndex((lesson) => lesson.id === nextLesson.id) : -1;
  const queuedLessons = nextLessonIndex >= 0 ? lessons.slice(nextLessonIndex + 1, nextLessonIndex + 4) : [];
  const catchingUp = Boolean(nextLesson && today >= 0 && nextLesson.unlock_day_offset < today);
  const previewAhead = Boolean(nextLesson && nextLesson.is_preview && nextLesson.unlock_day_offset > today);

  return (
    <section aria-labelledby="learning-plan-heading" className="rounded-card border border-border bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-emerald">Your learning plan</p>
          <h2 id="learning-plan-heading" className="mt-1 text-h3 text-fg">
            {previewAhead && nextLesson
              ? `Preview available for Day ${nextLesson.unlock_day_offset + 1}.`
              : catchingUp && nextLesson
                ? `Continue with Day ${nextLesson.unlock_day_offset + 1}.`
                : "Today&apos;s focused work."}
          </h2>
        </div>
        {(previewAhead || today >= 0) && <span className="rounded-pill bg-emerald/10 px-3 py-1.5 text-label font-bold text-emerald">{previewAhead ? "Preview" : catchingUp ? "Catching up" : `Day ${today + 1}`}</span>}
      </div>

      {nextLesson ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <NextLessonCard courseSlug={courseSlug} headingLevel="h3" lesson={nextLesson} />
          <div className="rounded-md border border-border bg-surface-muted p-4">
            <p className="text-label font-bold uppercase tracking-wide text-emerald">Up next in your plan</p>
            {queuedLessons.length > 0 ? (
              <ol className="mt-3 divide-y divide-border">
                {queuedLessons.map((lesson, index) => {
                  const isDone = completed.has(lesson.id);
                  const isNext = lesson.id === nextLesson.id;
                  const duration = formatDuration(lesson.duration_seconds);
                  return (
                    <li className="flex min-h-16 items-center gap-3 py-2" key={lesson.id}>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-label font-bold ${isDone ? "bg-emerald text-fg-on-dark" : isNext ? "bg-green text-ink" : "bg-white text-fg-2"}`}>
                        {isDone ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small font-bold text-fg">{lesson.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-label text-fg-3">
                          <LessonTypeIcon className="h-3.5 w-3.5" type={lesson.content_type} />
                          {isDone ? "Complete" : TYPE_LABEL[lesson.content_type] ?? "Lesson"}
                          {duration && <><span aria-hidden>•</span>{duration}</>}
                        </span>
                      </span>
                    </li>
                  );
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

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-label text-fg-3">
        <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden />Work at your own pace</span>
        <span className="flex items-center gap-1.5"><LockKeyhole className="h-4 w-4" aria-hidden />New days unlock with your cohort</span>
        {nextLesson && <Link className="ml-auto min-h-11 py-2 font-bold text-emerald underline-offset-4 hover:underline" href={`/learn/${courseSlug}/day/${nextLesson.unlock_day_offset}`}>Open Day {nextLesson.unlock_day_offset + 1} plan</Link>}
      </div>
    </section>
  );
}
