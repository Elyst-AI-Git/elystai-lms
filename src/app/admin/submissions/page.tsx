import Link from "next/link";
import { ReviewForm } from "@/components/admin/review-form";
import { getSubmissionSignedUrl } from "@/lib/lms/storage";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "submitted", "reviewed", "needs_attention"] as const;

const IST_DATETIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-surface-muted text-fg-2",
  reviewed: "bg-emerald/10 text-emerald",
  needs_attention: "bg-destructive/10 text-destructive",
};

export default async function AdminSubmissions({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as (typeof STATUSES)[number]) ? status : "all";

  const admin = createAdminSupabaseClient();
  let query = admin
    .schema("app")
    .from("submissions")
    .select(
      "id, url, storage_path, note, status, reviewer_note, created_at, lessons:lesson_id(title), enrollments:enrollment_id(profile_id)"
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") query = query.eq("status", filter!);
  const { data: submissions } = await query;

  // profiles live in public - cross-schema embed unsupported, fetch separately
  const profileIds = [
    ...new Set(
      (submissions ?? [])
        .map((s) => {
          const e = Array.isArray(s.enrollments) ? s.enrollments[0] : s.enrollments;
          return e?.profile_id as string | undefined;
        })
        .filter(Boolean)
    ),
  ] as string[];
  const { data: profiles } = profileIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const withUrls = await Promise.all(
    (submissions ?? []).map(async (s) => ({
      ...s,
      screenshotUrl: s.storage_path ? await getSubmissionSignedUrl(s.storage_path) : null,
    }))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-h3 font-bold tracking-display text-fg">Submissions</h1>
        <div className="flex gap-2 text-label">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/admin/submissions" : `/admin/submissions?status=${s}`}
              className={`rounded-pill px-3 py-1 font-semibold ${
                filter === s ? "bg-emerald text-fg-on-dark" : "bg-surface-muted text-fg-2"
              }`}
            >
              {s.replace("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {withUrls.map((s) => {
          const enrollment = Array.isArray(s.enrollments) ? s.enrollments[0] : s.enrollments;
          const profile = enrollment ? profileById.get(enrollment.profile_id) : null;
          const lesson = Array.isArray(s.lessons) ? s.lessons[0] : s.lessons;
          return (
            <article key={s.id} className="space-y-3 rounded-card bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-fg">{profile?.full_name ?? profile?.email}</p>
                  <p className="text-label text-fg-3">
                    {lesson?.title} · {IST_DATETIME.format(new Date(s.created_at))} IST
                  </p>
                </div>
                <span className={`rounded-pill px-2.5 py-1 text-micro font-semibold uppercase tracking-wide ${STATUS_BADGE[s.status]}`}>
                  {s.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-small">
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-emerald underline">
                    Open link
                  </a>
                )}
                {s.screenshotUrl && (
                  <a href={s.screenshotUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald underline">
                    View screenshot
                  </a>
                )}
                {s.note && <span className="text-fg-2">“{s.note}”</span>}
              </div>
              {s.reviewer_note && (
                <p className="text-label text-fg-3">Reviewer note: {s.reviewer_note}</p>
              )}
              <ReviewForm submissionId={s.id} currentStatus={s.status} currentNote={s.reviewer_note} />
            </article>
          );
        })}
        {withUrls.length === 0 && <p className="py-6 text-center text-fg-3">No submissions here.</p>}
      </div>
    </div>
  );
}
