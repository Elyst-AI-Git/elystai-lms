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
    const data = new FormData(e.currentTarget);
    setBusy(true);
    const problem = await adminFetch("/api/admin/content/resources", "POST", {
      course_id: courseId,
      title: String(data.get("title") ?? "").trim(),
      description: String(data.get("description") ?? "").trim(),
      url_or_storage_path: String(data.get("url") ?? "").trim(),
      kind: String(data.get("kind") ?? "link"),
      module_id: String(data.get("module_id") ?? "") || "",
      lesson_id: String(data.get("lesson_id") ?? "") || "",
      batch_id: String(data.get("batch_id") ?? "") || "",
      sort_order: count,
    });
    setBusy(false);
    setError(problem);
    if (!problem) {
      (e.target as HTMLFormElement).reset?.();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input name="title" placeholder="Title" required className={inputClass} />
      <input name="description" placeholder="Description (optional)" className={inputClass} />
      <input name="url" type="url" placeholder="https://…" required className={inputClass} />
      <select name="kind" className={inputClass} defaultValue="link">
        {["link", "file", "template", "video", "doc"].map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <select name="module_id" className={inputClass} defaultValue="">
        <option value="">No Area (General)</option>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
      <select name="lesson_id" className={inputClass} defaultValue="">
        <option value="">No lesson</option>
        {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}
      </select>
      <select name="batch_id" className={inputClass} defaultValue="">
        <option value="">All batches</option>
        {batches.map((b) => (
          <option key={b.id} value={b.id}>Only: {b.label}</option>
        ))}
      </select>
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? "Adding…" : "Add resource"}
      </button>
      {error && <p className="text-label text-destructive sm:col-span-2">{error}</p>}
    </form>
  );
}
