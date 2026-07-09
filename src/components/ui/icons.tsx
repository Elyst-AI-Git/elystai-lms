/**
 * Bespoke Elyst icon set — hand-drawn inline SVG in the brand's geometric
 * language. Two variants share identical geometry:
 *   - "line"    → blueprint monoline (Home + AIOS / business side)
 *   - "duotone" → same outline + a green-tint fill panel (Learn / Circle side)
 *
 * Colour comes from `currentColor` (set a `text-emerald` / `text-green` class
 * on the parent), so each icon inherits the surface it sits on. The signal-green
 * accent and the duotone tint are fixed brand values.
 *
 * Every icon is drawn to a 24×24 grid, 1.7 stroke, round caps/joins — so the
 * whole set reads as one family regardless of which section it lands in.
 */

import * as React from "react";

/**
 * IconTile — the metal chip the bespoke icons sit in. Matches the floating
 * navbar's treatment: a vertical metal gradient, a bright top edge, a dark
 * bottom edge, and the nav's `rounded-md` corner. Two tones:
 *   - "darkgreen" → navbar-like deep green, white icon (Home + AIOS)
 *   - "lightgrey" → brushed light grey, black icon (Learn + Circle)
 * The tile sets `color`, so the icon inside inherits it via currentColor
 * (don't pass a text-* colour class to the icon when wrapping it here).
 */
export function IconTile({
  tone = "darkgreen",
  size = 44,
  className,
  children,
}: {
  tone?: "darkgreen" | "lightgrey";
  size?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const dark = tone === "darkgreen";
  return (
    <span
      className={["inline-flex shrink-0 items-center justify-center rounded-md", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: size,
        height: size,
        color: dark ? "#FFFFFF" : "#0A0F0C",
        background: dark
          ? "linear-gradient(180deg, hsl(160 38% 14%) 0%, hsl(160 38% 8%) 55%, hsl(160 38% 11%) 100%)"
          : "linear-gradient(180deg, #f8faf9 0%, #dde4e0 55%, #ebefed 100%)",
        borderTop: dark
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid rgba(255,255,255,0.95)",
        borderBottom: dark
          ? "1px solid rgba(0,0,0,0.38)"
          : "1px solid rgba(3,98,76,0.18)",
        boxShadow: dark
          ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.26)"
          : "inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 6px rgba(3,98,76,0.10)",
      }}
    >
      {children}
    </span>
  );
}

export type IconVariant = "line" | "duotone";

export interface IconProps {
  className?: string;
  variant?: IconVariant;
  size?: number;
}

const ACCENT = "#00DF82"; // signal green — one highlight per icon
const TINT = "rgba(0, 223, 130, 0.16)"; // duotone fill panel

function Svg({
  className,
  size = 24,
  children,
}: {
  className?: string;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const fillFor = (v: IconVariant) => (v === "duotone" ? TINT : "none");

/* ----------------------------------------------------------------------- */
/*  Conversation / flow                                                     */
/* ----------------------------------------------------------------------- */

/** Message — chat bubble with a typing trio. (AIOS "Message", home chat) */
export function IconMessage({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7.5L7 19.5V16.5H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
        fill={fillFor(variant)}
      />
      <circle cx="8.5" cy="11" r="1" fill={ACCENT} stroke="none" />
      <circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Understands — reads your documents/data (lined page + magnifier). */
export function IconUnderstand({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <rect x="4" y="3" width="11" height="15" rx="2" fill={fillFor(variant)} />
      <path d="M7 7.5h5M7 10.5h5M7 13.5h3" />
      <circle cx="15.5" cy="15" r="3.4" fill="var(--card, #fff)" />
      <path d="M18 17.4l2.4 2.4" stroke={ACCENT} />
    </Svg>
  );
}

/** Acts — completes the task and delivers (paper plane). */
export function IconAct({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M20.5 3.5 3.8 11.2a.6.6 0 0 0 .05 1.1l6 2.2 2.2 6a.6.6 0 0 0 1.1.05L20.5 3.5Z"
        fill={fillFor(variant)}
      />
      <path d="M20.5 3.5 9.85 14.5" stroke={ACCENT} />
    </Svg>
  );
}

/* ----------------------------------------------------------------------- */
/*  Capabilities                                                            */
/* ----------------------------------------------------------------------- */

/** Answers from your docs — bubble with an insight spark. */
export function IconAnswer({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3.2V16H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        fill={fillFor(variant)}
      />
      <path
        d="M12 7.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z"
        fill={ACCENT}
        stroke="none"
      />
    </Svg>
  );
}

/** Document — folded-corner page with text lines. */
export function IconDocument({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M6.5 3h7L18 7.5V19a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        fill={fillFor(variant)}
      />
      <path d="M13 3v3.5A1.5 1.5 0 0 0 14.5 8H18" />
      <path d="M8 12.5h7M8 15.5h4.5" stroke={ACCENT} />
    </Svg>
  );
}

/** Daily briefings & tasks — checklist with one item done. */
export function IconBriefing({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <rect x="4" y="4" width="16" height="16" rx="3" fill={fillFor(variant)} />
      <path d="M7.5 9l1.4 1.4L11.5 7.6" stroke={ACCENT} />
      <path d="M14 9h3" />
      <path d="M7.5 14.5h2.5M14 14.5h3" />
    </Svg>
  );
}

/** Integrations — your tools as a 2×2 app grid. */
export function IconIntegrations({ className, variant = "line", size }: IconProps) {
  const fill = fillFor(variant);
  return (
    <Svg className={className} size={size}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" fill={ACCENT} stroke="none" opacity={variant === "duotone" ? 0.9 : 1} />
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" fill={fill} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" fill={fill} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" fill={fill} />
    </Svg>
  );
}

/** Access — shield with a check (role-based). */
export function IconAccess({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M12 3l7 2.6v5.1c0 4.4-3 7.6-7 9.3-4-1.7-7-4.9-7-9.3V5.6L12 3Z"
        fill={fillFor(variant)}
      />
      <path d="M9 12l2 2 4-4.2" stroke={ACCENT} />
    </Svg>
  );
}

/** Custom / bespoke — sparkle pair. */
export function IconCustom({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M11 4l1.7 4.8L17.5 10.5l-4.8 1.7L11 17l-1.7-4.8L4.5 10.5l4.8-1.7L11 4Z"
        fill={fillFor(variant)}
      />
      <path
        d="M18 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"
        fill={ACCENT}
        stroke="none"
      />
    </Svg>
  );
}

/* ----------------------------------------------------------------------- */
/*  The model / process                                                     */
/* ----------------------------------------------------------------------- */

/** Discovery — magnifier with an insight dot. */
export function IconDiscovery({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <circle cx="10.5" cy="10.5" r="6.5" fill={fillFor(variant)} />
      <circle cx="10.5" cy="10.5" r="2" fill={ACCENT} stroke="none" />
      <path d="M15.2 15.2 20 20" />
    </Svg>
  );
}

/** Configuration — sliders, tuned to you. */
export function IconConfigure({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path d="M4 7h7M16 7h4" />
      <path d="M4 12h4M13 12h7" />
      <path d="M4 17h7M16 17h4" />
      <circle cx="13" cy="7" r="2.2" fill={fillFor(variant)} />
      <circle cx="10" cy="12" r="2.2" fill={ACCENT} stroke="none" />
      <circle cx="13" cy="17" r="2.2" fill={fillFor(variant)} />
    </Svg>
  );
}

/** Deployment — goes live (rocket). */
export function IconDeploy({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M12 2.5c3.2 1.8 5 5.2 5 9.2l-2.3 2.3H9.3L7 11.7c0-4 1.8-7.4 5-9.2Z"
        fill={fillFor(variant)}
      />
      <circle cx="12" cy="9.5" r="1.7" fill={ACCENT} stroke="none" />
      <path d="M9.3 15l-2 2.5M14.7 15l2 2.5M10.5 17.5 12 21l1.5-3.5" />
    </Svg>
  );
}

/** Support — lifebuoy, we stay on. */
export function IconSupport({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <circle cx="12" cy="12" r="8.5" fill={fillFor(variant)} />
      <circle cx="12" cy="12" r="3.2" fill="var(--card, #fff)" />
      <path d="M9.7 9.7 6 6M14.3 9.7 18 6M9.7 14.3 6 18M14.3 14.3 18 18" stroke={ACCENT} />
    </Svg>
  );
}

/* ----------------------------------------------------------------------- */
/*  Pricing                                                                 */
/* ----------------------------------------------------------------------- */

/** One-time setup — fast bolt. */
export function IconSetup({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M13 2.5 5 13h5l-1 8.5L19 11h-5l1-8.5Z"
        fill={variant === "duotone" ? TINT : "none"}
      />
    </Svg>
  );
}

/** Retainer — ongoing / recurring cycle. */
export function IconRetainer({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <circle cx="12" cy="12" r="8.5" fill={fillFor(variant)} stroke="none" />
      <path d="M17.5 8A7 7 0 0 0 5.2 10" />
      <path d="M17.5 4.5V8H14" stroke={ACCENT} />
      <path d="M6.5 16A7 7 0 0 0 18.8 14" />
      <path d="M6.5 19.5V16H10" stroke={ACCENT} />
    </Svg>
  );
}

/** Training — mortarboard. */
export function IconTraining({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path d="M12 4 22 8.5 12 13 2 8.5 12 4Z" fill={fillFor(variant)} />
      <path d="M6.5 10.5v4.2c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.2" />
      <path d="M22 8.5v4.5" stroke={ACCENT} />
    </Svg>
  );
}

/* ----------------------------------------------------------------------- */
/*  Learn / Accelerator                                                     */
/* ----------------------------------------------------------------------- */

/** Built by people who build it — wrench. */
export function IconBuild({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path
        d="M15.5 4.2a4.2 4.2 0 0 0-5.3 5.3L4 15.7 6.5 18l6.2-6.2a4.2 4.2 0 0 0 5.3-5.3l-2.7 2.7-2-2 2.2-3Z"
        fill={fillFor(variant)}
      />
      <circle cx="6.8" cy="16.2" r="0.9" fill={ACCENT} stroke="none" />
    </Svg>
  );
}

/** Not your typical course — focused bullseye. */
export function IconFocus({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <circle cx="12" cy="12" r="8.5" fill={fillFor(variant)} />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.6" fill={ACCENT} stroke="none" />
    </Svg>
  );
}

/** Community / network — three linked nodes. */
export function IconCommunity({ className, variant = "line", size }: IconProps) {
  const fill = fillFor(variant);
  return (
    <Svg className={className} size={size}>
      <path d="M11 7.3 7 14.8M13 7.3 17 14.8M8.3 16.5h7.4" stroke={ACCENT} />
      <circle cx="12" cy="5.5" r="2.6" fill={fill} />
      <circle cx="6" cy="16.5" r="2.6" fill={fill} />
      <circle cx="18" cy="16.5" r="2.6" fill={fill} />
    </Svg>
  );
}

/** Our promise — one focused seal with a check. */
export function IconPromise({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path d="M8.5 18.5 7 22l5-2 5 2-1.5-3.5" />
      <circle cx="12" cy="9.5" r="6.5" fill={fillFor(variant)} />
      <path d="M9.3 9.7 11.2 11.6 14.8 7.8" stroke={ACCENT} />
    </Svg>
  );
}

/** AI program for professionals — briefcase + spark. */
export function IconProgram({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.4" fill={fillFor(variant)} />
      <path d="M8.5 7.5V6.3A1.8 1.8 0 0 1 10.3 4.5h3.4a1.8 1.8 0 0 1 1.8 1.8v1.2" />
      <path
        d="M12 10.3l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"
        fill={ACCENT}
        stroke="none"
      />
    </Svg>
  );
}

/** The Circle — a ring of members. */
export function IconCircle({ className, variant = "line", size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <circle cx="12" cy="12" r="8.5" fill={fillFor(variant)} />
      <circle cx="12" cy="4.5" r="1.9" fill={ACCENT} stroke="none" />
      <circle cx="5.5" cy="16" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="16" r="1.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}
