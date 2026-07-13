"use client";

import { LogOut } from "lucide-react";
import * as React from "react";

/**
 * Sign-out with a confirm step (spec: prevent accidental instant sign-out).
 * Standard pattern used by Gmail/Slack/GitHub etc for a direct, always-visible
 * sign-out control: clicking it opens a small confirm dialog rather than
 * firing the action immediately - the mis-click case this exists for.
 */
export function SignOutButton({
  triggerClassName,
  iconClassName = "h-4 w-4",
  children,
}: {
  triggerClassName: string;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button className={triggerClassName} onClick={() => setOpen(true)} type="button">
        <LogOut className={iconClassName} strokeWidth={2} aria-hidden />
        {children}
      </button>

      {open && (
        <div
          aria-labelledby="signout-confirm-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <div
            className="w-full max-w-xs rounded-md bg-white p-5 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-h3 text-fg" id="signout-confirm-title">Sign out?</p>
            <p className="mt-1 text-small text-fg-2">You&apos;ll need to sign in again to get back to your learning plan.</p>
            <div className="mt-5 flex gap-3">
              <button
                className="pressable min-h-11 flex-1 rounded-md border border-border px-4 text-small font-bold text-fg-2 transition-colors hover:border-emerald hover:text-emerald"
                onClick={() => setOpen(false)}
                ref={cancelRef}
                type="button"
              >
                Cancel
              </button>
              <button
                className="pressable min-h-11 flex-1 rounded-md bg-emerald px-4 text-small font-bold text-fg-on-dark transition-colors hover:bg-emerald-light disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  formRef.current?.requestSubmit();
                }}
                type="button"
              >
                {busy ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form action="/api/auth/signout" className="hidden" method="post" ref={formRef} />
    </>
  );
}
