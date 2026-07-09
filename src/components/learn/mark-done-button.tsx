"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { BrandButton } from "@/components/ui/brand-button";

export function MarkDoneButton({
  lessonId,
  initialCompleted,
}: {
  lessonId: string;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(initialCompleted);
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
      setCompleted(!completed);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {completed ? (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border-2 border-emerald bg-emerald/5 px-6 font-bold text-emerald disabled:opacity-50 sm:w-fit"
        >
          ✓ Completed — tap to undo
        </button>
      ) : (
        <BrandButton variant="solid" onClick={toggle} disabled={busy} full>
          Mark as complete
        </BrandButton>
      )}
      {error && <p className="text-label text-destructive">{error}</p>}
    </div>
  );
}
