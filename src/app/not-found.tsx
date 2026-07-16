import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-2xl items-center p-4 sm:p-6">
      <section className="surface-dark-hero w-full overflow-hidden rounded-card p-6 shadow-card sm:p-10">
        <p className="eyebrow text-green">Elyst AI learning portal</p>
        <h1 className="mt-3 text-h2 text-fg-on-dark">We couldn&apos;t find that page.</h1>
        <p className="mt-4 text-small text-fg-muted-dark">
          It may have moved, or the link might be out of date. Head back to your learning plan and pick up from there.
        </p>
        <div className="mt-8">
          <Link className="btn btn-accent pressable" href="/learn">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to learning plan
          </Link>
        </div>
      </section>
    </main>
  );
}
