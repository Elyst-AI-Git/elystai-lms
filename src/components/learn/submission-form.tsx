"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  function acceptFile(f: File | undefined | null) {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) {
      setMessage({ ok: false, text: "Only JPEG, PNG, WebP or GIF images are accepted." });
      return;
    }
    if (f.size > MAX_BYTES) {
      setMessage({ ok: false, text: "Image must be 5 MB or smaller." });
      return;
    }
    setMessage(null);
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("lessonId", lessonId);
    if (file) data.set("screenshot", file);
    else data.delete("screenshot");

    const url = String(data.get("url") ?? "").trim();
    if (!url && !file) {
      setMessage({ ok: false, text: "Add a link or a screenshot." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/learn/submissions", { method: "POST", body: data });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Submission failed");
      setMessage({ ok: true, text: body?.updated ? "Submission updated." : "Submitted - nice work!" });
      setFile(null);
      setPreview(null);
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md bg-white p-5 shadow-card">
      <h2 className="font-display font-bold text-fg">
        {existing ? "Your submission" : "Submit your work"}
      </h2>
      {existing && (
        <p className="text-label text-fg-3">
          Already submitted{existing.hasScreenshot ? " with a screenshot" : ""}
          {existing.url ? (
            <> - <a className="text-emerald underline" href={existing.url} target="_blank" rel="noreferrer">your link</a></>
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

      {/* drop-zone */}
      <div>
        <span className="text-small font-medium text-fg-2">Screenshot (optional, ≤ 5 MB)</span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={`pressable mt-1 flex min-h-24 w-full items-center justify-center rounded-md border-2 border-dashed p-3 transition-colors ${
            dragOver ? "border-green bg-green/5" : "border-border bg-bg hover:border-emerald/50"
          }`}
        >
          {preview ? (
            <span className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URI preview */}
              <img src={preview} alt="Screenshot preview" className="h-16 w-16 rounded-md object-cover" />
              <span className="text-left">
                <span className="block text-small font-semibold text-fg">{file?.name}</span>
                <span className="block text-label text-emerald">Tap to change</span>
              </span>
            </span>
          ) : (
            <span className="text-small text-fg-3">
              <span className="font-semibold text-emerald">Choose an image</span> or drop it here
            </span>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>

      <label className="block text-small font-medium text-fg-2">
        Note (optional)
        <textarea
          name="note"
          defaultValue={existing?.note ?? ""}
          rows={2}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-small text-fg outline-none focus:border-emerald"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="pressable inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-emerald px-6 font-bold text-fg-on-dark transition-colors hover:bg-emerald-light disabled:opacity-50"
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
