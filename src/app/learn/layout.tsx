import Link from "next/link";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <nav className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/learn" className="font-display text-lg font-bold tracking-display text-emerald">
            Elyst AI
          </Link>
          <div className="flex items-center gap-5 text-small font-medium text-fg-2">
            <Link href="/learn" className="hover:text-emerald">Course</Link>
            <Link href="/learn/vault" className="hover:text-emerald">Vault</Link>
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
