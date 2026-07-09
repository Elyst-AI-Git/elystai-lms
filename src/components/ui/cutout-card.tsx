"use client";

import type {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  ReactNode,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// Cutout Card — a card primitive whose pinned labels appear "cut into" the
// surface via inverted-radius corners. Adapted to Elyst tokens; motion via
// framer-motion.
// ============================================================================

export const cutoutCardSurfaceClassName =
  "relative overflow-hidden rounded-[28px] shadow-card ring-1 ring-black/5";

export function CutoutCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>
  );
}

export function CutoutCardMedia({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

export function CutoutCardImage({
  className,
  alt = "",
  ...props
}: ComponentPropsWithoutRef<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      {...props}
    />
  );
}

export function CutoutCardOverlay({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/30 to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function CutoutCardInsetLabel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("absolute z-10", className)} {...props}>
      {children}
    </div>
  );
}

export function CutoutCardPin({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("absolute z-10", className)} {...props}>
      {children}
    </div>
  );
}

// The inverted-radius corner: a filled quarter-square with a concave arc, so
// an adjacent pinned element blends smoothly into the card. Fills currentColor.
export function CutoutCorner({
  size = 32,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="currentColor"
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      style={style}
    >
      <path d={`M0 0 H${size} A ${size} ${size} 0 0 1 0 ${size} Z`} />
    </svg>
  );
}

export function CutoutCardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CutoutCardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CutoutCardAction({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("absolute z-10", className)} {...props}>
      {children}
    </div>
  );
}

// Stagger variants for revealing card content in sequence.
export function useCutoutContentStaggerVariants() {
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0, y: 8 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const },
      },
    },
  };
}

export const MotionDiv = motion.div;

export type { ReactNode };
