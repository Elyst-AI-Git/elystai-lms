import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const IST_DATETIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function LearnerDrilldown({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  const admin = createAdminSupabaseClient();

  const { data: enrollment } = await admin
    .schema("app")
    .from("enrollments")
    .select("id, profile_id, batches!inner(course_id, name)")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!enrollment) notFound();
  // profiles live in public - cross-schema embed unsupported, fetch separately
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", enrollment.profile_id)
    .maybeSingle();
  const batch = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches;

  const [{ data: lessons }, { data: progress }] = await Promise.all([
    admin
      .schema("app")
      .from("lessons")
      .select("id, title, content_type, unlock_day_offset, modules!inner(course_id)")
      .eq("modules.course_id", batch.course_id)
      .order("unlock_day_offset", { ascending: true })
      .order("position", { ascending: true }),
    admin
      .schema("app")
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("enrollment_id", enrollmentId),
  ]);
  const doneAt = new Map((progress ?? []).map((p) => [p.lesson_id, p.completed_at]));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/progress" className="text-label text-fg-3 hover:text-emerald">← Cohort</Link>
        <h1 className="mt-1 text-h2 text-fg">
          {profile?.full_name ?? profile?.email}
        </h1>
        <p className="text-label text-fg-3">{profile?.email} · {batch.name}</p>
      </div>
      <ul className="space-y-1.5">
        {(lessons ?? []).map((l) => {
          const completedAt = doneAt.get(l.id);
          return (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-md bg-white px-4 py-2.5 shadow-card"
            >
              <div>
                <p className="font-medium text-fg">{l.title}</p>
                <p className="text-label text-fg-3">
                  Day {l.unlock_day_offset + 1} · {l.content_type}
                </p>
              </div>
              {completedAt ? (
                <span className="text-label font-semibold text-emerald">
                  ✓ {IST_DATETIME.format(new Date(completedAt))}
                </span>
              ) : (
                <span className="text-label text-fg-3">-</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
