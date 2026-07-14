import { NextRequest, NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/lms/auth";
import { isUnlocked } from "@/lib/lms/drip";
import { materialStoragePath, safePdfFilename } from "@/lib/lms/materials";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Secure PDF delivery. The `materials` bucket is PRIVATE - learners never get
 * the Supabase Storage URL. This route:
 *   1. requires a signed-in user,
 *   2. requires an ACTIVE enrollment in the resource's course,
 *   3. enforces batch scoping + the same drip gate as the vault/lesson pages,
 *   4. streams the file bytes back from storage (service role) so the browser
 *      only ever sees learn.elystai.com/api/learn/materials/<id>.
 * Hitting this from Postman without the session cookie returns 401.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const admin = createAdminSupabaseClient();

  const { data: resource } = await admin
    .schema("app")
    .from("resources")
    .select("id, title, url_or_storage_path, course_id, lesson_id, module_id, batch_id")
    .eq("id", id)
    .maybeSingle();
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Active enrollment in the resource's course (+ this learner's batch).
  const { data: enrollments } = await admin
    .schema("app")
    .from("enrollments")
    .select("batch_id, batches!inner(course_id, starts_on)")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .eq("batches.course_id", resource.course_id)
    .limit(1);
  const enrollment = enrollments?.[0];
  if (!enrollment) return NextResponse.json({ error: "No access" }, { status: 403 });
  const batch = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches;

  // Batch-scoped resource must match the learner's batch.
  if (resource.batch_id && resource.batch_id !== enrollment.batch_id) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  // Drip: mirror the vault/lesson gate exactly.
  if (!(await isMaterialUnlocked(admin, resource, batch.starts_on))) {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  const path = materialStoragePath(resource.url_or_storage_path);
  if (!path) return NextResponse.json({ error: "Not a stored file" }, { status: 404 });

  const { data: blob, error } = await admin.storage.from("materials").download(path);
  if (error || !blob) return NextResponse.json({ error: "File unavailable" }, { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const filename = safePdfFilename(resource.title);
  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

type ResourceRow = {
  lesson_id: string | null;
  module_id: string | null;
};

/** Same rule the vault/lesson pages use to show or hide a resource. */
async function isMaterialUnlocked(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  resource: ResourceRow,
  startsOn: string
): Promise<boolean> {
  const now = new Date();
  if (resource.lesson_id) {
    const { data: lesson } = await admin
      .schema("app")
      .from("lessons")
      .select("unlock_day_offset, is_preview")
      .eq("id", resource.lesson_id)
      .maybeSingle();
    if (!lesson) return false;
    return lesson.is_preview || isUnlocked(lesson.unlock_day_offset, startsOn, now);
  }
  if (resource.module_id) {
    const { data: lessons } = await admin
      .schema("app")
      .from("lessons")
      .select("unlock_day_offset, is_preview")
      .eq("module_id", resource.module_id)
      .order("unlock_day_offset", { ascending: true })
      .limit(1);
    const first = lessons?.[0];
    if (!first) return true; // area has no lessons yet - shown, matches vault
    return first.is_preview || isUnlocked(first.unlock_day_offset, startsOn, now);
  }
  return true; // general vault resource
}
