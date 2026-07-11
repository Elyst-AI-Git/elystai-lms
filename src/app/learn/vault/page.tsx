import { ArrowUpRight, LibraryBig } from "lucide-react";
import { ResourceKindIcon } from "@/components/learn/lesson-icon";
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
    .select("id, title, url_or_storage_path, kind, sort_order, module_id, batch_id, modules(title, position)")
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
    batch_id: string | null;
    modules: { title: string; position: number } | { title: string; position: number }[] | null;
  }
  const rows = (resources ?? []) as ResourceRow[];
  const batchOnlyIds = new Set(rows.filter((r) => r.batch_id).map((r) => r.id));
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

  const resourceCount = rows.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-3">
      <header className="rise flex flex-wrap items-end justify-between gap-4" style={{ ["--stagger-i" as string]: 0 }}>
        <div>
          <p className="eyebrow text-emerald">{course.title}</p>
          <h1 className="mt-1 text-h1 text-fg">Resource library</h1>
          <p className="mt-2 text-small text-fg-2">Useful templates, recordings, and reference material — organised by your learning plan.</p>
        </div>
        <span className="rounded-pill bg-emerald/10 px-3 py-1.5 text-label font-bold text-emerald">{resourceCount} resources</span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="space-y-5">
          {sorted.length === 0 && (
            <p className="rounded-card border border-border bg-white p-5 text-small text-fg-3">Resources will appear here as the course progresses.</p>
          )}
          {sorted.map((group, gi) => (
            <section className="rise rounded-card border border-border bg-white p-4 shadow-card sm:p-5" key={group.title} style={{ ["--stagger-i" as string]: gi + 1 }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow text-emerald">Learning area</p>
                  <h2 className="mt-1 text-h3 text-fg">{group.title}</h2>
                </div>
                <span className="text-label font-bold text-fg-3">{group.items.length} resources</span>
              </div>
              <div className="mt-4 divide-y divide-border">
                {group.items.map((resource) => (
                  <a
                    className="pressable flex min-h-16 items-center gap-3 py-3 transition-colors hover:bg-emerald/5"
                    href={resource.url_or_storage_path}
                    key={resource.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald/10 text-emerald">
                      <ResourceKindIcon kind={resource.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-bold text-fg">{resource.title}</span>
                      <span className="mt-0.5 block text-label text-fg-3">{resource.kind}<span className="sr-only">, opens in a new tab</span></span>
                    </span>
                    {batchOnlyIds.has(resource.id) && <span className="hidden rounded-pill bg-green/15 px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-emerald sm:inline">Your batch</span>}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-fg-3" aria-hidden />
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="rise h-fit rounded-card border border-green/30 bg-green/10 p-5" style={{ ["--stagger-i" as string]: 1 }}>
          <LibraryBig className="h-6 w-6 text-emerald" aria-hidden />
          <h2 className="mt-3 font-display text-h3 text-fg">Make this yours.</h2>
          <p className="mt-2 text-small text-fg-2">Come back here whenever you need a template, recording, or reference for this week&apos;s work.</p>
        </aside>
      </div>
    </div>
  );
}
