import { NextRequest, NextResponse } from "next/server";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent, normalizeCorrelationId } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const AUTH_EVENTS = [
  LMS_EVENTS.learner.auth.loginSucceeded,
  LMS_EVENTS.learner.auth.loginFailed,
] as const;

function isAuthEvent(event: unknown): event is (typeof AUTH_EVENTS)[number] {
  return typeof event === "string" && (AUTH_EVENTS as readonly string[]).includes(event);
}

// Best-effort per-IP rate limit (resets per serverless instance). This is an
// unauthenticated write endpoint - the limiter bounds junk-row pollution from
// a single source without any external dependency.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    if (hits.size > 5_000) hits.clear(); // cap memory on long-lived instances
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/** Logs the small, allowlisted set of auth events emitted by the login UI. */
export async function POST(request: NextRequest) {
  // Same-origin only: this endpoint exists solely for our own login page.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { event?: unknown; correlationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAuthEvent(body.event)) {
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
