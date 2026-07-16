import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PdfViewer } from "@/components/learn/pdf-viewer";
import { requireEnrollment } from "@/lib/lms/auth";
import { isExternalLink } from "@/lib/lms/materials";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MaterialViewer({
  params,
}: {
  params: Promise<{ courseSlug: string; id: string }>;
}) {
  const { courseSlug, id } = await params;
  // Gate the page on enrollment; the API route enforces the real access rules.
  // Run alongside the resource fetch (RLS scopes it independently) instead of
  // waiting on it first - saves a full round trip on the hottest read path.
  const [, { data: resource }] = await Promise.all([
    requireEnrollment(courseSlug),
    createServerSupabaseClient().then((supabase) =>
      supabase
        .schema("app")
        .from("resources")
        .select("id, title, description, url_or_storage_path")
        .eq("id", id)
        .maybeSingle()
    ),
  ]);

  // Only our stored PDFs are viewed here; external links are opened directly.
  if (!resource || isExternalLink(resource.url_or_storage_path)) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-3">
      <div className="rise" style={{ ["--stagger-i" as string]: 0 }}>
        <Link href="/learn/vault" className="inline-flex min-h-11 items-center gap-2 px-2 text-small font-bold text-fg-2 hover:text-emerald">
          <ArrowLeft className="h-5 w-5" aria-hidden /> Resources
        </Link>
        <h1 className="mt-2 text-h2 text-fg">{resource.title}</h1>
        {resource.description && <p className="mt-1 text-small text-fg-2">{resource.description}</p>}
      </div>

      <div className="rise" style={{ ["--stagger-i" as string]: 1 }}>
        <PdfViewer src={`/api/learn/materials/${resource.id}`} title={resource.title} />
      </div>
    </div>
  );
}
