"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { adminFetch, buttonClass, inputClass } from "@/components/admin/crud";

interface Option {
  id: string;
  label: string;
}

export function ResourceForm({
  courseId,
  modules,
  lessons,
  batches,
  count,
}: {
  courseId: string;
  modules: Option[];
  lessons: Option[];
  batches: Option[];
  count: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    const pdf = data.get("pdf");
    let url = String(data.get("url") ?? "").trim();

    if (!(pdf instanceof File && pdf.size > 0) && !url) {
      setError("Choose a PDF from your computer or paste a link - one of the two is required.");
      return;
    }

    setBusy(true);
    setError(null);

    // A chosen file wins over a pasted link: upload it first, then store the
    // permanent public URL the server returns.
    if (pdf instanceof File && pdf.size > 0) {
      const upload = new FormData();
      upload.append("file", pdf);
      const res = await fetch("/api/admin/content/upload", { method: "POST", body: upload });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.url) {
        setBusy(false);
        setError(body?.error ?? `Upload failed (${res.status})`);
        return;
      }
      url = body.url as string;
    }

    const problem = await adminFetch("/api/admin/content/resources", "POST", {
      course_id: courseId,
      title: String(data.get("title") ?? "").trim(),
      description: String(data.get("description") ?? "").trim(),
      url_or_storage_path: url,
      kind: String(data.get("kind") ?? "link"),
      module_id: String(data.get("module_id") ?? "") || "",
      lesson_id: String(data.get("lesson_id") ?? "") || "",
      batch_id: String(data.get("batch_id") ?? "") || "",
      sort_order: count,
    });
    setBusy(false);
    setError(problem);
    if (!problem) {
      formEl.reset?.();
      router.refresh();
    }
  }

  const field = "block text-label font-bold text-fg-2";
  const control = `${inputClass} mt-1 w-full`;

  return (
    <details className="rounded-md border border-border bg-bg p-3">
      <summary className="cursor-pointer text-small font-bold text-emerald">+ Add a resource</summary>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={field}>
          Title
          <input name="title" placeholder="Day 3 workbook (PDF)" required className={control} />
        </label>
        <label className={field}>
          Description (optional)
          <input name="description" placeholder="Shown under the title" className={control} />
        </label>
        <label className={field}>
          Upload a PDF from your computer
          <input
            name="pdf"
            type="file"
            accept="application/pdf"
            className={`${control} cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-emerald file:px-3 file:py-1.5 file:text-label file:font-bold file:text-fg-on-dark`}
          />
          <span className="mt-1 block text-label font-normal text-fg-3">PDF up to 25 MB - we host it for you.</span>
        </label>
        <label className={field}>
          &hellip;or paste a link instead
          <input name="url" type="url" placeholder="https://…" className={control} />
        </label>
        <label className={field}>
          Kind
          <select name="kind" className={control} defaultValue="doc">
            {["doc", "link", "file", "template", "video"].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className={field}>
          Day it belongs to (shows under that day&apos;s Materials)
          <select name="lesson_id" className={control} defaultValue="">
            <option value="">No specific day - vault only</option>
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}
          </select>
        </label>
        <label className={field}>
          Learning area (groups it in the vault)
          <select name="module_id" className={control} defaultValue="">
            <option value="">No Area (General)</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className={field}>
          Visibility
          <select name="batch_id" className={control} defaultValue="">
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>Only: {b.label}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? "Adding…" : "Add resource"}
          </button>
        </div>
        {error && <p className="text-label text-destructive sm:col-span-2">{error}</p>}
      </form>
    </details>
  );
}
