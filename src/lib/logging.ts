import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Interaction logging for the checkout/payment journey.
 *
 * Design goals (see docs/qa/03-logging-design.md):
 *   - One correlation_id per journey, stitched across client milestones, the
 *     server API routes, and the Razorpay webhook (recovered from order notes).
 *   - Structured rows, not free-text — queryable and joinable to payments.
 *   - BEST EFFORT: logging must NEVER break the payment flow. Every call is
 *     fire-and-forget and swallows its own errors. A failed insert logs to
 *     stdout and returns; it does not throw into the caller.
 *   - PII-aware: callers must not pass OTP codes, secrets, or signatures.
 */

export type EventSource = "client" | "server" | "webhook";

export interface LogEventInput {
  event: string;
  source?: EventSource;
  correlationId?: string | null;
  profileId?: string | null;
  orderId?: string | null;
  httpStatus?: number | null;
  payload?: Record<string, unknown> | null;
}

// Keys we never want to persist even if a caller accidentally includes them.
const REDACT_KEYS = new Set([
  "otp",
  "otpcode",
  "token",
  "password",
  "signature",
  "x-razorpay-signature",
  "razorpay_signature",
  "key_secret",
  "service_role_key",
  "authorization",
]);

function redact(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!payload) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      out[key] = "[redacted]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redact(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? redact(item as Record<string, unknown>)
          : item
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

// Only accept a well-formed UUID as a correlation id; anything else (spoofed,
// truncated, or absent) is stored as null rather than failing the insert on a
// bad uuid cast.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function normalizeCorrelationId(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

/**
 * Fire-and-forget. Awaiting is optional; failures are swallowed. Safe to call
 * from any API route or the webhook without wrapping in try/catch.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .schema("app")
      .from("interaction_events")
      .insert({
        correlation_id: normalizeCorrelationId(input.correlationId),
        profile_id: input.profileId ?? null,
        event: input.event,
        source: input.source ?? "server",
        order_id: input.orderId ?? null,
        http_status: input.httpStatus ?? null,
        payload: redact(input.payload),
      });
    if (error) {
      console.error("logEvent insert failed:", input.event, error.message);
    }
  } catch (err) {
    console.error("logEvent threw (swallowed):", input.event, err);
  }
}
