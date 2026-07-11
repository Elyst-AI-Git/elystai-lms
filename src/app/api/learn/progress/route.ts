import { NextRequest, NextResponse } from "next/server";
import { getEnrollmentForLesson } from "@/lib/lms/auth";
import { isUnlocked } from "@/lib/lms/drip";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST { lessonId, completed } - mark or un-mark a lesson (spec D3).
 * Writes go through the USER client so lesson_progress RLS is exercised;
 * drip is enforced app-side here (RLS covers enrollment, drip is pacing).
 */
export async function POST(req: NextRequest) {
  let body: { lessonId?: unknown; completed?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const lessonId = typeof body.lessonId === "string" ? body.lessonId : null;
  const completed = typeof body.completed === "boolean" ? body.completed : null;
  if (!lessonId || completed === null) {
    return NextResponse.json({ error: "lessonId and completed are required" }, { status: 400 });
  }

  const ctx = await getEnrollmentForLesson(lessonId);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!ctx.lesson.is_preview && !isUnlocked(ctx.lesson.unlock_day_offset, ctx.batchStartsOn, new Date())) {
    return NextResponse.json({ error: "Lesson is locked" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  if (completed) {
    const { error } = await supabase
      .schema("app")
      .from("lesson_progress")
      .upsert(
        { enrollment_id: ctx.enrollmentId, lesson_id: lessonId },
        { onConflict: "enrollment_id,lesson_id", ignoreDuplicates: true }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .schema("app")
      .from("lesson_progress")
      .delete()
      .eq("enrollment_id", ctx.enrollmentId)
      .eq("lesson_id", lessonId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logEvent({
    event: completed ? LMS_EVENTS.learner.lesson.completed : LMS_EVENTS.learner.lesson.uncompleted,
    profileId: ctx.user.id,
    payload: { lessonId, enrollmentId: ctx.enrollmentId },
  });

  return NextResponse.json({ ok: true, completed });
}
