"use client";

import { useEffect, useState } from "react";

/**
 * True on devices that can't hover (touch / phones / tablets without a mouse).
 * Starts `false` (matches SSR markup) and flips after mount once we can read
 * `matchMedia` — used to swap out continuous-animation effects for static
 * fallbacks on phones, where they tend to saturate the main thread.
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);

  return isTouch;
}
