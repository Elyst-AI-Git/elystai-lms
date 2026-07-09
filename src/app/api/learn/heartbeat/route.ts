import { NextRequest, NextResponse } from "next/server";
import { getEnrollmentForLesson } from "@/lib/lms/auth";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";

/**
 * POST { lessonId, positionSeconds } — video-progress telemetry (spec D3).
 * Logged to interaction_events for future AI use; NEVER writes
 * lesson_progress. Best-effort by design.
 */
export async function POST(req: NextRequest) {
  let body: { lessonId?: unknown; positionSeconds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const lessonId = typeof body.lessonId === "string" ? body.lessonId : null;
  const positionSeconds =
    typeof body.positionSeconds === "number" && Number.isFinite(body.positionSeconds)
      ? Math.max(0, Math.round(body.positionSeconds))
      : null;
  if (!lessonId || positionSeconds === null) {
    return NextResponse.json({ error: "lessonId and positionSeconds are required" }, { status: 400 });
  }

  const ctx = await getEnrollmentForLesson(lessonId);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logEvent({
    event: LMS_EVENTS.learner.video.heartbeat,
    profileId: ctx.user.id,
    source: "client",
    payload: { lessonId, enrollmentId: ctx.enrollmentId, positionSeconds },
  });

  return NextResponse.json({ ok: true });
}
