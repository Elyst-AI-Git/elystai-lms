import { NextRequest, NextResponse } from "next/server";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    await logEvent({ event: LMS_EVENTS.learner.auth.loginFailed, httpStatus: 400 });
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    await logEvent({ event: LMS_EVENTS.learner.auth.loginFailed, httpStatus: 400 });
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  await logEvent({
    event: LMS_EVENTS.learner.auth.loginSucceeded,
    profileId: data.user.id,
    httpStatus: 302,
  });
  return NextResponse.redirect(new URL("/learn", request.url));
}
