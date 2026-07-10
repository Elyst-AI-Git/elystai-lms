"use client";

import { GraduationCap, FolderOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/learn", label: "Course", icon: GraduationCap },
  { href: "/learn/vault", label: "Vault", icon: FolderOpen },
];

/**
 * Floating pill bottom nav — app-idiom navigation instead of a website-style
 * top link bar. Icons + labels, active state, safe-area aware.
 */
export function BottomNav() {
  const pathname = usePathname();
  // Lesson pages are focus mode: the sticky completion bar owns the bottom
  // edge there, so the nav steps aside instead of stacking on top of it.
  if (pathname.includes("/lesson/")) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)]"
      aria-label="Primary"
    >
      <div className="flex items-center gap-1 rounded-pill border border-border bg-white/90 p-1.5 shadow-card-hover backdrop-blur">
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
              className={`pressable flex min-h-[44px] items-center gap-2 rounded-pill px-5 text-small font-semibold transition-colors ${
                active ? "bg-emerald text-fg-on-dark" : "text-fg-2 hover:text-emerald"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
