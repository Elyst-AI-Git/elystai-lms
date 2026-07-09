import Link from "next/link";
import { notFound } from "next/navigation";
import { InlineCreate, RowActions } from "@/components/admin/crud";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPE_BADGE: Record<string, string> = { video: "▶ video", text: "📄 text", task: "✏️ task" };

export default async function CourseTree({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const admin = createAdminSupabaseClient();

  const { data: course } = await admin
    .schema("app")
    .from("courses")
    .select("id, slug, title, status")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const { data: modules } = await admin
    .schema("app")
    .from("modules")
    .select("id, title, position, lessons(id, title, position, content_type, unlock_day_offset, is_preview)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const moduleSiblings: [string, number][] = (modules ?? []).map((m, i) => [m.id, i]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/content" className="text-label text-fg-3 hover:text-emerald">← Courses</Link>
        <h1 className="mt-1 font-display text-h3 font-bold tracking-display text-fg">{course.title}</h1>
        <p className="text-label text-fg-3">/{course.slug} · {course.status}</p>
      </div>

      {(modules ?? []).map((m) => {
        const lessons = [...(m.lessons ?? [])].sort((a, b) => a.position - b.position);
        const lessonSiblings: [string, number][] = lessons.map((l, i) => [l.id, i]);
        return (
          <section key={m.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-fg">{m.title}</h2>
              <RowActions
                endpoint="/api/admin/content/modules"
                id={m.id}
                title={m.title}
                siblings={moduleSiblings}
                confirmLabel="module"
              />
            </div>
            <ul className="space-y-1.5">
              {lessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-md bg-bg px-3 py-2">
                  <Link href={`/admin/content/lesson/${l.id}`} className="min-w-0 flex-1 hover:text-emerald">
                    <span className="font-medium text-fg">{l.title}</span>
                    <span className="ml-2 text-label text-fg-3">
                      {TYPE_BADGE[l.content_type] ?? l.content_type} · Day {l.unlock_day_offset + 1}
                      {l.is_preview && " · preview"}
                    </span>
                  </Link>
                  <RowActions
                    endpoint="/api/admin/content/lessons"
                    id={l.id}
                    title={l.title}
                    siblings={lessonSiblings}
                    confirmLabel="lesson"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <InlineCreate
                endpoint="/api/admin/content/lessons"
                placeholder="New lesson title"
                extras={{ module_id: m.id, content_type: "video", position: lessons.length }}
              />
            </div>
          </section>
        );
      })}

      <div className="rounded-card bg-surface-muted p-4">
        <p className="mb-2 text-small font-semibold text-fg-2">New module (Area)</p>
        <InlineCreate
          endpoint="/api/admin/content/modules"
          placeholder="Module title"
          extras={{ course_id: courseId, position: (modules ?? []).length }}
        />
      </div>
    </div>
  );
}
