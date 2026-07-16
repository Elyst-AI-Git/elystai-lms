/**
 * Unit tests for src/lib/lms/materials.ts (secure PDF proxy path resolution).
 * Run: npx tsx scripts/test-materials.ts
 */
import { downloadFilename, isExternalLink, materialStoragePath, safePdfFilename } from "../src/lib/lms/materials";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`);
}

const BARE = "1784036170788-ai-for-work-task-day-1.pdf";
const LEGACY = `https://rvgyavnojkzleyvqowta.supabase.co/storage/v1/object/public/materials/${BARE}`;

// --- isExternalLink ---------------------------------------------------------
check("bare path is NOT external", isExternalLink(BARE), false);
check("legacy materials URL is NOT external", isExternalLink(LEGACY), false);
check("real external URL IS external", isExternalLink("https://elystai.com/x.pdf"), true);
check("pdfobject sample IS external", isExternalLink("https://pdfobject.com/pdf/sample.pdf"), true);
check("empty is not external", isExternalLink(""), false);
check("null is not external", isExternalLink(null), false);

// --- materialStoragePath ----------------------------------------------------
check("bare path passes through", materialStoragePath(BARE), BARE);
check("legacy URL -> path", materialStoragePath(LEGACY), BARE);
check("URL with query -> clean path", materialStoragePath(`${LEGACY}?token=abc`), BARE);
check("leading slash stripped", materialStoragePath(`/${BARE}`), BARE);
check("external URL -> null (not our file)", materialStoragePath("https://elystai.com/x.pdf"), null);
check("empty -> null", materialStoragePath(""), null);
// url-encoded object key round-trips
check("encoded space in key decoded", materialStoragePath("https://x.supabase.co/storage/v1/object/public/materials/a%20b.pdf"), "a b.pdf");

// --- safePdfFilename --------------------------------------------------------
check("title -> filename", safePdfFilename("Task 1-Build Your Custom Instructions"), "Task-1-Build-Your-Custom-Instructions.pdf");
check("strips unsafe chars", safePdfFilename('bad/\\:*?"<>|name'), "badname.pdf");
check("empty title -> material.pdf", safePdfFilename(""), "material.pdf");

// --- downloadFilename --------------------------------------------------------
check("uses original filename when present", downloadFilename("Day 3 workbook", "Workbook_v3_FINAL.pdf"), "Workbook_v3_FINAL.pdf");
check("adds .pdf if missing from original", downloadFilename("Day 3 workbook", "Workbook_v3_FINAL"), "Workbook_v3_FINAL.pdf");
check("falls back to title when no original filename", downloadFilename("Day 3 workbook", null), "Day-3-workbook.pdf");
check("falls back to title when original is blank", downloadFilename("Day 3 workbook", "   "), "Day-3-workbook.pdf");
check("strips header-injection chars from original", downloadFilename("t", 'evil"\r\nX-Injected: 1.pdf'), "evilX-Injected: 1.pdf");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll materials assertions passed.");
