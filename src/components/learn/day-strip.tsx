/**
 * Day-strip: one segment per course day - the primary progress read on the
 * dashboard hero (green = day fully done, bright outline = today, dim = ahead).
 */
import type { DayProgress } from "@/lib/lms/progress";

export function DayStrip({
  perDay,
  today,
}: {
  perDay: DayProgress[];
  today: number;
}) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Day ${today + 1} of ${perDay.length}`}>
      {perDay.map((d) => {
        const done = d.total > 0 && d.completed === d.total;
        const isToday = d.day === today;
        const past = d.day < today;
        return (
          <span
            key={d.day}
            title={`Day ${d.day + 1}: ${d.completed}/${d.total}`}
            className={`h-1.5 flex-1 rounded-pill transition-colors ${
              done
                ? "bg-green"
                : isToday
                  ? "bg-green/40 ring-1 ring-green"
                  : past
                    ? "bg-white/30"
                    : "bg-white/10"
            }`}
          />
        );
      })}
    </div>
  );
}
