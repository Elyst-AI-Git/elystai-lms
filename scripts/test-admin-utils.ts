/**
 * Unit tests for admin-side helpers.
 * Run: npx tsx scripts/test-admin-utils.ts
 */
import { extractYoutubeId } from "../src/components/admin/lesson-editor";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
}

// --- extractYoutubeId: every paste shape an admin will actually use ---------
check("bare id passes through", extractYoutubeId("aqz-KE-bpKQ"), "aqz-KE-bpKQ");
check("watch?v= URL", extractYoutubeId("https://www.youtube.com/watch?v=aqz-KE-bpKQ"), "aqz-KE-bpKQ");
check("watch?v= with extra params", extractYoutubeId("https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=42s&list=PL123"), "aqz-KE-bpKQ");
check("youtu.be short link", extractYoutubeId("https://youtu.be/aqz-KE-bpKQ"), "aqz-KE-bpKQ");
check("youtu.be with timestamp", extractYoutubeId("https://youtu.be/aqz-KE-bpKQ?t=120"), "aqz-KE-bpKQ");
check("shorts URL", extractYoutubeId("https://www.youtube.com/shorts/aqz-KE-bpKQ"), "aqz-KE-bpKQ");
check("embed URL", extractYoutubeId("https://www.youtube.com/embed/aqz-KE-bpKQ"), "aqz-KE-bpKQ");
check("live URL", extractYoutubeId("https://www.youtube.com/live/aqz-KE-bpKQ"), "aqz-KE-bpKQ");
check("nocookie embed URL", extractYoutubeId("https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0"), "aqz-KE-bpKQ");
check("mobile m.youtube.com", extractYoutubeId("https://m.youtube.com/watch?v=aqz-KE-bpKQ"), "aqz-KE-bpKQ");
check("whitespace trimmed", extractYoutubeId("  aqz-KE-bpKQ  "), "aqz-KE-bpKQ");
check("empty stays empty", extractYoutubeId(""), "");
// A non-YouTube URL is passed through untouched; the server-side
// resolveVideoEmbed guard then rejects it (it contains / ? = chars), so a bad
// paste can never render as an embed.
check("non-YouTube URL passes through for server-side rejection",
  extractYoutubeId("https://vimeo.com/12345"), "https://vimeo.com/12345");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll admin-util assertions passed.");
