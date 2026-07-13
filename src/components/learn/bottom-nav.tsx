"use client";

import { FolderOpen, GraduationCap, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/learn", label: "Course", icon: GraduationCap },
  { href: "/learn/vault", label: "Vault", icon: FolderOpen },
];

/**
 * Floating pill bottom nav - app-idiom navigation instead of a website-style
 * top link bar. Icons + labels, active state, safe-area aware.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
      aria-label="Primary"
    >
      <div className="flex items-center gap-1 rounded-md bg-emerald p-1.5 shadow-card-hover">
        {ITEMS.map((item) => {
          const active =
            item.href === "/learn"
              ? pathname === "/learn" || (pathname.startsWith("/learn/") && !pathname.startsWith("/learn/vault"))
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`pressable flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-label font-semibold transition-colors sm:gap-2 sm:px-5 sm:text-small ${
                active ? "bg-white text-emerald" : "text-fg-muted-dark hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              {item.label}
            </Link>
          );
        })}
        <form action="/api/auth/signout" method="post">
          <button className="pressable flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-label font-semibold text-fg-muted-dark transition-colors hover:text-white sm:gap-2 sm:px-5 sm:text-small" type="submit">
            <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
