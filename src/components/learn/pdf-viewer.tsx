"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Download, FileText, Loader2 } from "lucide-react";

// pdf.js worker, bundled locally (no CDN) so it works behind our CSP/offline.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Render without the standard-14 font pack (kept local/absent to avoid an
// external fetch); PDFs still render, only rare standard fonts fall back.
const DOC_OPTIONS = { isEvalSupported: false } as const;

/**
 * In-app PDF viewer. Loads bytes from our own auth-gated proxy (`src`), never
 * from Supabase directly, and always offers a Download button. If rendering
 * ever fails (worker/parse), it degrades to a download-only card so a learner
 * is never stuck.
 */
const noop = () => () => {};

export function PdfViewer({ src, title }: { src: string; title: string }) {
  // false during SSR, true after hydration - react-pdf must only render on the
  // client (it needs the pdf.js worker + DOM). No setState-in-effect.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
  const [numPages, setNumPages] = React.useState(0);
  const [width, setWidth] = React.useState(800);
  const [failed, setFailed] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.min(el.clientWidth - 4, 900));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);

  const downloadHref = `${src}${src.includes("?") ? "&" : "?"}download=1`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-small font-bold text-fg">
          <FileText className="h-5 w-5 shrink-0 text-emerald" aria-hidden />
          <span className="truncate">{title}</span>
          {numPages > 0 && <span className="shrink-0 text-label font-normal text-fg-3">· {numPages} {numPages === 1 ? "page" : "pages"}</span>}
        </div>
        <a
          className="pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-emerald px-4 text-small font-bold text-fg-on-dark transition-colors hover:bg-emerald-light"
          href={downloadHref}
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </a>
      </div>

      <div ref={wrapRef} className="min-h-64 overflow-hidden rounded-md border border-border bg-surface-muted p-2 sm:p-4">
        {!mounted ? (
          <ViewerLoading />
        ) : failed ? (
          <DownloadFallback downloadHref={downloadHref} />
        ) : (
          <Document
            file={src}
            options={DOC_OPTIONS}
            loading={<ViewerLoading />}
            error={<DownloadFallback downloadHref={downloadHref} />}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() => setFailed(true)}
            onSourceError={() => setFailed(true)}
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i}
                pageNumber={i + 1}
                width={width}
                className="overflow-hidden rounded-md bg-white shadow-card"
                renderAnnotationLayer={false}
                renderTextLayer
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}

function ViewerLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center gap-2 text-small text-fg-3">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      Loading document…
    </div>
  );
}

function DownloadFallback({ downloadHref }: { downloadHref: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
      <FileText className="h-8 w-8 text-emerald" aria-hidden />
      <p className="text-small font-bold text-fg">Preview isn&apos;t available on this device.</p>
      <p className="max-w-xs text-label text-fg-2">You can still open the PDF - it will download to your device.</p>
      <a
        className="pressable inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald px-4 text-small font-bold text-fg-on-dark transition-colors hover:bg-emerald-light"
        href={downloadHref}
      >
        <Download className="h-4 w-4" aria-hidden />
        Download PDF
      </a>
    </div>
  );
}
