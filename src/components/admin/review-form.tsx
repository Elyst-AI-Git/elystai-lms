"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { adminFetch, inputClass, subtleButtonClass } from "@/components/admin/crud";

export function ReviewForm({
  submissionId,
  currentStatus,
  currentNote,
}: {
  submissionId: string;
  currentStatus: string;
  currentNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = React.useState(currentNote ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function setStatus(status: "reviewed" | "needs_attention") {
    setBusy(true);
    const problem = await adminFetch("/api/admin/submissions", "PATCH", {
      id: submissionId,
      status,
      reviewer_note: note.trim() || undefined,
    });
    setBusy(false);
    setError(problem);
    if (!problem) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reviewer note (admin-only)"
        className={`${inputClass} min-w-52 flex-1`}
      />
      <button
        type="button"
        disabled={busy || currentStatus === "reviewed"}
        onClick={() => setStatus("reviewed")}
        className={`${subtleButtonClass} border-emerald text-emerald`}
      >
        ✓ Reviewed
      </button>
      <button
        type="button"
        disabled={busy || currentStatus === "needs_attention"}
        onClick={() => setStatus("needs_attention")}
        className={`${subtleButtonClass} border-destructive/60 text-destructive`}
      >
        ⚠ Needs attention
      </button>
      {error && <span className="text-label text-destructive">{error}</span>}
    </div>
  );
}
