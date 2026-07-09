"use client";

/**
 * Client-side journey logging. Mints one correlation id per checkout journey,
 * persists it across the register -> onboarding -> confirmation navigations via
 * sessionStorage, and beacons milestones to /api/events.
 *
 * Best-effort: never throws, never blocks navigation. If storage or fetch is
 * unavailable the calls quietly no-op.
 */

const CID_KEY = "elyst_cid";

/** Returns the journey id, creating and persisting one on first use. */
export function getCorrelationId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(CID_KEY);
    if (existing) return existing;
    const cid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
            const n = parseInt(c);
            return (n ^ (Math.random() * 16 >> (n / 4))).toString(16);
          });
    window.sessionStorage.setItem(CID_KEY, cid);
    return cid;
  } catch {
    return "";
  }
}

/** Fire-and-forget milestone beacon. */
export function logClientEvent(
  event: string,
  opts?: { orderId?: string; payload?: Record<string, unknown> }
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event,
      correlationId: getCorrelationId(),
      orderId: opts?.orderId,
      payload: opts?.payload,
    });
    // keepalive lets the request survive a navigation (e.g. the Razorpay
    // redirect) without holding it up.
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // no-op: logging must never break the flow
  }
}
