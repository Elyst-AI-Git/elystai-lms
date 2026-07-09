"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

const MAX_BYTES = 5 * 1024 * 1024;

export function SubmissionForm({
  lessonId,
  existing,
}: {
  lessonId: string;
  existing: { url: string | null; note: string | null; hasScreenshot: boolean } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("lessonId", lessonId);

    const file = data.get("screenshot");
    if (file instanceof File && file.size > MAX_BYTES) {
      setMessage({ ok: false, text: "Image must be 5 MB or smaller." });
      return;
    }
    const url = String(data.get("url") ?? "").trim();
    if (!url && !(file instanceof File && file.size > 0)) {
      setMessage({ ok: false, text: "Add a link or a screenshot." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/learn/submissions", { method: "POST", body: data });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Submission failed");
      setMessage({ ok: true, text: body?.updated ? "Submission updated." : "Submitted — nice work!" });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-card bg-white p-5 shadow-card">
      <h2 className="font-semibold text-fg">
        {existing ? "Your submission" : "Submit your work"}
      </h2>
      {existing && (
        <p className="text-label text-fg-3">
          Already submitted{existing.hasScreenshot ? " with a screenshot" : ""}
          {existing.url ? (
            <> — <a className="text-emerald underline" href={existing.url} target="_blank" rel="noreferrer">your link</a></>
          ) : null}
          . Submitting again replaces it.
        </p>
      )}
      <label className="block text-small font-medium text-fg-2">
        Link (optional)
        <input
          type="url"
          name="url"
          defaultValue={existing?.url ?? ""}
          placeholder="https://…"
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-small text-fg outline-none focus:border-emerald"
        />
      </label>
      <label className="block text-small font-medium text-fg-2">
        Screenshot (optional, image ≤ 5 MB)
        <input
          type="file"
          name="screenshot"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mt-1 w-full text-small text-fg-3 file:mr-3 file:rounded-md file:border-0 file:bg-emerald/10 file:px-3 file:py-2 file:font-semibold file:text-emerald"
        />
      </label>
      <label className="block text-small font-medium text-fg-2">
        Note (optional)
        <textarea
          name="note"
          defaultValue={existing?.note ?? ""}
          rows={2}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-small text-fg outline-none focus:border-emerald"
        />
      </label>
      {/* Native submit button (BrandButton renders type="button" and would
          not submit the form); styled to match the solid emerald variant. */}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-emerald px-6 font-bold text-fg-on-dark transition-colors hover:bg-emerald-light disabled:opacity-50"
      >
        {busy ? "Uploading…" : existing ? "Replace submission" : "Submit"}
      </button>
      {message && (
        <p className={`text-label ${message.ok ? "text-emerald" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
