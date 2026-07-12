"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, CircleHelp, FolderOpen, GraduationCap, LibraryBig, TrendingUp } from "lucide-react";

// Submissions is intentionally omitted: batch 1 has no learner submissions, so
// the surface is dormant. Schedule (batch launch date) replaces it — that's the
// operation that actually drives the current product.
const NAV = [
  { href: "/admin/content", label: "Content", Icon: LibraryBig, exact: true },
  { href: "/admin/content/resources", label: "Resources", Icon: FolderOpen, exact: false },
  { href: "/admin/schedule", label: "Schedule", Icon: CalendarClock, exact: false },
  { href: "/admin/progress", label: "Progress", Icon: TrendingUp, exact: false },
  { href: "/admin/guide", label: "Guide", Icon: CircleHelp, exact: false },
];

/**
 * Admin sidebar restyled to the learner app's design language: same dark-green
 * hero surface, wordmark, rounded-md items, active states. Top bar on mobile.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(item: (typeof NAV)[number]) {
    if (item.href === "/admin/content") {
      // "Content" owns /admin/content and its tree, except the resources branch.
      return pathname.startsWith("/admin/content") && !pathname.startsWith("/admin/content/resources");
    }
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="surface-dark-hero shrink-0 sm:flex sm:min-h-dvh sm:w-56 sm:flex-col" aria-label="Admin workspace">
      <div className="flex items-center justify-between px-4 pt-4 sm:block sm:px-4">
        <Link className="flex h-12 items-center sm:h-16 sm:justify-center" href="/admin">
          <Image alt="Elyst AI" className="h-8 w-auto object-contain brightness-0 invert sm:h-10" height={45} src="/logo-wordmark.svg" width={140} />
        </Link>
        <p className="rounded-md bg-green/15 px-2.5 py-1 text-center lms-meta font-bold uppercase tracking-wide text-green sm:mt-1">Admin console</p>
      </div>
      <nav className="mt-3 flex gap-1 overflow-x-auto px-3 pb-3 sm:mt-6 sm:flex-col sm:space-y-1 sm:pb-0" aria-label="Admin">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-small font-bold transition-colors ${
                active ? "bg-white/15 text-green" : "text-fg-muted-dark hover:bg-white/10 hover:text-fg-on-dark"
              }`}
              href={item.href}
              key={item.href}
            >
              <item.Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden sm:mt-auto sm:block sm:border-t sm:border-white/15 sm:p-3">
        <Link
          className="flex min-h-11 items-center gap-3 rounded-md px-3 lms-label font-bold text-fg-muted-dark transition-colors hover:bg-white/10 hover:text-fg-on-dark"
          href="/learn"
        >
          <GraduationCap className="h-4 w-4" aria-hidden />
          View as learner
        </Link>
      </div>
    </aside>
  );
}
