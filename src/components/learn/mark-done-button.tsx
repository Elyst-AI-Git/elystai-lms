"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

/**
 * Sticky bottom completion bar (design overhaul D3). Marking complete morphs
 * the button into a drawn checkmark state and reveals "Next lesson" — the
 * app's one earned flourish, kept under 300ms per interaction.
 */
export function MarkDoneBar({
  lessonId,
  initialCompleted,
  nextHref,
  backHref,
}: {
  lessonId: string;
  initialCompleted: boolean;
  nextHref: string | null;
  backHref: string;
}) {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [justCompleted, setJustCompleted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/learn/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: !completed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong");
      }
      setJustCompleted(!completed);
      setCompleted(!completed);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-border bg-bg/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur">
      {error && <p className="mb-2 text-label text-destructive">{error}</p>}
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        {completed ? (
          <>
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className="pressable inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md border-2 border-emerald bg-emerald/5 px-4 font-bold text-emerald disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M2 6.5L4.8 9.2L10 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={justCompleted ? "check-draw" : undefined}
                />
              </svg>
              Completed
            </button>
            {nextHref ? (
              <Link
                href={nextHref}
                className="pressable inline-flex min-h-[48px] flex-1 items-center justify-center rounded-md bg-emerald px-4 font-bold text-fg-on-dark transition-colors hover:bg-emerald-light"
              >
                Next lesson →
              </Link>
            ) : (
              <Link
                href={backHref}
                className="pressable inline-flex min-h-[48px] flex-1 items-center justify-center rounded-md bg-emerald px-4 font-bold text-fg-on-dark transition-colors hover:bg-emerald-light"
              >
                Back to day
              </Link>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="pressable inline-flex min-h-[48px] w-full items-center justify-center rounded-md bg-emerald px-6 font-bold text-fg-on-dark transition-colors hover:bg-emerald-light disabled:opacity-50"
          >
            {busy ? "Saving…" : "Mark as complete"}
          </button>
        )}
      </div>
    </div>
  );
}
