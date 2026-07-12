import { ScheduleEditor } from "@/components/admin/schedule-editor";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSchedule() {
  const admin = createAdminSupabaseClient();
  const { data: batches } = await admin
    .schema("app")
    .from("batches")
    .select("id, name, starts_on, status, courses(title)")
    .order("starts_on", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-h3 font-bold tracking-display text-fg">Schedule</h1>
        <p className="mt-1 text-label text-fg-3">Set each cohort&apos;s launch date. This drives every lesson-unlock &mdash; change it and the whole 14-day drip shifts.</p>
      </div>
      <div className="space-y-3">
        {(batches ?? []).map((b) => {
          const course = Array.isArray(b.courses) ? b.courses[0] : b.courses;
          return (
            <ScheduleEditor
              key={b.id}
              batchId={b.id}
              name={`${course?.title ?? "Course"} · ${b.name} (${b.status})`}
              startsOn={b.starts_on}
            />
          );
        })}
        {(batches ?? []).length === 0 && (
          <p className="rounded-card bg-surface-muted p-4 text-small text-fg-3">No batches yet.</p>
        )}
      </div>
    </div>
  );
}
