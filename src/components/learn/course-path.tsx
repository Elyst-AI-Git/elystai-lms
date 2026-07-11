import { ArrowRight, Check, LockKeyhole } from "lucide-react";
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
  locked = false,
}: {
  courseSlug: string;
  day: DayProgress;
  isToday?: boolean;
  locked?: boolean;
}) {
  const complete = day.total > 0 && day.completed === day.total;
  return (
    locked ? <div className="flex min-h-16 items-center gap-3 rounded-md px-3 py-2 opacity-60">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-label font-bold text-fg-3">{day.day + 1}</span>
      <span className="min-w-0 flex-1"><span className="block text-small font-bold text-fg-2">Day {day.day + 1}</span><span className="block text-label text-fg-3">Locked</span></span>
      <LockKeyhole className="h-4 w-4 text-fg-3" aria-label="Locked" />
    </div> : <Link
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
          {complete ? "Done" : "Not started"}
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
    <section aria-labelledby="course-path-heading" className="flex h-full flex-col rounded-card border border-border bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-emerald">Path</p>
          <h2 id="course-path-heading" className="mt-1 text-h2 text-fg">Day by day.</h2>
        </div>
        {availableDays.length > 0 && <span className="shrink-0 text-label font-bold text-fg-3">{completedDays}/{availableDays.length} days done</span>}
      </div>

      {perDay.length === 0 ? (
        <p className="mt-5 rounded-md bg-surface-muted px-4 py-3 text-small text-fg-2">Your first day will appear here when the cohort begins.</p>
      ) : (
        <div className="mt-4 min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {availableDays.map((day) => (
            <DayRow courseSlug={courseSlug} day={day} isToday={day.day === today} key={day.day} />
          ))}
          {futureDays.map((day) => <DayRow courseSlug={courseSlug} day={day} key={day.day} locked />)}
        </div>
      )}

    </section>
  );
}
