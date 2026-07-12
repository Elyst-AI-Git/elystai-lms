import Link from "next/link";
import Image from "next/image";
import { BottomNav } from "@/components/learn/bottom-nav";
import { DesktopSidebar } from "@/components/learn/desktop-sidebar";
import { requireUser } from "@/lib/lms/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // OTP users carry no name in auth metadata - the profile row is the source.
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = profile?.full_name ?? user.user_metadata.full_name ?? null;
  return (
    <div className="lms-surface min-h-dvh lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
      <DesktopSidebar email={user.email ?? ""} name={name} />
      <div className="flex min-w-0 flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-4 lg:hidden">
          <Link href="/learn">
            <Image alt="Elyst AI" className="h-9 w-auto" height={36} src="/logo-wordmark.svg" width={112} priority />
          </Link>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-6">
          {children}
        </main>
        <footer className="px-4 pb-28 text-center text-label text-fg-3 lg:hidden">
          <span className="block">Elyst AI Learning Portal - Version 1.0</span>
          <span className="mt-1 block">Got a feedback? <a className="font-bold text-emerald underline-offset-4 hover:underline" href="https://wa.me/919633288931" rel="noreferrer" target="_blank">Share it here</a></span>
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
