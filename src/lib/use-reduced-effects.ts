"use client";

import { useEffect, useState } from "react";

// Below these we treat the machine as low-end and serve the static fallback.
// A genuine quad-core *with* hyperthreading reports 8 logical cores, so `<= 4`
// targets older/budget CPUs without catching modern mid-range laptops. Browsers
// also clamp deviceMemory to a max of 8, so 4 means roughly <=4 GB of RAM.
const LOW_CORE_COUNT = 4;
const LOW_MEMORY_GB = 4;

/**
 * Hardware-only heuristic for a low-powered machine — few logical CPU cores or
 * little memory. Reads `navigator`, so only call it on the client (e.g. inside
 * an effect or event handler). Shared by {@link useReducedEffects} and by the
 * canvas components that already run their own client-side matchMedia checks.
 */
export function isLowPerfDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency;
  const lowCores = typeof cores === "number" && cores <= LOW_CORE_COUNT;
  // deviceMemory is non-standard (Chromium); when missing we can't use it.
  const mem = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const lowMemory = typeof mem === "number" && mem <= LOW_MEMORY_GB;
  return lowCores || lowMemory;
}

/**
 * True when we should serve the lighter, *static* version of a continuous or
 * heavy animation. This is a superset of {@link useIsTouch}: as well as touch
 * devices and the reduced-motion preference, it catches **low-powered
 * desktops** — machines that have a mouse (so `hover: none` is false and
 * touch-gating misses them entirely) but few CPU cores or little memory, where
 * our canvas / WebGL / requestAnimationFrame loops still cause visible jank.
 *
 * Like {@link useIsTouch} it returns `true` (reduced) on the server and the
 * first client render — so the markup matches SSR and no consumer ever starts
 * an expensive canvas/RAF loop before the real signals can be read — then
 * flips to `false` after mount on capable desktops, which keep the full
 * experience.
 */
export function useReducedEffects(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const noHover = window.matchMedia("(hover: none)").matches;
    setReduced(prefersReduced || noHover || isLowPerfDevice());
  }, []);

  return reduced;
}
