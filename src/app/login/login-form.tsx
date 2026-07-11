"use client";

import { type FormEvent, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import Image from "next/image";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { logClientEvent } from "@/lib/log-client";
import { LMS_EVENTS } from "@/lib/lms/events";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  oauthError: boolean;
};

export function LoginForm({ oauthError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(
    oauthError ? "Google sign-in could not be completed. Please try again." : ""
  );

  function reportFailure() {
    logClientEvent(LMS_EVENTS.learner.auth.loginFailed);
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setIsSubmitting(false);

    if (signInError) {
      setError("No account found - register at elystai.com/ai-for-work.");
      reportFailure();
      return;
    }

    setCode("");
    setStep("code");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) {
      setError("Enter the full 6-digit code from your email.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });
    setIsSubmitting(false);

    if (verifyError) {
      setError("That code isn't valid. Check the latest email and try again.");
      reportFailure();
      return;
    }

    logClientEvent(LMS_EVENTS.learner.auth.loginSucceeded);
    router.push("/learn");
  }

  async function signInWithGoogle() {
    setError("");
    setIsSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError || !data.url) {
      setIsSubmitting(false);
      setError("Google sign-in could not be started. Please try again.");
      reportFailure();
      return;
    }

    window.location.assign(data.url);
  }

  return (
    <main id="main" className="lms-surface mx-auto flex min-h-dvh w-full max-w-[1440px] items-center p-4 sm:p-6 lg:p-6">
      <div className="grid w-full overflow-hidden rounded-card border border-border bg-white shadow-card lg:min-h-[620px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-8">
          <a href="/login" className="inline-flex w-fit" aria-label="Elyst AI login">
            <Image alt="Elyst AI" className="h-12 w-auto object-contain" height={60} priority src="/logo-wordmark.svg" width={186} />
          </a>

          <div className="my-auto max-w-md py-8 lg:py-10">
            <h1 className="text-h2 text-fg">Welcome to your learning space.</h1>
            <p className="mt-3 text-small text-fg-2">
              Sign in with the account you used to join AI for Work.
            </p>

            <div className="mt-8 border-t border-border pt-6">
              {step === "email" ? (
                <form className="space-y-4" onSubmit={requestCode}>
                  <label className="block" htmlFor="email">
                    <span className="text-label font-bold text-fg">Email address</span>
                    <span className="relative mt-2 block">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-3" aria-hidden />
                      <input
                        autoComplete="email"
                        className="min-h-12 w-full rounded-md border border-border bg-white py-3 pl-12 pr-4 text-small text-fg outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                        id="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                        type="email"
                        value={email}
                      />
                    </span>
                  </label>
                  <button className="btn btn-primary pressable w-full rounded-md" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Sending code…" : "Email me a sign-in code"}
                  </button>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={verifyCode}>
                  <div>
                    <p className="text-small font-bold text-fg">Enter your 6-digit code</p>
                    <p className="mt-1 text-label text-fg-3">We sent it to {email.trim()}.</p>
                  </div>
                  <InputOTP disabled={isSubmitting} maxLength={6} onChange={setCode} value={code}>
                    <InputOTPGroup className="w-full justify-between gap-1.5 sm:justify-start sm:gap-2">
                      {Array.from({ length: 6 }, (_, index) => (
                        <InputOTPSlot className="h-11 w-10 sm:h-12 sm:w-11" index={index} key={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <button className="btn btn-primary pressable w-full rounded-md" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Signing in…" : "Sign in"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    className="text-label font-bold text-emerald underline-offset-4 hover:underline"
                    onClick={() => {
                      setCode("");
                      setError("");
                      setStep("email");
                    }}
                    type="button"
                  >
                    Use a different email
                  </button>
                </form>
              )}

              {error && (
                <p aria-live="polite" className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-label font-medium text-fg" role="alert">
                  {error}
                </p>
              )}

              {step === "email" && (
                <>
                  <div className="my-6 flex items-center gap-3 text-label text-fg-3" aria-hidden>
                    <span className="h-px flex-1 bg-border" />
                    or
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <button
                    className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-5 text-small font-bold text-fg transition hover:border-emerald hover:bg-emerald/5 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={signInWithGoogle}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.842H9v3.486h4.844a4.14 4.14 0 0 1-1.797 2.718v2.258h2.909c1.703-1.568 2.684-3.875 2.684-6.62Z" />
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.175l-2.909-2.258c-.806.54-1.837.859-3.047.859-2.344 0-4.328-1.584-5.037-3.711H.956v2.333A9 9 0 0 0 9 18Z" />
                      <path fill="#FBBC05" d="M3.963 10.715A5.41 5.41 0 0 1 3.681 9c0-.595.102-1.174.282-1.715V4.952H.956A9 9 0 0 0 0 9c0 1.452.348 2.827.956 4.048l3.007-2.333Z" />
                      <path fill="#EA4335" d="M9 3.574c1.321 0 2.508.454 3.442 1.345l2.582-2.582C13.463.886 11.426 0 9 0A9 9 0 0 0 .956 4.952l3.007 2.333C4.672 5.158 6.656 3.574 9 3.574Z" />
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-label text-fg-3">
            New to AI for Work?{" "}
            <a className="font-bold text-emerald underline-offset-4 hover:underline" href="https://elystai.com/ai-for-work">
              Register at elystai.com
            </a>
          </p>
        </section>

        <aside className="relative hidden overflow-hidden bg-surface-muted lg:block lg:min-h-full">
          <Image
            alt=""
            className="object-cover object-center -rotate-180 scale-110"
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 55vw"
            src="/login-hero.jpg"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/90 to-transparent p-12 pt-28">
            <p className="eyebrow text-emerald">AI for Work</p>
            <p className="mt-3 whitespace-nowrap font-display text-h2 font-bold tracking-display text-fg">
              Make AI useful at your work.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
