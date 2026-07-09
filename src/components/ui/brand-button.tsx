"use client";

/**
 * BrandButton — single reusable button for the whole site.
 *
 * `variant="metal"` (default) renders the cult-ui MetalButton (liquid-metal ring)
 * filled with the brand emerald. `variant="outline"` renders a clean dark-green
 * outline with a white interior (used for the "Explore programs" actions).
 *
 * Pass `href` to render as a link (Next <Link> for internal, <a> for external/hash).
 */
import * as React from "react";
import Link from "next/link";
import { MetalButton } from "@/components/ui/metal-button";
import { useIsTouch } from "@/lib/use-touch";

type BrandVariant = "metal" | "outline" | "solid";
/**
 * "emerald" = brand emerald fill (default).
 * "light"   = premium light-grey fill, black text (Nav CTA).
 * "green"   = brand bright-green (#00df82) fill, black text, blackish metal ring.
 */
type BrandTone = "emerald" | "light" | "green";

type BrandButtonProps = {
  href?: string;
  variant?: BrandVariant;
  tone?: BrandTone;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  full?: boolean;
  preset?: "chromatic" | "silver" | "gold";
  /** Disables the button (and, for href-rendered links, blocks navigation). */
  disabled?: boolean;
};

const DISABLED_CLASS = "opacity-50 cursor-not-allowed pointer-events-none";

const BASE =
  "inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap " +
  "min-h-[48px] px-6 text-[length:var(--text-small)] leading-none";

/* Shared corner radius — matches the small arrow-icon button in the FinalCta
   panels (rounded-md, ~6px), the site's reference "curve" for every button. */
const RADIUS_CLASS = "rounded-md";
const RADIUS_PX = 6;

function Inner({ href, onClick, className, children, disabled }: {
  href?: string;
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (href) {
    const external = href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:");
    // Links have no native `disabled`; block navigation explicitly and mark
    // it for assistive tech instead of just dimming the style.
    const linkClassName = disabled ? `${className} ${DISABLED_CLASS}` : className;
    const handleLinkClick: React.MouseEventHandler = (e) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      onClick?.();
    };
    if (external) {
      return (
        <a
          href={disabled ? undefined : href}
          onClick={handleLinkClick}
          className={linkClassName}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        href={href}
        onClick={handleLinkClick}
        className={linkClassName}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? `${className} ${DISABLED_CLASS}` : className}
    >
      {children}
    </button>
  );
}

export function BrandButton({
  href,
  variant = "metal",
  tone = "emerald",
  className,
  children,
  onClick,
  full,
  preset = "silver",
  disabled,
}: BrandButtonProps) {
  const width = full ? "w-full" : "w-fit";
  const isTouch = useIsTouch();

  if (variant === "outline") {
    return (
      <Inner
        href={href}
        onClick={onClick}
        disabled={disabled}
        className={`${BASE} ${width} ${RADIUS_CLASS} border-2 border-emerald bg-white text-emerald transition-colors hover:bg-emerald/5 ${className ?? ""}`}
      >
        {children}
      </Inner>
    );
  }

  // Flat, solid filled button — no metal shader, no glow. Used in the CTA
  // banners where a plain high-contrast action reads cleaner than the metal
  // ring. Tone picks the fill + a text colour with enough contrast on it.
  if (variant === "solid") {
    let solidFill: string;
    if (tone === "light") {
      solidFill = "bg-[#eef0ee] text-[#0a0a0a] hover:bg-[#e3e6e2]";
    } else if (tone === "green") {
      solidFill = "bg-green text-[#06140e] hover:bg-[#00c973]";
    } else {
      solidFill = "bg-emerald text-fg-on-dark hover:bg-emerald-light";
    }
    return (
      <Inner
        href={href}
        onClick={onClick}
        disabled={disabled}
        className={`${BASE} ${width} ${RADIUS_CLASS} ${solidFill} transition-colors ${className ?? ""}`}
      >
        {children}
      </Inner>
    );
  }

  const isLight = tone === "light";
  const isGreen = tone === "green";
  const onDark = !isLight && !isGreen;

  let fxFill: string;
  if (isLight) {
    fxFill = "bg-[#eef0ee]! text-[#0a0a0a]! hover:bg-[#e3e6e2]!";
  } else if (isGreen) {
    fxFill = "bg-green! text-[#0a0a0a]! hover:bg-[#00c973]!";
  } else {
    fxFill = "bg-emerald! text-fg-on-dark! hover:bg-emerald-light!";
  }

  // metal variant — emerald (default) / light-grey (Nav) / bright-green (See AIOS) fill.
  // The liquid-metal shader ring IS the effect; no outer glow.

  // MetalFx renders an animated liquid-metal shader behind every button. On
  // touch devices that's a continuous effect nobody can interact with (no
  // cursor to reflect), so render a flat static button with the same brand
  // fill/colors instead.
  if (isTouch) {
    return (
      <Inner
        href={href}
        onClick={onClick}
        disabled={disabled}
        className={`${BASE} ${width} ${RADIUS_CLASS} border-2 border-border ${fxFill} ${className ?? ""}`}
      >
        {children}
      </Inner>
    );
  }

  // For href-rendered metal buttons there's no native `disabled`; block
  // navigation explicitly the same way Inner does for links.
  const handleMetalLinkClick: React.MouseEventHandler = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  return (
    <MetalButton
      preset={isGreen ? "silver" : preset}
      theme={isGreen ? "dark" : isLight ? "light" : "auto"}
      borderRadius={RADIUS_PX}
      metalFxClassName={`${full ? "w-full" : ""} ${fxFill}`}
      className={`${BASE} ${width} ${RADIUS_CLASS} ${onDark ? "text-fg-on-dark" : "text-[#0a0a0a]"} ${className ?? ""} ${disabled ? DISABLED_CLASS : ""}`}
      render={
        href ? (
          href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") ? (
            <a href={disabled ? undefined : href} onClick={handleMetalLinkClick} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} />
          ) : (
            <Link href={href} onClick={handleMetalLinkClick} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} />
          )
        ) : undefined
      }
      nativeButton={!href}
      disabled={!href ? disabled : undefined}
      onClick={!href ? onClick : undefined}
    >
      {children}
    </MetalButton>
  );
}
