/**
 * Shared route loader — shown by Next.js while a page segment streams in.
 * Mirrors the spinner already used on /register so the loading state looks
 * the same everywhere on the site instead of inventing a new visual per page.
 */
export function PageLoader() {
  return (
    <main id="main" className="flex-1 flex items-center justify-center min-h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
      </div>
    </main>
  );
}
