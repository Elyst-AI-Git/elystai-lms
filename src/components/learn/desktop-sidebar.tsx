"use client";

import { BookOpen, FolderOpen, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/learn", label: "Learning plan", icon: BookOpen },
  { href: "/learn/vault", label: "Resources", icon: FolderOpen },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-dvh flex-col border-r border-border bg-white p-4 lg:flex" aria-label="Learner workspace">
      <Link className="flex items-center gap-2 px-2 py-3 font-display text-lg font-bold tracking-display text-emerald" href="/learn">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald text-fg-on-dark">E</span>
        Elyst AI
      </Link>
      <p className="mt-8 px-2 text-micro font-bold uppercase tracking-wide text-fg-3">AI for Work</p>
      <nav className="mt-3 space-y-1" aria-label="Primary">
        {LINKS.map((link) => {
          const active = link.href === "/learn" ? pathname !== "/learn/vault" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-small font-bold transition-colors ${
                active ? "bg-emerald text-fg-on-dark" : "text-fg-2 hover:bg-emerald/5 hover:text-emerald"
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
      <form action="/api/auth/signout" className="mt-auto" method="post">
        <button className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-small font-bold text-fg-2 transition-colors hover:bg-emerald/5 hover:text-emerald" type="submit">
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </form>
    </aside>
  );
}
