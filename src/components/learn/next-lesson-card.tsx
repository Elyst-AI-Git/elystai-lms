import { ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { LessonTypeIcon } from "@/components/learn/lesson-icon";
import { formatDurationLabel } from "@/lib/lms/plan";

type NextLesson = {
  id: string;
  title: string;
  content_type: string;
  duration_seconds: number | null;
  unlock_day_offset: number;
};

const TYPE_LABEL: Record<string, string> = {
  video: "Watch",
  text: "Read",
  task: "Build",
};

export function NextLessonCard({
  courseSlug,
  headingLevel = "h2",
  lesson,
}: {
  courseSlug: string;
  headingLevel?: "h2" | "h3";
  lesson: NextLesson;
}) {
  const duration = formatDurationLabel(lesson.duration_seconds);
  const Heading = headingLevel;

  return (
    <section aria-labelledby="next-lesson-heading" className="rounded-md bg-emerald p-5 text-fg-on-dark shadow-card sm:p-6">
      <div className="flex items-center gap-2 text-label font-bold uppercase tracking-wide text-green">
        <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-green/15">
          <LessonTypeIcon className="h-3.5 w-3.5" type={lesson.content_type} />
        </span>
        Your next step
      </div>
      <p className="mt-4 text-label font-semibold text-fg-muted-dark">Day {lesson.unlock_day_offset + 1}</p>
      <Heading id="next-lesson-heading" className="mt-1 font-display text-h3 font-bold tracking-display">
        {lesson.title}
      </Heading>
      <p className="mt-2 flex items-center gap-2 text-label text-fg-muted-dark">
        {TYPE_LABEL[lesson.content_type] ?? "Lesson"}
        {duration && (
          <>
            <span aria-hidden>•</span>
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {duration}
          </>
        )}
      </p>
      <Link
        className="pressable mt-5 flex min-h-12 w-full items-center justify-between rounded-md bg-green px-4 text-small font-bold text-ink transition hover:brightness-105"
        href={`/learn/${courseSlug}/lesson/${lesson.id}`}
      >
        Start this lesson
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
