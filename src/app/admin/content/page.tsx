import Link from "next/link";
import { InlineCreate } from "@/components/admin/crud";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminContent() {
  const admin = createAdminSupabaseClient();
  const { data: courses } = await admin
    .schema("app")
    .from("courses")
    .select("id, slug, title, status, modules(id)")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-5">
      <h1 className="font-display text-h3 font-bold tracking-display text-fg">Content</h1>
      <div className="space-y-2">
        {(courses ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/admin/content/${c.id}`}
            className="flex items-center justify-between rounded-card bg-white p-4 shadow-card hover:shadow-card-hover"
          >
            <div>
              <p className="font-semibold text-fg">{c.title}</p>
              <p className="text-label text-fg-3">
                /{c.slug} · {c.status} · {(c.modules ?? []).length} modules
              </p>
            </div>
            <span aria-hidden className="text-fg-3">→</span>
          </Link>
        ))}
      </div>
      <div className="rounded-card bg-surface-muted p-4">
        <p className="mb-2 text-small font-semibold text-fg-2">New course</p>
        <InlineCreate
          endpoint="/api/admin/content/courses"
          placeholder="Course title"
          extras={{ status: "draft" }}
        />
        <p className="mt-1 text-label text-fg-3">
          Slug is derived from the title; edit it in Supabase Studio if needed (rare).
        </p>
      </div>
    </div>
  );
}
