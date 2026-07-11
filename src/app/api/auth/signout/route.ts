import { NextResponse } from "next/server";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();
  if (user) {
    await logEvent({
      event: LMS_EVENTS.learner.auth.signedOut,
      profileId: user.id,
      httpStatus: 302,
    });
  }

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
