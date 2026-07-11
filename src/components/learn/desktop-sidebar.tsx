"use client";

import Image from "next/image";
import { BookOpen, FolderOpen, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/learn", label: "Learning plan", icon: BookOpen },
  { href: "/learn/vault", label: "Resources", icon: FolderOpen },
];

export function DesktopSidebar({ email, name }: { email: string; name: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="surface-dark-hero hidden min-h-dvh flex-col p-4 lg:flex" aria-label="Learner workspace">
      <Link className="flex h-16 items-center justify-center" href="/learn">
        <Image alt="Elyst AI" className="h-10 w-auto object-contain brightness-0 invert" height={45} src="/logo-wordmark.svg" width={140} />
      </Link>
      <p className="mt-8 px-2 lms-meta font-bold uppercase tracking-wide text-green">AI for Work</p>
      <nav className="mt-3 space-y-1" aria-label="Primary">
        {LINKS.map((link) => {
          const active = link.href === "/learn" ? pathname !== "/learn/vault" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-small font-bold transition-colors ${
                active ? "bg-white/15 text-green" : "text-fg-muted-dark hover:bg-white/10 hover:text-fg-on-dark"
              }`}
              href={link.href}
              key={link.href}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-10 border-t border-white/15 pt-5">
        <p className="px-3 text-center lms-meta text-fg-muted-dark">Got a feedback? <a className="font-bold text-green underline-offset-4 hover:underline" href="https://wa.me/919633288931" rel="noreferrer" target="_blank">Share it here</a></p>
        <div className="mt-4 px-3">
          <p className="lms-label font-bold text-fg-on-dark">{name ?? "AI for Work learner"}</p>
          <p className="mt-1 truncate lms-meta text-fg-muted-dark">{email}</p>
        </div>
        <form action="/api/auth/signout" className="mt-3" method="post">
        <button className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 lms-label font-bold text-fg-muted-dark transition-colors hover:bg-white/10 hover:text-fg-on-dark" type="submit">
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
        </form>
      </div>
    </aside>
  );
}
