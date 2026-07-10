import Link from "next/link";
import { requireAdmin } from "@/lib/lms/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin/content", label: "Content", icon: "📚" },
  { href: "/admin/content/resources", label: "Resources", icon: "🗂" },
  { href: "/admin/progress", label: "Progress", icon: "📈" },
  { href: "/admin/submissions", label: "Submissions", icon: "📥" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // non-admins 404 here — no login hint (spec T6)

  return (
    <div className="flex min-h-dvh flex-col sm:flex-row">
      {/* sidebar (top bar on small screens) */}
      <aside className="shrink-0 border-b border-border bg-white sm:w-56 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="font-display text-lg font-bold tracking-display text-emerald">Elyst</span>
          <span className="rounded-pill bg-emerald/10 px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-emerald">
            Admin
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 sm:flex-col sm:pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="pressable flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-small font-medium text-fg-2 transition-colors hover:bg-emerald/5 hover:text-emerald"
            >
              <span aria-hidden className="text-label">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
