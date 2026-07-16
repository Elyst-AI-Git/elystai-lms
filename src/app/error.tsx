"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-2xl items-center p-4 sm:p-6">
      <section className="surface-dark-hero w-full overflow-hidden rounded-card p-6 shadow-card sm:p-10">
        <p className="eyebrow text-green">Elyst AI learning portal</p>
        <h1 className="mt-3 text-h2 text-fg-on-dark">Something went wrong on our end.</h1>
        <p className="mt-4 text-small text-fg-muted-dark">
          Nothing you did caused this. Try again - if it keeps happening, let us know in the WhatsApp group.
        </p>
        <div className="mt-8">
          <button className="btn btn-accent pressable" onClick={() => reset()} type="button">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
