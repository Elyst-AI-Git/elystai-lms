import { ArrowRight, Check, ChevronDown, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { partitionDays } from "@/lib/lms/plan";
import type { DayProgress } from "@/lib/lms/progress";

type CoursePathProps = {
  courseSlug: string;
  perDay: DayProgress[];
  today: number;
};

function DayRow({
  courseSlug,
  day,
  isToday = false,
}: {
  courseSlug: string;
  day: DayProgress;
  isToday?: boolean;
}) {
  const complete = day.total > 0 && day.completed === day.total;
  return (
    <Link
      className={`pressable flex min-h-16 items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-emerald/5 ${
        isToday ? "border border-emerald/25 bg-emerald/10" : ""
      }`}
      href={`/learn/${courseSlug}/day/${day.day}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-label font-bold ${
          complete ? "bg-emerald text-fg-on-dark" : isToday ? "bg-green text-ink" : "bg-surface-muted text-fg-2"
        }`}
      >
        {complete ? <Check className="h-4 w-4" aria-label="Complete" /> : day.day + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-small font-bold text-fg">Day {day.day + 1}</span>
        <span className="block text-label text-fg-3">
          {complete ? "Complete" : `${day.completed} of ${day.total} lessons complete`}
        </span>
      </span>
      {isToday && <span className="rounded-pill bg-white px-2 py-1 text-micro font-bold uppercase tracking-wide text-emerald">Today</span>}
      <ArrowRight className="h-4 w-4 shrink-0 text-fg-3" aria-hidden />
    </Link>
  );
}

export function CoursePath({ courseSlug, perDay, today }: CoursePathProps) {
  const { available: availableDays, future: futureDays, completedDays } = partitionDays(perDay, today);

  return (
    <section aria-labelledby="course-path-heading" className="rounded-card border border-border bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-emerald">Your learning path</p>
          <h2 id="course-path-heading" className="mt-1 text-h3 text-fg">Keep moving, one day at a time.</h2>
        </div>
        {availableDays.length > 0 && <span className="shrink-0 text-label font-bold text-fg-3">{completedDays}/{availableDays.length} days done</span>}
      </div>

      {availableDays.length === 0 ? (
        <p className="mt-5 rounded-md bg-surface-muted px-4 py-3 text-small text-fg-2">Your first day will appear here when the cohort begins.</p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {availableDays.map((day) => (
            <DayRow courseSlug={courseSlug} day={day} isToday={day.day === today} key={day.day} />
          ))}
        </div>
      )}

      {futureDays.length > 0 && (
        <details className="group mt-3 border-t border-border pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-label font-bold text-fg-2 marker:content-none">
            <span className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-fg-3" aria-hidden />
              See {futureDays.length} upcoming day{futureDays.length === 1 ? "" : "s"}
            </span>
            <ChevronDown className="h-4 w-4 text-fg-3 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-2 divide-y divide-border">
            {futureDays.map((day) => (
              <div className="flex min-h-14 items-center gap-3 px-3 py-2" key={day.day}>
                <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-surface-muted text-label font-bold text-fg-3">{day.day + 1}</span>
                <span className="flex-1 text-small font-bold text-fg-2">Day {day.day + 1}</span>
                <LockKeyhole className="h-4 w-4 text-fg-3" aria-label="Locked" />
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
