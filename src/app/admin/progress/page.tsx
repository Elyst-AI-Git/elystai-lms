import Link from "next/link";
import { getProgress } from "@/lib/lms/progress";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminProgress() {
  const admin = createAdminSupabaseClient();
  const { data: enrollments } = await admin
    .schema("app")
    .from("enrollments")
    .select("id, profile_id, status, created_at, batches!inner(name)")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  // profiles live in public - PostgREST can't embed across schemas, so join here
  const profileIds = (enrollments ?? []).map((e) => e.profile_id);
  const { data: profiles } = profileIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows = await Promise.all(
    (enrollments ?? []).map(async (e) => {
      const profile = profileById.get(e.profile_id) ?? null;
      const batch = Array.isArray(e.batches) ? e.batches[0] : e.batches;
      const progress = await getProgress(e.id);
      return { id: e.id, profile, batch, progress };
    })
  );

  const cohortPercent =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + r.progress.overallPercent, 0) / rows.length);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow text-emerald">Learners</p>
          <h1 className="mt-1 text-h2 text-fg">Cohort progress</h1>
        </div>
        <p className="text-small text-fg-2">
          {rows.length} active learners · cohort average{" "}
          <span className="font-bold text-emerald">{cohortPercent}%</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-white shadow-card">
        <table className="w-full text-left text-small">
          <thead>
            <tr className="border-b border-border text-label uppercase tracking-wide text-fg-3">
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Overall</th>
              <th className="px-4 py-3">Per day</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-fg">{r.profile?.full_name ?? "-"}</p>
                  <p className="text-label text-fg-3">{r.profile?.email}</p>
                </td>
                <td className="px-4 py-3 text-fg-2">{r.batch?.name}</td>
                <td className="px-4 py-3">
                  <span className="font-bold text-emerald">{r.progress.overallPercent}%</span>
                  <span className="ml-1 text-label text-fg-3">
                    ({r.progress.completedLessons}/{r.progress.totalLessons})
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.progress.perDay.map((d) => (
                      <span
                        key={d.day}
                        title={`Day ${d.day + 1}: ${d.completed}/${d.total}`}
                        className={`inline-block h-4 w-4 rounded-sm ${
                          d.total > 0 && d.completed === d.total
                            ? "bg-emerald"
                            : d.completed > 0
                              ? "bg-green-mid/60"
                              : "bg-surface-muted"
                        }`}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/progress/${r.id}`} className="text-label font-semibold text-emerald">
                    Detail →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-fg-3">
                  No active enrollments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
