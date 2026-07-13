import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonEditor } from "@/components/admin/lesson-editor";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminSupabaseClient();
  const { data: lesson } = await admin
    .schema("app")
    .from("lessons")
    .select(
      "id, title, content_type, unlock_day_offset, is_preview, youtube_id, duration_seconds, body_richtext, task_instructions, live_link, live_starts_at, modules!inner(course_id, title)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!lesson) notFound();
  const moduleRow = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/admin/content/${moduleRow.course_id}`}
          className="text-label text-fg-3 hover:text-emerald"
        >
          ← {moduleRow.title}
        </Link>
        <h1 className="mt-1 text-h2 text-fg">Edit lesson</h1>
      </div>
      <LessonEditor lesson={lesson} />
    </div>
  );
}
