/**
 * RLS + storage probe (T10). Runs 4 personas against STAGING and prints a
 * pass/fail table. Idempotent: seeds fixed-email test users + content on
 * every run (upserts), so it can be re-run freely. NEVER point this at prod.
 *
 * Run: npx tsx scripts/probe-rls.ts
 * Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *      SUPABASE_SERVICE_ROLE_KEY (read from .env.staging.local if present).
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// --- env ---------------------------------------------------------------
try {
  for (const line of readFileSync(".env.staging.local", "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* rely on the caller's env */
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL_ || !ANON || !SERVICE) {
  console.error("Missing Supabase env (URL / anon / service role).");
  process.exit(1);
}
if (URL_.includes("rvgyavnojkzleyvqowta")) {
  console.error("Refusing to run against PROD.");
  process.exit(1);
}

const PASSWORD = "probe-rls-Passw0rd!";
const EMAILS = {
  enrolled: "probe-enrolled@test.elystai.local",
  outsider: "probe-outsider@test.elystai.local",
  admin: "probe-admin@test.elystai.local",
};

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

async function ensureUser(email: string): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created?.user) return created.user.id;
  if (error && !/already/i.test(error.message)) throw error;
  // Existing user — find id via profiles (kept in sync by the auth trigger).
  const { data } = await admin.from("profiles").select("id").eq("email", email).single();
  if (!data) throw new Error(`Cannot resolve user ${email}`);
  await admin.auth.admin.updateUserById(data.id, { password: PASSWORD });
  return data.id;
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

interface Probe {
  name: string;
  expect: "allow" | "deny";
  run: () => Promise<{ allowed: boolean; detail?: string }>;
}

const results: { name: string; expect: string; got: string; pass: boolean }[] = [];

async function runProbe(p: Probe) {
  let allowed = false;
  let detail = "";
  try {
    const r = await p.run();
    allowed = r.allowed;
    detail = r.detail ?? "";
  } catch (e) {
    allowed = false;
    detail = e instanceof Error ? e.message : String(e);
  }
  const got = allowed ? "allow" : "deny";
  const pass = got === p.expect;
  results.push({ name: p.name, expect: p.expect, got, pass });
  if (!pass && detail) console.error(`   ${p.name}: ${detail}`);
}

async function main() {
  console.log("Seeding personas + content on", URL_);

  // --- seed ---------------------------------------------------------------
  const enrolledId = await ensureUser(EMAILS.enrolled);
  const outsiderId = await ensureUser(EMAILS.outsider);
  const adminId = await ensureUser(EMAILS.admin);
  await admin.from("admin_users").upsert({ profile_id: adminId });

  const { data: course } = await admin
    .schema("app")
    .from("courses")
    .select("id, slug")
    .eq("slug", "ai-for-work")
    .single();
  if (!course) throw new Error("Course ai-for-work missing on staging");
  const { data: batch } = await admin
    .schema("app")
    .from("batches")
    .select("id")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!batch) throw new Error("No batch on staging");

  const { data: moduleRow } = await admin
    .schema("app")
    .from("modules")
    .upsert({ course_id: course.id, title: "Probe Area", position: 99 }, { onConflict: "id" })
    .select()
    .single();
  const { data: gatedLesson } = await admin
    .schema("app")
    .from("lessons")
    .insert({ module_id: moduleRow!.id, title: "Probe gated lesson", content_type: "text", unlock_day_offset: 0 })
    .select()
    .single();
  const { data: previewLesson } = await admin
    .schema("app")
    .from("lessons")
    .insert({ module_id: moduleRow!.id, title: "Probe preview lesson", content_type: "text", is_preview: true })
    .select()
    .single();

  const { data: enrollment } = await admin
    .schema("app")
    .from("enrollments")
    .upsert(
      { profile_id: enrolledId, batch_id: batch.id, status: "active" },
      { onConflict: "profile_id,batch_id" }
    )
    .select()
    .single();

  await admin.schema("app").from("resources").insert({
    course_id: course.id,
    title: "Probe resource",
    url_or_storage_path: "https://example.com",
    kind: "link",
    sort_order: 99,
  });
  const { data: submission } = await admin
    .schema("app")
    .from("submissions")
    .upsert(
      { enrollment_id: enrollment!.id, lesson_id: gatedLesson!.id, url: "https://example.com/work" },
      { onConflict: "enrollment_id,lesson_id" }
    )
    .select()
    .single();
  const screenshotPath = `${enrollment!.id}/${gatedLesson!.id}/probe.png`;
  await admin.storage
    .from("submissions")
    .upload(screenshotPath, new Blob([new Uint8Array([137, 80, 78, 71])]), { upsert: true });

  // --- personas -------------------------------------------------------------
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const enrolled = await signIn(EMAILS.enrolled);
  const outsider = await signIn(EMAILS.outsider);
  const adminUser = await signIn(EMAILS.admin);

  const probes: Probe[] = [
    {
      name: "anon reads gated lesson",
      expect: "deny",
      run: async () => {
        const { data } = await anon.schema("app").from("lessons").select("id").eq("id", gatedLesson!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "outsider (authed, not enrolled) reads gated lesson",
      expect: "deny",
      run: async () => {
        const { data } = await outsider.schema("app").from("lessons").select("id").eq("id", gatedLesson!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "outsider reads preview lesson",
      expect: "allow",
      run: async () => {
        const { data } = await outsider.schema("app").from("lessons").select("id").eq("id", previewLesson!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "enrolled learner reads gated lesson",
      expect: "allow",
      run: async () => {
        const { data } = await enrolled.schema("app").from("lessons").select("id").eq("id", gatedLesson!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "enrolled learner marks own lesson done",
      expect: "allow",
      run: async () => {
        const { error } = await enrolled
          .schema("app")
          .from("lesson_progress")
          .upsert(
            { enrollment_id: enrollment!.id, lesson_id: gatedLesson!.id },
            { onConflict: "enrollment_id,lesson_id", ignoreDuplicates: true }
          );
        return { allowed: !error, detail: error?.message };
      },
    },
    {
      name: "outsider writes progress into someone else's enrollment",
      expect: "deny",
      run: async () => {
        const { error } = await outsider
          .schema("app")
          .from("lesson_progress")
          .insert({ enrollment_id: enrollment!.id, lesson_id: previewLesson!.id });
        return { allowed: !error, detail: error?.message };
      },
    },
    {
      name: "outsider reads someone else's progress",
      expect: "deny",
      run: async () => {
        const { data } = await outsider
          .schema("app")
          .from("lesson_progress")
          .select("id")
          .eq("enrollment_id", enrollment!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "enrolled learner reads own submission",
      expect: "allow",
      run: async () => {
        const { data } = await enrolled.schema("app").from("submissions").select("id").eq("id", submission!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "outsider reads someone else's submission",
      expect: "deny",
      run: async () => {
        const { data } = await outsider.schema("app").from("submissions").select("id").eq("id", submission!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "outsider inserts submission into someone else's enrollment",
      expect: "deny",
      run: async () => {
        const { error } = await outsider
          .schema("app")
          .from("submissions")
          .insert({ enrollment_id: enrollment!.id, lesson_id: previewLesson!.id, url: "https://evil.example" });
        return { allowed: !error, detail: error?.message };
      },
    },
    {
      name: "admin persona reads all submissions",
      expect: "allow",
      run: async () => {
        const { data } = await adminUser.schema("app").from("submissions").select("id").eq("id", submission!.id);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "enrolled learner reads resources",
      expect: "allow",
      run: async () => {
        const { data } = await enrolled
          .schema("app")
          .from("resources")
          .select("id")
          .eq("course_id", course.id)
          .limit(1);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "outsider reads resources",
      expect: "deny",
      run: async () => {
        const { data } = await outsider
          .schema("app")
          .from("resources")
          .select("id")
          .eq("course_id", course.id)
          .limit(1);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "outsider reads admin_users roster",
      expect: "deny",
      run: async () => {
        const { data } = await outsider.from("admin_users").select("profile_id").neq("profile_id", outsiderId);
        return { allowed: Boolean(data?.length) };
      },
    },
    {
      name: "anon fetches storage object via public URL",
      expect: "deny",
      run: async () => {
        const res = await fetch(`${URL_}/storage/v1/object/public/submissions/${screenshotPath}`);
        return { allowed: res.ok, detail: `HTTP ${res.status}` };
      },
    },
    {
      name: "outsider downloads someone else's screenshot via storage API",
      expect: "deny",
      run: async () => {
        const { data, error } = await outsider.storage.from("submissions").download(screenshotPath);
        return { allowed: Boolean(data) && !error, detail: error?.message };
      },
    },
  ];

  for (const p of probes) await runProbe(p);

  // --- teardown of per-run rows (users/enrollment kept for re-runs) --------
  await admin.schema("app").from("lessons").delete().in("id", [gatedLesson!.id, previewLesson!.id]);
  await admin.schema("app").from("modules").delete().eq("id", moduleRow!.id);
  await admin.schema("app").from("resources").delete().eq("title", "Probe resource");
  await admin.storage.from("submissions").remove([screenshotPath]);

  // --- report ---------------------------------------------------------------
  const width = Math.max(...results.map((r) => r.name.length));
  console.log("\n" + "PROBE".padEnd(width) + "  EXPECT  GOT    RESULT");
  for (const r of results) {
    console.log(r.name.padEnd(width) + `  ${r.expect.padEnd(6)}  ${r.got.padEnd(5)}  ${r.pass ? "PASS" : "FAIL"}`);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} probes passed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
