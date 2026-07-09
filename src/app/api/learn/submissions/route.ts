import { NextRequest, NextResponse } from "next/server";
import { getEnrollmentForLesson } from "@/lib/lms/auth";
import { isUnlocked } from "@/lib/lms/drip";
import { LMS_EVENTS } from "@/lib/lms/events";
import { uploadSubmissionImage, validateSubmissionImage } from "@/lib/lms/storage";
import { logEvent } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST multipart/form-data { lessonId, url?, note?, screenshot? } — create or
 * replace the caller's submission for a task lesson (spec A4/T4). At least a
 * URL or a screenshot is required (mirrors the DB check). The row is written
 * with the USER client (RLS enforced); the file goes through the server to
 * the private bucket after image/size validation.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const lessonId = form.get("lessonId");
  if (typeof lessonId !== "string" || !lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }
  const urlRaw = form.get("url");
  const url = typeof urlRaw === "string" && urlRaw.trim() ? urlRaw.trim() : null;
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Link must start with http(s)://" }, { status: 400 });
  }
  const noteRaw = form.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 2000) : null;
  const file = form.get("screenshot");
  const hasFile = file instanceof File && file.size > 0;

  if (!url && !hasFile) {
    return NextResponse.json({ error: "Add a link or a screenshot" }, { status: 400 });
  }
  if (hasFile) {
    const problem = validateSubmissionImage(file);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  const ctx = await getEnrollmentForLesson(lessonId);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ctx.lesson.content_type !== "task") {
    return NextResponse.json({ error: "Not a task lesson" }, { status: 400 });
  }
  if (!ctx.lesson.is_preview && !isUnlocked(ctx.lesson.unlock_day_offset, ctx.batchStartsOn, new Date())) {
    return NextResponse.json({ error: "Lesson is locked" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .schema("app")
    .from("submissions")
    .select("id, storage_path")
    .eq("enrollment_id", ctx.enrollmentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  let storagePath = existing?.storage_path ?? null;
  if (hasFile) {
    storagePath = await uploadSubmissionImage(ctx.enrollmentId, lessonId, file);
  }

  // Replacing resets review state — the admin should re-review new content.
  const row = {
    enrollment_id: ctx.enrollmentId,
    lesson_id: lessonId,
    url,
    storage_path: storagePath,
    note,
    status: "submitted",
    reviewer_note: null,
    reviewed_at: null,
  };
  const { error } = existing
    ? await supabase.schema("app").from("submissions").update(row).eq("id", existing.id)
    : await supabase.schema("app").from("submissions").insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logEvent({
    event: existing ? LMS_EVENTS.learner.submission.updated : LMS_EVENTS.learner.submission.created,
    profileId: ctx.user.id,
    payload: {
      lessonId,
      enrollmentId: ctx.enrollmentId,
      hasUrl: Boolean(url),
      hasScreenshot: Boolean(storagePath),
    },
  });

  return NextResponse.json({ ok: true, updated: Boolean(existing) });
}
