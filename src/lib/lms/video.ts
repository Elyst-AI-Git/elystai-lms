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
    return {
      provider: "youtube",
      url: `https://www.youtube-nocookie.com/embed/${input.youtubeId}?rel=0`,
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
