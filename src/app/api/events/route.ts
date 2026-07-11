import { NextRequest, NextResponse } from "next/server";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent, normalizeCorrelationId } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const AUTH_EVENTS = new Set([
  LMS_EVENTS.learner.auth.loginSucceeded,
  LMS_EVENTS.learner.auth.loginFailed,
]);

/** Logs the small, allowlisted set of auth events emitted by the login UI. */
export async function POST(request: NextRequest) {
  let body: { event?: unknown; correlationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.event !== "string" || !AUTH_EVENTS.has(body.event)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logEvent({
    event: body.event,
    source: "client",
    profileId: user?.id,
    correlationId: normalizeCorrelationId(body.correlationId),
  });

  return NextResponse.json({ ok: true });
}
