/**
 * Helpers for the secure materials proxy. A learner never touches Supabase
 * Storage directly: uploaded PDFs live in a PRIVATE bucket and are streamed
 * through /api/learn/materials/[id] after an auth + drip check. These pure
 * functions decide, from whatever is stored in resources.url_or_storage_path,
 * whether a resource is one of our proxied files or an external link, and what
 * the storage object path is.
 */

/** True for a real external URL (open directly) vs one of our stored files. */
export function isExternalLink(stored: string | null | undefined): boolean {
  const v = (stored ?? "").trim();
  if (!v) return false;
  // An http(s) URL is external UNLESS it points at our own materials bucket
  // (legacy rows stored the full public URL before the bucket went private).
  return /^https?:\/\//i.test(v) && !/\/materials\//.test(v);
}

/**
 * The storage object path (key inside the `materials` bucket) for a stored
 * file, or null if the value isn't one of our files. Accepts both a bare path
 * (new uploads) and a legacy full public URL.
 */
export function materialStoragePath(stored: string | null | undefined): string | null {
  const v = (stored ?? "").trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return v.replace(/^\/+/, ""); // already a path
  const marker = "/materials/";
  const i = v.indexOf(marker);
  if (i === -1) return null; // an external URL, not our file
  return decodeURIComponent(v.slice(i + marker.length).split(/[?#]/)[0]);
}

/** Filename-safe version of a resource title for Content-Disposition. */
export function safePdfFilename(title: string): string {
  const base = (title || "material")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "material";
  return `${base}.pdf`;
}

/**
 * Download filename for a resource: the original PDF the admin uploaded when
 * we have it, else a name derived from the title (legacy rows / external
 * links never had an original filename recorded). Strips characters that
 * could break or inject into a Content-Disposition header.
 */
export function downloadFilename(title: string, originalFilename: string | null | undefined): string {
  const raw = (originalFilename ?? "").trim();
  if (!raw) return safePdfFilename(title);
  const cleaned = raw.replace(/["\\\r\n\x00-\x1f]/g, "").slice(0, 150).trim();
  if (!cleaned) return safePdfFilename(title);
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
}
