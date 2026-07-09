"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Markdown } from "@/components/learn/markdown";
import { adminFetch, buttonClass, inputClass } from "@/components/admin/crud";

interface LessonData {
  id: string;
  title: string;
  content_type: string;
  unlock_day_offset: number;
  is_preview: boolean;
  bunny_video_id: string | null;
  duration_seconds: number | null;
  body_richtext: string | null;
  task_instructions: string | null;
  live_link: string | null;
  live_starts_at: string | null;
}

/** Full lesson editor exposing ALL fields (spec T6), with markdown preview (spec A5). */
export function LessonEditor({ lesson }: { lesson: LessonData }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    title: lesson.title,
    content_type: lesson.content_type,
    unlock_day_offset: lesson.unlock_day_offset,
    is_preview: lesson.is_preview,
    bunny_video_id: lesson.bunny_video_id ?? "",
    duration_seconds: lesson.duration_seconds?.toString() ?? "",
    body_richtext: lesson.body_richtext ?? "",
    task_instructions: lesson.task_instructions ?? "",
    live_link: lesson.live_link ?? "",
    live_starts_at: lesson.live_starts_at ? lesson.live_starts_at.slice(0, 16) : "",
  });
  const [preview, setPreview] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const problem = await adminFetch("/api/admin/content/lessons", "PATCH", {
      id: lesson.id,
      title: form.title,
      content_type: form.content_type,
      unlock_day_offset: Number(form.unlock_day_offset) || 0,
      is_preview: form.is_preview,
      bunny_video_id: form.bunny_video_id,
      duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : "",
      body_richtext: form.body_richtext,
      task_instructions: form.task_instructions,
      live_link: form.live_link,
      live_starts_at: form.live_starts_at ? new Date(form.live_starts_at).toISOString() : "",
    });
    setBusy(false);
    setMessage(problem ?? "Saved.");
    if (!problem) router.refresh();
  }

  const label = "block text-small font-medium text-fg-2";
  const wide = `${inputClass} w-full mt-1`;

  return (
    <form onSubmit={save} className="space-y-4">
      <label className={label}>
        Title
        <input value={form.title} onChange={(e) => set("title", e.target.value)} className={wide} required />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={label}>
          Type
          <select
            value={form.content_type}
            onChange={(e) => set("content_type", e.target.value)}
            className={wide}
          >
            <option value="video">video</option>
            <option value="text">text</option>
            <option value="task">task</option>
          </select>
        </label>
        <label className={label}>
          Unlock day (0 = batch start)
          <input
            type="number"
            min={0}
            value={form.unlock_day_offset}
            onChange={(e) => set("unlock_day_offset", Number(e.target.value))}
            className={wide}
          />
        </label>
        <label className={`${label} flex items-end gap-2 pb-2`}>
          <input
            type="checkbox"
            checked={form.is_preview}
            onChange={(e) => set("is_preview", e.target.checked)}
            className="h-4 w-4 accent-emerald"
          />
          Free preview
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Bunny video ID
          <input
            value={form.bunny_video_id}
            onChange={(e) => set("bunny_video_id", e.target.value)}
            className={wide}
            placeholder="for video lessons"
          />
        </label>
        <label className={label}>
          Duration (seconds)
          <input
            type="number"
            min={0}
            value={form.duration_seconds}
            onChange={(e) => set("duration_seconds", e.target.value)}
            className={wide}
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-small font-medium text-fg-2">Body (markdown)</span>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="text-label font-semibold text-emerald"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className="mt-1 min-h-32 rounded-md border border-border bg-white p-4">
            <Markdown>{form.body_richtext || "*Nothing yet*"}</Markdown>
          </div>
        ) : (
          <textarea
            value={form.body_richtext}
            onChange={(e) => set("body_richtext", e.target.value)}
            rows={10}
            className={`${wide} font-mono text-label`}
          />
        )}
      </div>

      <label className={label}>
        Task instructions (markdown, for task lessons)
        <textarea
          value={form.task_instructions}
          onChange={(e) => set("task_instructions", e.target.value)}
          rows={4}
          className={`${wide} font-mono text-label`}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Live class link (Meet/Zoom)
          <input
            type="url"
            value={form.live_link}
            onChange={(e) => set("live_link", e.target.value)}
            className={wide}
            placeholder="https://meet.google.com/…"
          />
        </label>
        <label className={label}>
          Live class time (IST)
          <input
            type="datetime-local"
            value={form.live_starts_at}
            onChange={(e) => set("live_starts_at", e.target.value)}
            className={wide}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? "Saving…" : "Save lesson"}
        </button>
        {message && (
          <span className={`text-label ${message === "Saved." ? "text-emerald" : "text-destructive"}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
