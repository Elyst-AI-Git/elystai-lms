export type VideoProvider = "youtube" | "bunny";

export interface VideoEmbed {
  provider: VideoProvider;
  url: string;
}

function isValidYoutubeId(id: string | null): id is string {
  return typeof id === "string" && id.length > 0 && !/[/?&=\s]/.test(id);
}

/** Resolves the preferred privacy-enhanced video embed without accepting pasted URLs. */
export function resolveVideoEmbed(input: {
  youtubeId: string | null;
  bunnyVideoId: string | null;
  bunnyLibraryId: string | undefined;
}): VideoEmbed | null {
  if (isValidYoutubeId(input.youtubeId)) {
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

  if (input.bunnyVideoId && input.bunnyLibraryId) {
    return {
      provider: "bunny",
      url: `https://iframe.mediadelivery.net/embed/${input.bunnyLibraryId}/${input.bunnyVideoId}`,
    };
  }

  return null;
}
