import type { MetadataRoute } from "next";

/**
 * PWA manifest so "Add to Home Screen" on mobile gets a branded icon and a
 * standalone (no browser chrome) launch — most learners are on mobile.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Accelerator Hub by Elyst AI",
    short_name: "Elyst AI",
    description: "Your AI for Work learning space.",
    start_url: "/learn",
    display: "standalone",
    background_color: "#f6f9f7",
    theme_color: "#03624c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
