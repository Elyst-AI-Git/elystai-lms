"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { adminFetch, buttonClass, inputClass, subtleButtonClass } from "@/components/admin/crud";

interface Option {
  id: string;
  label: string;
}

export function ResourceEditRow({
  resource,
  modules,
  lessons,
  batches,
}: {
  resource: {
    id: string;
    description: string | null;
    kind: string;
    module_id: string | null;
    lesson_id: string | null;
    batch_id: string | null;
  };
  modules: Option[];
  lessons: Option[];
  batches: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const problem = await adminFetch("/api/admin/content/resources", "PATCH", {
      id: resource.id,
      description: String(data.get("description") ?? "").trim(),
      kind: String(data.get("kind") ?? resource.kind),
      module_id: String(data.get("module_id") ?? "") || "",
      lesson_id: String(data.get("lesson_id") ?? "") || "",
      batch_id: String(data.get("batch_id") ?? "") || "",
    });
    setBusy(false);
    setError(problem);
    if (!problem) {
      setOpen(false);
      router.refresh();
    }
  }

  const field = "block text-label font-bold text-fg-2";
  const control = `${inputClass} mt-1 w-full`;

  return (
    <div className="border-t border-border/60 pt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={subtleButtonClass}
      >
        {open ? "Cancel edit" : "Edit details"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-2 grid grid-cols-1 gap-3 rounded-md bg-white p-3 sm:grid-cols-2">
          <label className={`${field} sm:col-span-2`}>
            Description
            <input
              name="description"
              defaultValue={resource.description ?? ""}
              placeholder="Shown under the title"
              className={control}
            />
          </label>
          <label className={field}>
            Kind
            <select name="kind" defaultValue={resource.kind} className={control}>
              {["doc", "link", "file", "template", "video"].map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className={field}>
            Day it belongs to
            <select name="lesson_id" defaultValue={resource.lesson_id ?? ""} className={control}>
              <option value="">No specific day - vault only</option>
              {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}
            </select>
          </label>
          <label className={field}>
            Learning area
            <select name="module_id" defaultValue={resource.module_id ?? ""} className={control}>
              <option value="">No Area (General)</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className={field}>
            Visibility
            <select name="batch_id" defaultValue={resource.batch_id ?? ""} className={control}>
              <option value="">All batches</option>
              {batches.map((b) => <option key={b.id} value={b.id}>Only: {b.label}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            {error && <span className="text-label text-destructive">{error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
