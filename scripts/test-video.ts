/**
 * Test contract for handoff 002 (YouTube video support).
 * Written test-first by Claude — FAILS until Codex implements src/lib/lms/video.ts
 * with the exact signature below. Run: npx tsx scripts/test-video.ts
 */
import { resolveVideoEmbed, type VideoEmbed } from "../src/lib/lms/video";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${a}, want ${e})`}`);
}

const LIB = "12345";

// --- youtube takes precedence, privacy-enhanced host, no rel to other channels
check(
  "youtube id → youtube-nocookie embed",
  resolveVideoEmbed({ youtubeId: "aqz-KE-bpKQ", bunnyVideoId: null, bunnyLibraryId: LIB }),
  { provider: "youtube", url: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white" } as VideoEmbed
);
check(
  "youtube wins even when bunny id also present",
  resolveVideoEmbed({ youtubeId: "aqz-KE-bpKQ", bunnyVideoId: "bunny-1", bunnyLibraryId: LIB })?.provider,
  "youtube"
);

// --- bunny fallback --------------------------------------------------------
check(
  "bunny id (no youtube) → mediadelivery embed",
  resolveVideoEmbed({ youtubeId: null, bunnyVideoId: "bunny-1", bunnyLibraryId: LIB }),
  { provider: "bunny", url: "https://iframe.mediadelivery.net/embed/12345/bunny-1" } as VideoEmbed
);

// --- nothing playable ------------------------------------------------------
check("no ids → null", resolveVideoEmbed({ youtubeId: null, bunnyVideoId: null, bunnyLibraryId: LIB }), null);
check("empty-string youtube id is ignored", resolveVideoEmbed({ youtubeId: "", bunnyVideoId: "bunny-1", bunnyLibraryId: LIB })?.provider, "bunny");
check(
  "bunny id but missing library id → null (cannot build a valid url)",
  resolveVideoEmbed({ youtubeId: null, bunnyVideoId: "bunny-1", bunnyLibraryId: undefined }),
  null
);

// --- defensive: a full URL pasted into youtube_id is rejected, not embedded raw
check(
  "youtube_id containing a URL/param is rejected (id must be a bare id)",
  resolveVideoEmbed({ youtubeId: "aqz-KE-bpKQ?autoplay=1", bunnyVideoId: null, bunnyLibraryId: LIB }),
  null
);
check(
  "youtube_id with a slash is rejected",
  resolveVideoEmbed({ youtubeId: "watch/aqz", bunnyVideoId: null, bunnyLibraryId: LIB }),
  null
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll video-embed assertions passed.");
