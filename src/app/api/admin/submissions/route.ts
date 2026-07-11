import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/lms/auth";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * PATCH { id, status, reviewer_note? } - review a submission (spec A8):
 * reviewed / needs_attention flag + optional note, not grading.
 */
export async function PATCH(req: NextRequest) {
  const user = await isAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: unknown; status?: unknown; reviewer_note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : null;
  const status =
    body.status === "reviewed" || body.status === "needs_attention" || body.status === "submitted"
      ? body.status
      : null;
  if (!id || !status) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }
  const reviewerNote =
    typeof body.reviewer_note === "string" && body.reviewer_note.trim()
      ? body.reviewer_note.trim().slice(0, 2000)
      : null;

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .schema("app")
    .from("submissions")
    .update({
      status,
      reviewer_note: reviewerNote,
      reviewed_at: status === "submitted" ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logEvent({
    event: LMS_EVENTS.admin.submission.reviewed,
    profileId: user.id,
    payload: { submissionId: id, status, hasNote: Boolean(reviewerNote) },
  });

  return NextResponse.json({ ok: true });
}
