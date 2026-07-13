export interface VideoEmbed {
  provider: "youtube";
  url: string;
}

function isValidYoutubeId(id: string | null): id is string {
  return typeof id === "string" && id.length > 0 && !/[/?&=\s]/.test(id);
}

/** Resolves the privacy-enhanced YouTube embed without accepting pasted URLs. */
export function resolveVideoEmbed(input: { youtubeId: string | null }): VideoEmbed | null {
  if (!isValidYoutubeId(input.youtubeId)) return null;
  // Privacy-enhanced host + params that strip most of the "YouTube-ness":
  // rel=0 keeps related videos to our own channel, modestbranding hides the
  // logo chrome, iv_load_policy=3 kills annotations, and playsinline stops
  // iOS from hijacking into the native fullscreen YouTube player.
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    playsinline: "1",
    color: "white",
  });
  return {
    provider: "youtube",
    url: `https://www.youtube-nocookie.com/embed/${input.youtubeId}?${params.toString()}`,
  };
}
