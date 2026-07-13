import { ArrowUpRight, LogOut } from "lucide-react";
import { ENROLL_URL } from "@/lib/lms/constants";
import { requireUser } from "@/lib/lms/auth";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const user = await requireUser();

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-2xl items-center p-4 sm:p-6">
      <section className="surface-dark-hero w-full overflow-hidden rounded-card p-6 shadow-card sm:p-10">
        <p className="eyebrow text-green">Elyst AI learning portal</p>
        <h1 className="mt-3 text-h2 text-fg-on-dark">This portal is exclusively for AI for Work members.</h1>
        <p className="mt-4 text-small text-fg-muted-dark">
          You&apos;re currently signed in as <span className="font-bold text-fg-on-dark">{user.email ?? "this account"}</span>.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a className="btn btn-accent pressable" href={ENROLL_URL}>
            Join AI for Work
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
          <form action="/api/auth/signout" method="post">
            <button className="btn pressable w-full border border-white/25 bg-transparent text-fg-on-dark hover:bg-white/10 sm:w-auto" type="submit">
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
