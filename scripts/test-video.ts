/**
 * Unit tests for src/lib/lms/video.ts (YouTube-only since Bunny was removed).
 * Run: npx tsx scripts/test-video.ts
 */
import { resolveVideoEmbed, type VideoEmbed } from "../src/lib/lms/video";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${a}, want ${e})`);
}

check(
  "youtube id → youtube-nocookie embed with modest chrome",
  resolveVideoEmbed({ youtubeId: "aqz-KE-bpKQ" }),
  {
    provider: "youtube",
    url: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white",
  } as VideoEmbed
);

check("no id → null", resolveVideoEmbed({ youtubeId: null }), null);
check("empty-string id → null", resolveVideoEmbed({ youtubeId: "" }), null);

// --- defensive: junk pasted into youtube_id is rejected, never embedded raw
check("id with query chars → null", resolveVideoEmbed({ youtubeId: "aqz-KE-bpKQ?autoplay=1" }), null);
check("id with slash → null", resolveVideoEmbed({ youtubeId: "watch/aqz" }), null);
check("full URL → null", resolveVideoEmbed({ youtubeId: "https://vimeo.com/12345" }), null);
check("id with whitespace → null", resolveVideoEmbed({ youtubeId: "abc def" }), null);
check("id with = → null", resolveVideoEmbed({ youtubeId: "v=abc" }), null);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll video-embed assertions passed.");
