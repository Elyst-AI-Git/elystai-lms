import { requireEnrollment } from "@/lib/lms/auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/lms/constants";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const { user, enrollment, course } = await requireEnrollment(DEFAULT_COURSE_SLUG);

  const supabase = await createServerSupabaseClient();
  // RLS already scopes rows to the caller's batch (base rows + their batch's
  // overrides); ordering by module position groups them by Area.
  const { data: resources } = await supabase
    .schema("app")
    .from("resources")
    .select("id, title, url_or_storage_path, kind, sort_order, module_id, modules(title, position)")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  void logEvent({
    event: LMS_EVENTS.learner.vault.viewed,
    profileId: user.id,
    payload: { enrollmentId: enrollment.id },
  });

  interface ResourceRow {
    id: string;
    title: string;
    url_or_storage_path: string;
    kind: string;
    sort_order: number;
    module_id: string | null;
    modules: { title: string; position: number } | { title: string; position: number }[] | null;
  }
  const rows = (resources ?? []) as ResourceRow[];
  const groups = new Map<string, { title: string; position: number; items: ResourceRow[] }>();
  for (const r of rows) {
    const moduleRow = Array.isArray(r.modules) ? r.modules[0] : r.modules;
    const key = r.module_id ?? "general";
    const group = groups.get(key) ?? {
      title: moduleRow?.title ?? "General",
      position: moduleRow?.position ?? 999,
      items: [],
    };
    group.items.push(r);
    groups.set(key, group);
  }
  const sorted = [...groups.values()].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-h3 font-bold tracking-display text-fg">Resource Vault</h1>
      {sorted.length === 0 && (
        <p className="text-small text-fg-3">Resources will appear here as the course progresses.</p>
      )}
      {sorted.map((group) => (
        <section key={group.title} className="space-y-2">
          <h2 className="text-small font-semibold uppercase tracking-wide text-emerald">
            {group.title}
          </h2>
          {group.items.map((r) => (
            <a
              key={r.id}
              href={r.url_or_storage_path}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-card bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <p className="font-medium text-fg">{r.title}</p>
              <span className="rounded-pill bg-surface-muted px-2.5 py-1 text-micro font-semibold uppercase tracking-wide text-fg-3">
                {r.kind}
              </span>
            </a>
          ))}
        </section>
      ))}
    </div>
  );
}
