import Link from "next/link";
import { BottomNav } from "@/components/learn/bottom-nav";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* wordmark only — navigation lives in the floating bottom nav */}
      <header className="mx-auto w-full max-w-3xl px-4 pt-4">
        <Link
          href="/learn"
          className="font-display text-lg font-bold tracking-display text-emerald"
        >
          Elyst AI
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
