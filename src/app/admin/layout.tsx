import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/lms/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // non-admins 404 here - no login hint (spec T6)

  return (
    <div className="lms-surface flex min-h-dvh flex-col bg-bg sm:flex-row">
      <AdminSidebar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
