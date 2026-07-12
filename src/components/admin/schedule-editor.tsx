"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { adminFetch, buttonClass, inputClass } from "@/components/admin/crud";

/**
 * Edits a batch's launch date. `starts_on` (04:00 IST of that date) is the
 * anchor for every drip unlock, so changing it here shifts the whole cohort's
 * schedule. Day 1 = starts_on, Day 14 = starts_on + 13.
 */
export function ScheduleEditor({
  batchId,
  name,
  startsOn,
}: {
  batchId: string;
  name: string;
  startsOn: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(startsOn);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const problem = await adminFetch("/api/admin/content/batches", "PATCH", {
      id: batchId,
      starts_on: value,
    });
    setBusy(false);
    setMessage(problem ?? "Saved.");
    if (!problem) router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-white p-4 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{name}</p>
        <p className="text-label text-fg-3">Day 1 unlocks on this date at 4:00 AM IST; each later day unlocks at 4:00 AM the next morning.</p>
      </div>
      <label className="text-small font-medium text-fg-2">
        Starts on
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${inputClass} ml-2`}
          required
        />
      </label>
      <button type="submit" disabled={busy || value === startsOn} className={buttonClass}>
        {busy ? "Saving…" : "Save date"}
      </button>
      {message && (
        <span className={`text-label ${message === "Saved." ? "text-emerald" : "text-destructive"}`}>{message}</span>
      )}
    </form>
  );
}
