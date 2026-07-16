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
  let res: Response;
  try {
    res = await fetch(`${endpoint}${query ?? ""}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network failure (offline, DNS, etc.) - fetch() rejects rather than
    // resolving with a bad status, so this needs its own message.
    return "Network error - check your connection and try again.";
  }
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.error ?? `Request failed (${res.status})`;
}

export const inputClass =
  "min-h-11 rounded-md border border-border bg-white px-3 py-2 text-small text-fg outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
export const buttonClass =
  "pressable min-h-11 rounded-md bg-emerald px-4 py-2 text-small font-bold text-fg-on-dark transition-colors hover:bg-emerald-light disabled:opacity-50";
export const subtleButtonClass =
  "pressable min-h-9 rounded-md border border-border bg-white px-2.5 py-1 text-label font-semibold text-fg-2 transition hover:border-emerald hover:text-emerald disabled:opacity-40";

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

/**
 * Drag-handle reorder for a list of rows. Wraps each `{id, node}` pair in a
 * draggable `<li>`; dropping one row onto another moves it there in a single
 * PATCH (vs. clicking the up/down arrows N times). Those arrows stay in
 * RowActions as a keyboard-accessible fallback - this is purely an additive
 * fast path for mouse/touch users.
 */
export function DraggableList({
  endpoint,
  items,
  className,
}: {
  endpoint: string;
  items: { id: string; node: React.ReactNode }[];
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const draggedId = React.useRef<string | null>(null);

  async function moveTo(targetId: string) {
    const fromId = draggedId.current;
    draggedId.current = null;
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;
    const ids = items.map((i) => i.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...ids];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, fromId);
    setBusy(true);
    const problem = await adminFetch(endpoint, "PATCH", {
      reorder: next.map((id, position) => ({ id, position })),
    });
    setBusy(false);
    if (problem) alert(problem);
    else router.refresh();
  }

  return (
    <ul className={className ?? "space-y-1.5"}>
      {items.map(({ id, node }) => (
        <li
          key={id}
          draggable
          onDragStart={() => { draggedId.current = id; }}
          onDragOver={(e) => { e.preventDefault(); if (dragOverId !== id) setDragOverId(id); }}
          onDragLeave={() => setDragOverId((cur) => (cur === id ? null : cur))}
          onDrop={(e) => { e.preventDefault(); void moveTo(id); }}
          className={`rounded-md transition-shadow ${dragOverId === id ? "ring-2 ring-emerald" : ""} ${busy ? "opacity-60" : ""}`}
        >
          {node}
        </li>
      ))}
    </ul>
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
