/**
 * Unit tests for submission-image validation (src/lib/lms/storage.ts).
 * Only the pure validator is exercised here — upload/signed-URL helpers hit
 * Supabase and are covered by the RLS/e2e probes. Run: npx tsx scripts/test-storage.ts
 */
import { validateSubmissionImage } from "../src/lib/lms/storage";
import { MAX_SUBMISSION_BYTES } from "../src/lib/lms/constants";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`);
}

/** Build a File of a given byte size and MIME type without heavy allocation where possible. */
function fakeFile(bytes: number, type: string): File {
  return new File([new Uint8Array(bytes)], "shot", { type });
}

// --- accepted types, within size -------------------------------------------
for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
  check(`accepts ${type} at 1KB`, validateSubmissionImage(fakeFile(1024, type)), null);
}

// --- rejected types --------------------------------------------------------
check("rejects application/pdf", validateSubmissionImage(fakeFile(1024, "application/pdf")), "Only JPEG, PNG, WebP or GIF images are accepted.");
check("rejects image/svg+xml (XSS vector)", validateSubmissionImage(fakeFile(1024, "image/svg+xml")), "Only JPEG, PNG, WebP or GIF images are accepted.");
check("rejects empty type", validateSubmissionImage(fakeFile(1024, "")), "Only JPEG, PNG, WebP or GIF images are accepted.");

// --- size boundary ---------------------------------------------------------
check("accepts file exactly at the 5MB limit", validateSubmissionImage(fakeFile(MAX_SUBMISSION_BYTES, "image/png")), null);
check("rejects file one byte over the limit", validateSubmissionImage(fakeFile(MAX_SUBMISSION_BYTES + 1, "image/png")), "Image must be 5 MB or smaller.");

// --- type is checked before size (wrong-type oversize → type error) --------
check("wrong-type AND oversize → reports type first", validateSubmissionImage(fakeFile(MAX_SUBMISSION_BYTES + 1, "application/pdf")), "Only JPEG, PNG, WebP or GIF images are accepted.");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll storage-validation assertions passed.");
