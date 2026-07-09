"use client";

/**
 * Small client-side building blocks for the admin app. Plain functional UI
 * (spec T6: brand tokens, desktop-first acceptable, no polish beyond usable).
 * All mutations go through /api/admin/* and refresh the server page.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

export async function adminFetch(
  endpoint: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  query?: string
): Promise<string | null> {
  const res = await fetch(`${endpoint}${query ?? ""}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.error ?? `Request failed (${res.status})`;
}

export const inputClass =
  "rounded-md border border-border bg-white px-2.5 py-1.5 text-small text-fg outline-none focus:border-emerald";
export const buttonClass =
  "rounded-md bg-emerald px-3 py-1.5 text-small font-semibold text-fg-on-dark hover:bg-emerald-light disabled:opacity-50";
export const subtleButtonClass =
  "rounded-md border border-border bg-white px-2 py-1 text-label text-fg-2 hover:border-emerald hover:text-emerald disabled:opacity-40";

/** One-field inline create form (module titles, etc.). */
export function InlineCreate({
  endpoint,
  placeholder,
  extras,
  field = "title",
}: {
  endpoint: string;
  placeholder: string;
  extras: Record<string, unknown>;
  field?: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    const problem = await adminFetch(endpoint, "POST", { ...extras, [field]: value.trim() });
    setBusy(false);
    setError(problem);
    if (!problem) {
      setValue("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={create} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      <button type="submit" disabled={busy || !value.trim()} className={buttonClass}>
        Add
      </button>
      {error && <span className="text-label text-destructive">{error}</span>}
    </form>
  );
}

/** Rename / move up / move down / delete controls for a list row. */
export function RowActions({
  endpoint,
  id,
  title,
  siblings,
  confirmLabel,
}: {
  endpoint: string;
  id: string;
  title: string;
  /** Ordered [id, position][] of the full sibling list, for reordering. */
  siblings: [string, number][];
  confirmLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const index = siblings.findIndex(([sid]) => sid === id);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    const problem = await action();
    setBusy(false);
    if (problem) alert(problem);
    else router.refresh();
  }

  function swapWith(otherIndex: number) {
    const reorder = siblings.map(([sid], i) => ({
      id: sid,
      position:
        i === index ? otherIndex : i === otherIndex ? index : i,
    }));
    return adminFetch(endpoint, "PATCH", { reorder });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={busy || index <= 0}
        onClick={() => run(() => swapWith(index - 1))}
        className={subtleButtonClass}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={busy || index === siblings.length - 1}
        onClick={() => run(() => swapWith(index + 1))}
        className={subtleButtonClass}
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const next = prompt(`Rename ${confirmLabel}`, title);
          if (next && next.trim() && next !== title) {
            void run(() => adminFetch(endpoint, "PATCH", { id, title: next.trim() }));
          }
        }}
        className={subtleButtonClass}
      >
        Rename
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (confirm(`Delete ${confirmLabel} “${title}”? This cannot be undone.`)) {
            void run(() => adminFetch(endpoint, "DELETE", undefined, `?id=${id}`));
          }
        }}
        className={`${subtleButtonClass} hover:border-destructive hover:text-destructive`}
      >
        Delete
      </button>
    </span>
  );
}
