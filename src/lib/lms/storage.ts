import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  MAX_SUBMISSION_BYTES,
  SIGNED_URL_TTL_SECONDS,
  SUBMISSION_IMAGE_TYPES,
} from "@/lib/lms/constants";

/**
 * Submission screenshots live in the private `submissions` bucket and are
 * only ever reachable through short-lived signed URLs minted here (spec A4).
 * Uploads go through the server (service role) after validation — the bucket
 * has no user-facing storage policies at all.
 */

const BUCKET = "submissions";

export function validateSubmissionImage(file: File): string | null {
  if (!SUBMISSION_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP or GIF images are accepted.";
  }
  if (file.size > MAX_SUBMISSION_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

/** Uploads (replacing any previous file at the path) and returns the storage path. */
export async function uploadSubmissionImage(
  enrollmentId: string,
  lessonId: string,
  file: File
): Promise<string> {
  const admin = createAdminSupabaseClient();
  const ext = file.type === "image/png" ? "png"
    : file.type === "image/webp" ? "webp"
    : file.type === "image/gif" ? "gif"
    : "jpg";
  // One deterministic path per (enrollment, lesson): replacing a submission
  // overwrites the old screenshot instead of orphaning it.
  const path = `${enrollmentId}/${lessonId}/screenshot.${ext}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Screenshot upload failed: ${error.message}`);
  return path;
}

export async function getSubmissionSignedUrl(storagePath: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
