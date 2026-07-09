"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useIsTouch } from "@/lib/use-touch";

/**
 * CtaBanner — a self-contained, horizontal call-to-action card: a bright
 * brand-green panel with a headline + supporting line on the left and the
 * action(s) on the right, over a soft wave texture. Shared across the AIOS,
 * Accelerator and AI-for-Work closes so every arm of the site ends on the
 * same confident note.
 *
 * - `sharp` removes the corner radius (the AIOS page's sharp-edged language).
 * - `actions` is the button slot (kept as a prop so each page supplies its own
 *   BrandButton tones without this component depending on routing).
 */
type CtaTone = "light" | "dark";

type CtaBannerProps = {
  heading: React.ReactNode;
  sub?: React.ReactNode;
  actions: React.ReactNode;
  sharp?: boolean;
  /** "light" = bright-green panel, dark text (default). "dark" = deep
   *  dark-green panel, light text — used on the AIOS close. */
  tone?: CtaTone;
  /** Override the corner radius (defaults to --radius-card). Pass the navbar's
   *  pill radius (--radius) to match a page that wants a tighter curve. */
  radius?: string;
  /** Adds the same subtle ring used on the homepage's Learn AI program cards
   *  (ring-1 ring-black/25) — an outline rather than relying on the glow alone. */
  bordered?: boolean;
  /** Gives the heading column more width (max-w-2xl vs max-w-xl) — used when the
   *  action slot is a narrow stacked column. */
  wide?: boolean;
  /** Stacks the action buttons vertically, centered on a shared axis, instead
   *  of wrapping them in a row. */
  stackedActions?: boolean;
  /** Override the heading font size (defaults to --text-h2). */
  headingSize?: string;
};

function WaveTexture({ tone }: { tone: CtaTone }) {
  // Two translucent waves drifting across the panel — the same organic "flow"
  // motif as the reference, kept very low-contrast so the copy always wins.
  // On the dark panel the ink waves vanish, so switch to light washes.
  const fill1 = tone === "dark" ? "rgba(255,255,255,0.05)" : "rgba(3,98,76,0.10)";
  const fill2 = tone === "dark" ? "rgba(255,255,255,0.04)" : "rgba(3,98,76,0.08)";
  const stroke = tone === "dark" ? "rgba(0,223,130,0.22)" : "rgba(255,255,255,0.16)";
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 1200 320"
      fill="none"
    >
      <path
        d="M0 232 C 220 168 360 268 600 212 C 840 156 980 248 1200 196 L1200 320 L0 320 Z"
        fill={fill1}
      />
      <path
        d="M0 268 C 260 214 420 300 660 248 C 900 196 1040 280 1200 240 L1200 320 L0 320 Z"
        fill={fill2}
      />
      <path
        d="M0 96 C 240 150 420 60 640 110 C 880 164 1020 84 1200 128"
        stroke={stroke}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CtaBanner({ heading, sub, actions, sharp = false, tone = "light", radius: radiusProp, bordered = false, wide = false, stackedActions = false, headingSize }: CtaBannerProps) {
  const isTouch = useIsTouch();
  const radius = sharp ? "0px" : radiusProp ?? "var(--radius-card)";
  const isDark = tone === "dark";

  const background = isDark
    ? "linear-gradient(135deg, var(--elyst-emerald) 0%, var(--surface-dark) 100%)"
    : // Bright brand green (#00df82) as the primary, deepening only slightly
      // toward the far corner so the panel stays unmistakably #00df82.
      "linear-gradient(135deg, var(--elyst-green) 0%, var(--elyst-green) 62%, color-mix(in srgb, var(--elyst-green) 82%, var(--elyst-green-mid)) 100%)";
  const headingColor = isDark ? "var(--fg-on-dark)" : "var(--elyst-ink)";
  const subColor = isDark ? "var(--elyst-green)" : "var(--elyst-emerald)";

  const inner = (
    <div
      className={`relative overflow-hidden ${bordered ? "ring-1 ring-black/25" : ""}`}
      style={{
        borderRadius: radius,
        background,
        boxShadow: "var(--shadow-glow)",
      }}
    >
      <WaveTexture tone={tone} />
      <div className="relative z-10 flex flex-col gap-7 px-7 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-14 lg:py-14">
        <div className={wide ? "max-w-2xl" : "max-w-xl"}>
          <h2
            className="font-display font-bold"
            style={{ fontSize: headingSize ?? "var(--text-h2)", color: headingColor, lineHeight: 1.1 }}
          >
            {heading}
          </h2>
          {sub && (
            <p
              className="mt-3"
              style={{ fontSize: "var(--text-body)", color: subColor }}
            >
              {sub}
            </p>
          )}
        </div>
        <div
          className={
            stackedActions
              ? "flex flex-col items-stretch gap-3 sm:items-center"
              : "flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap lg:justify-end"
          }
        >
          {actions}
        </div>
      </div>
    </div>
  );

  return (
    <section style={{ padding: "var(--section-py) var(--section-px)" }}>
      <div className="mx-auto max-w-6xl">
        {isTouch ? (
          inner
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          >
            {inner}
          </motion.div>
        )}
      </div>
    </section>
  );
}
