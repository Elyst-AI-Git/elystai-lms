import Link from "next/link";
import { BottomNav } from "@/components/learn/bottom-nav";
import { DesktopSidebar } from "@/components/learn/desktop-sidebar";
import { requireUser } from "@/lib/lms/auth";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="lms-surface min-h-dvh lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
      <DesktopSidebar email={user.email ?? ""} name={user.user_metadata.full_name ?? null} />
      <div className="flex min-w-0 flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-4 lg:px-8 lg:pt-6">
          <Link className="font-display text-lg font-bold tracking-display text-emerald lg:hidden" href="/learn">
            Elyst AI
          </Link>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-7">
          {children}
        </main>
        <footer className="px-4 pb-28 text-center text-label text-fg-3 lg:hidden">
          Learning portal v1 — your feedback shapes what we build next. <a className="font-bold text-emerald underline-offset-4 hover:underline" href="mailto:mailofelystai@gmail.com">Share an idea</a>
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
