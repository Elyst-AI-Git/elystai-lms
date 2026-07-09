import Link from "next/link";
import { requireAdmin } from "@/lib/lms/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // non-admins 404 here — no login hint (spec T6)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-white">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
          <span className="font-display font-bold tracking-display text-emerald">Elyst Admin</span>
          <div className="flex items-center gap-4 text-small font-medium text-fg-2">
            <Link href="/admin/content" className="hover:text-emerald">Content</Link>
            <Link href="/admin/content/resources" className="hover:text-emerald">Resources</Link>
            <Link href="/admin/progress" className="hover:text-emerald">Progress</Link>
            <Link href="/admin/submissions" className="hover:text-emerald">Submissions</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
