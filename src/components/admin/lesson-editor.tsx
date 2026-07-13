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
  youtube_id: string | null;
  duration_seconds: number | null;
  body_richtext: string | null;
  task_instructions: string | null;
  live_link: string | null;
  live_starts_at: string | null;
}

/**
 * Accepts whatever an admin is likely to paste - a full YouTube URL
 * (watch?v=, youtu.be, shorts, embed, live) or a bare video id - and returns
 * the bare id. Videos are added by pasting the YouTube link, so the editor
 * must not force people to dissect URLs by hand.
 */
export function extractYoutubeId(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname)) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const match = /\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname);
      if (match) return match[1];
    }
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] ?? "";
    }
  } catch {
    // not a URL - treat as a bare id
  }
  return raw;
}

/**
 * Lesson editor. The everyday fields (title, day, YouTube link, body) are
 * front and centre; everything rarely touched lives under "More options" so
 * the form stays simple WITHOUT losing any setting.
 */
export function LessonEditor({ lesson }: { lesson: LessonData }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    title: lesson.title,
    content_type: lesson.content_type,
    unlock_day_offset: lesson.unlock_day_offset,
    is_preview: lesson.is_preview,
    youtube_id: lesson.youtube_id ?? "",
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
      youtube_id: extractYoutubeId(form.youtube_id),
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

  const label = "block text-small font-bold text-fg-2";
  const wide = `${inputClass} w-full mt-1.5`;

  return (
    <form onSubmit={save} className="space-y-5">
      {/* --- the everyday fields ------------------------------------------ */}
      <div className="space-y-4 rounded-md border border-border bg-white p-4 shadow-card sm:p-5">
        <label className={label}>
          Title
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className={wide} required />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <label className={label}>
            Day (1 = launch day)
            <input
              type="number"
              min={1}
              value={form.unlock_day_offset + 1}
              onChange={(e) => set("unlock_day_offset", Math.max(0, Number(e.target.value) - 1))}
              className={wide}
            />
          </label>
          <label className={label}>
            YouTube link or video ID
            <input
              value={form.youtube_id}
              onChange={(e) => set("youtube_id", e.target.value)}
              className={wide}
              placeholder="https://youtu.be/… or the video ID"
            />
            <span className="mt-1 block text-label font-normal text-fg-3">
              Paste the unlisted/private YouTube link straight from the address bar - we extract the ID for you.
            </span>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className={label}>Body (markdown)</span>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-label font-bold text-emerald underline-offset-4 hover:underline"
            >
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
          {preview ? (
            <div className="mt-1.5 min-h-32 rounded-md border border-border bg-bg p-4">
              <Markdown>{form.body_richtext || "*Nothing yet*"}</Markdown>
            </div>
          ) : (
            <textarea
              value={form.body_richtext}
              onChange={(e) => set("body_richtext", e.target.value)}
              rows={8}
              className={`${wide} font-mono text-label`}
            />
          )}
        </div>
      </div>

      {/* --- rarely-touched settings: tucked away, never lost -------------- */}
      <details className="rounded-md border border-border bg-surface-muted p-4">
        <summary className="cursor-pointer text-small font-bold text-fg-2">More options</summary>
        <div className="mt-4 space-y-4">
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
              Duration (seconds)
              <input
                type="number"
                min={0}
                value={form.duration_seconds}
                onChange={(e) => set("duration_seconds", e.target.value)}
                className={wide}
              />
            </label>
            <label className={`${label} flex items-end gap-2 pb-3`}>
              <input
                type="checkbox"
                checked={form.is_preview}
                onChange={(e) => set("is_preview", e.target.checked)}
                className="h-4 w-4 accent-emerald"
              />
              Free preview
            </label>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={label}>
              Live class link (legacy)
              <input
                type="url"
                value={form.live_link}
                onChange={(e) => set("live_link", e.target.value)}
                className={wide}
                placeholder="https://meet.google.com/…"
              />
            </label>
            <label className={label}>
              Live class time (legacy, IST)
              <input
                type="datetime-local"
                value={form.live_starts_at}
                onChange={(e) => set("live_starts_at", e.target.value)}
                className={wide}
              />
            </label>
          </div>
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? "Saving…" : "Save lesson"}
        </button>
        {message && (
          <span className={`text-label font-bold ${message === "Saved." ? "text-emerald" : "text-destructive"}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
