"use client";

import * as React from "react";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Bunny Stream iframe embed (plan: no custom player — best mobile-Safari
 * compatibility) + the 30s telemetry heartbeat (spec D3: logged for future
 * AI use, never drives completion). Position is approximated by time on
 * page since the iframe API doesn't expose playhead cross-origin; paused
 * tabs are excluded via the visibility check.
 */
export function VideoEmbed({ lessonId, embedUrl }: { lessonId: string; embedUrl: string }) {
  const startedAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    startedAt.current ??= Date.now();
    const timer = setInterval(() => {
      if (startedAt.current === null) return;
      if (document.hidden) return;
      void fetch("/api/learn/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          positionSeconds: Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000),
        }),
        keepalive: true,
      }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [lessonId]);

  return (
    <div className="relative w-full bg-ink" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src={embedUrl}
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title="Lesson video"
      />
    </div>
  );
}
