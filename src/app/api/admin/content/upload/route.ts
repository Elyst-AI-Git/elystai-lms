import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/lms/auth";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Admin PDF upload for course materials. Files land in the public `materials`
 * bucket (public READ only - writes go exclusively through this admin-gated
 * route with the service role; the bucket has no user storage policies).
 * Public URLs never expire, so they are safe to store in
 * resources.url_or_storage_path.
 */

const MAX_BYTES = 25 * 1024 * 1024; // matches the bucket's file_size_limit

export async function POST(req: NextRequest) {
  const user = await isAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF must be between 1 byte and 25 MB" }, { status: 400 });
  }

  // Unique, collision-proof path; keep a readable slug of the original name.
  const slug = file.name
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "material";
  const path = `${Date.now()}-${slug}.pdf`;

  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage
    .from("materials")
    .upload(path, file, { contentType: "application/pdf" });
  if (error) return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });

  const { data } = admin.storage.from("materials").getPublicUrl(path);

  await logEvent({
    event: LMS_EVENTS.admin.content.created,
    profileId: user.id,
    payload: { table: "storage/materials", id: path },
  });

  return NextResponse.json({ ok: true, url: data.publicUrl, path });
}
