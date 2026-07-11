import Link from "next/link";
import { BottomNav } from "@/components/learn/bottom-nav";
import { DesktopSidebar } from "@/components/learn/desktop-sidebar";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-4 lg:px-8 lg:pt-6">
          <Link className="font-display text-lg font-bold tracking-display text-emerald lg:hidden" href="/learn">
            Elyst AI
          </Link>
          <p className="ml-auto text-label font-bold text-fg-3 lg:ml-0">Learning portal</p>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-7">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
