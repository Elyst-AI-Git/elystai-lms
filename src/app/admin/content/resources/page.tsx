import { RowActions } from "@/components/admin/crud";
import { ResourceForm } from "@/components/admin/resource-form";
import { isExternalLink } from "@/lib/lms/materials";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminResources() {
  const admin = createAdminSupabaseClient();
  const [{ data: courses }, { data: resources }, { data: lessons }] = await Promise.all([
    admin
      .schema("app")
      .from("courses")
      .select("id, title, modules(id, title, position), batches(id, name)")
      .order("created_at", { ascending: true }),
    admin
      .schema("app")
      .from("resources")
      .select("id, course_id, title, url_or_storage_path, kind, sort_order, module_id, batch_id, modules(title), batches(name)")
      .order("sort_order", { ascending: true }),
    admin.schema("app").from("lessons").select("id, title, modules!inner(course_id)").order("unlock_day_offset", { ascending: true }).order("position", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-emerald">PDFs &amp; links</p>
        <h1 className="mt-1 text-h2 text-fg">Resources</h1>
        <p className="mt-1 text-label text-fg-3">Attach a PDF to a specific day (lesson) so it shows under that day&apos;s Materials, or leave it general for the vault.</p>
      </div>
      {(courses ?? []).map((course) => {
        const courseResources = (resources ?? []).filter((r) => r.course_id === course.id);
        const siblings: [string, number][] = courseResources.map((r, i) => [r.id, i]);
        return (
          <section key={course.id} className="space-y-3 rounded-md border border-border bg-white p-4 shadow-card">
            <h2 className="font-semibold text-fg">{course.title}</h2>
            <ul className="space-y-1.5">
              {courseResources.map((r) => {
                const moduleRow = Array.isArray(r.modules) ? r.modules[0] : r.modules;
                const batchRow = Array.isArray(r.batches) ? r.batches[0] : r.batches;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-md bg-bg px-3 py-2">
                    <div className="min-w-0 flex-1">
                      {isExternalLink(r.url_or_storage_path) ? (
                        <a href={r.url_or_storage_path} target="_blank" rel="noreferrer" className="font-medium text-fg hover:text-emerald">
                          {r.title}
                        </a>
                      ) : (
                        // Stored file: private bucket, no public URL to link to.
                        <span className="font-medium text-fg">{r.title}</span>
                      )}
                      <span className="ml-2 text-label text-fg-3">
                        {isExternalLink(r.url_or_storage_path) ? r.kind : "PDF"} · {moduleRow?.title ?? "General"}
                        {batchRow ? ` · only ${batchRow.name}` : ""}
                      </span>
                    </div>
                    <RowActions
                      endpoint="/api/admin/content/resources"
                      id={r.id}
                      title={r.title}
                      siblings={siblings}
                      confirmLabel="resource"
                    />
                  </li>
                );
              })}
              {courseResources.length === 0 && (
                <li className="text-label text-fg-3">No resources yet.</li>
              )}
            </ul>
            <ResourceForm
              courseId={course.id}
              modules={[...(course.modules ?? [])]
                .sort((a, b) => a.position - b.position)
                .map((m) => ({ id: m.id, label: m.title }))}
              batches={(course.batches ?? []).map((b) => ({ id: b.id, label: b.name }))}
              lessons={(lessons ?? []).filter((lesson) => {
                const moduleRow = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules;
                return moduleRow?.course_id === course.id;
              }).map((lesson) => ({ id: lesson.id, label: lesson.title }))}
              count={courseResources.length}
            />
          </section>
        );
      })}
    </div>
  );
}
