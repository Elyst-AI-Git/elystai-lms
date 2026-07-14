import { test, expect } from "@playwright/test";

/**
 * Admin-console E2E suite. Covers every flow a course admin can take —
 * including the unlikely ones (bad pastes, dialog cancels, empty days,
 * schedule shifts) — against a dev server + TEST Supabase.
 *
 * Hygiene rules:
 * - Setup/teardown of scratch data goes through the admin API (fast, exact);
 *   the UI behaviour under test is exercised through the UI.
 * - Every mutation is reverted; the suite leaves the TEST DB as it found it.
 * - Mutating blocks run serially; read-only checks run parallel.
 */

const ADMIN_STATE = "tests/e2e/.auth/admin.json";
const ENROLLED_STATE = "tests/e2e/.auth/enrolled.json";
const SLUG = "ai-for-work";
// Unique per run so leftovers from an interrupted run can never collide with
// locators in the next one.
const RUN = Date.now().toString(36);
const AREA = `E2E Scratch Area ${RUN}`;
const LESSON = `E2E Scratch Lesson ${RUN}`;
const PDF = `E2E Scratch PDF ${RUN}`;

// ---------------------------------------------------------------------------
// 1. Access control: exactly one persona sees the console
// ---------------------------------------------------------------------------
test.describe("access", () => {
  for (const [persona, state] of [
    ["anon", undefined],
    ["enrolled", ENROLLED_STATE],
    ["outsider", "tests/e2e/.auth/outsider.json"],
  ] as const) {
    test(`${persona} gets 404 on /admin (no admin surface leak)`, async ({ browser }) => {
      const ctx = await browser.newContext(state ? { storageState: state } : {});
      const page = await ctx.newPage();
      const resp = await page.goto("/admin", { waitUntil: "domcontentloaded" });
      expect(resp?.status()).toBe(404);
      await ctx.close();
    });
  }

  test("admin lands on /admin/content with the restyled sidebar", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/content$/);
    const nav = page.getByLabel("Admin workspace");
    for (const item of ["Content", "Resources", "Schedule", "Progress"]) {
      await expect(nav.getByRole("link", { name: item })).toBeVisible();
    }
    // Submissions must NOT be in the nav (dormant surface)
    await expect(nav.getByRole("link", { name: "Submissions" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "View as learner" })).toBeVisible();
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// 2. Everything below runs as admin
// ---------------------------------------------------------------------------
test.describe("admin console", () => {
  test.use({ storageState: ADMIN_STATE });

  test("content tree lists course, areas, and day-numbered lessons", async ({ page }) => {
    await page.goto("/admin/content");
    const courseLink = page.locator('a[href^="/admin/content/"]').filter({ hasText: "AI for Work" }).first();
    await courseLink.click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("AI for Work");
    await expect(page.getByText(/Day \d+/).first()).toBeVisible();
    await expect(page.getByText("Area 1", { exact: false }).first()).toBeVisible();
  });

  test("lesson editor keeps EVERY setting reachable (nothing lost in the redesign)", async ({ page }) => {
    await page.goto("/admin/content");
    await page.locator('a[href^="/admin/content/"]').filter({ hasText: "AI for Work" }).first().click();
    await page.locator('a[href^="/admin/content/lesson/"]').first().click();
    // Primary fields
    await expect(page.getByLabel(/^Title/)).toBeVisible();
    await expect(page.getByLabel(/Day \(1 = launch day\)/)).toBeVisible();
    await expect(page.getByLabel(/YouTube link or video ID/)).toBeVisible();
    await expect(page.getByText("Body (markdown)")).toBeVisible();
    // Everything else lives under More options — open and verify each control
    await page.getByText("More options").click();
    await expect(page.getByLabel(/^Type/)).toBeVisible();
    await expect(page.getByLabel(/Duration \(seconds\)/)).toBeVisible();
    await expect(page.getByLabel(/Free preview/)).toBeVisible();
    await expect(page.getByLabel(/Task instructions/)).toBeVisible();
    // Bunny is fully removed from the app - the field must NOT exist anymore.
    await expect(page.getByLabel(/Bunny video ID/)).toHaveCount(0);
    await expect(page.getByLabel(/Live class link/)).toBeVisible();
    await expect(page.getByLabel(/Live class time/)).toBeVisible();
  });

  test("markdown preview toggles without losing the draft", async ({ page }) => {
    await page.goto("/admin/content");
    await page.locator('a[href^="/admin/content/"]').filter({ hasText: "AI for Work" }).first().click();
    await page.locator('a[href^="/admin/content/lesson/"]').first().click();
    const body = page.locator("textarea").first();
    const original = await body.inputValue();
    await body.fill(`${original}\n\n**e2e preview check**`);
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByText("e2e preview check")).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("textarea").first()).toHaveValue(new RegExp("e2e preview check"));
    // draft not saved — navigate away, nothing persisted (no Save clicked)
  });

  // --- full scratch lifecycle: area -> lesson -> edit -> learner view -> cleanup
  test.describe.serial("scratch lifecycle", () => {
    let courseId: string;
    let lessonId: string;

    test.afterAll(async () => {
      // Hard cleanup even if a mid-block test failed: scratch rows must never
      // survive to pollute the learner UI. TEST project only.
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key || !/cmihoglafjxtswtbitsz/.test(url)) return;
      const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Profile": "app" };
      for (const table of ["resources", "lessons", "modules"]) {
        await fetch(`${url}/rest/v1/${table}?title=like.E2E%20Scratch%25`, { method: "DELETE", headers }).catch(() => {});
      }
    });

    test("create a scratch Area via the UI inline form", async ({ page }) => {
      await page.goto("/admin/content");
      const href = await page
        .locator('a[href^="/admin/content/"]')
        .filter({ hasText: "AI for Work" })
        .first()
        .getAttribute("href");
      courseId = href!.split("/").pop()!;
      await page.goto(`/admin/content/${courseId}`);
      await page.getByPlaceholder("Module title").fill(AREA);
      await page.getByPlaceholder("Module title").locator("..").getByRole("button", { name: "Add" }).click();
      await expect(page.getByRole("heading", { name: AREA })).toBeVisible();
    });

    test("create a lesson in it, then edit day + youtube via full URL paste", async ({ page }) => {
      await page.goto(`/admin/content/${courseId}`);
      const area = page.locator("section").filter({ hasText: AREA });
      await area.getByPlaceholder("New lesson title").fill(LESSON);
      await area.getByRole("button", { name: "Add" }).click();
      await expect(area.getByText(LESSON)).toBeVisible();

      await area.getByRole("link", { name: new RegExp(LESSON) }).click();
      await expect(page).toHaveURL(/\/admin\/content\/lesson\//);
      lessonId = page.url().split("/").pop()!;

      // Paste a FULL YouTube URL — the editor must extract the bare id
      await page.getByLabel(/YouTube link or video ID/).fill("https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=10s");
      // Day 14 keeps this scratch lesson OUT of the learner's "next lesson"
      // slot, so the parallel progress-integrity block can never race a
      // deletion of the lesson it is about to mark done.
      await page.getByLabel(/Day \(1 = launch day\)/).fill("14");
      // make it a preview so drip cannot hide it from the learner check below
      await page.getByText("More options").click();
      await page.getByLabel(/Free preview/).check();
      await page.getByRole("button", { name: "Save lesson" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();

      // Reload: the stored value is the extracted bare id, not the URL
      await page.reload();
      await expect(page.getByLabel(/YouTube link or video ID/)).toHaveValue("aqz-KE-bpKQ");
      await expect(page.getByLabel(/Day \(1 = launch day\)/)).toHaveValue("14");
    });

    test("learner sees the scratch lesson video embed (youtube-nocookie, modest chrome)", async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: ENROLLED_STATE });
      const page = await ctx.newPage();
      await page.goto(`/learn/${SLUG}/lesson/${lessonId}`);
      const iframe = page.locator("iframe");
      await expect(iframe).toBeVisible();
      const src = (await iframe.getAttribute("src")) ?? "";
      expect(src).toContain("youtube-nocookie.com/embed/aqz-KE-bpKQ");
      expect(src).toContain("modestbranding=1");
      await ctx.close();
    });

    test("clearing the video shows 'being prepared' — never a broken embed (content-pending UX)", async ({ page, browser }) => {
      await page.goto(`/admin/content/lesson/${lessonId}`);
      await page.getByLabel(/YouTube link or video ID/).fill("");
      await page.getByRole("button", { name: "Save lesson" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();

      const ctx = await browser.newContext({ storageState: ENROLLED_STATE });
      const learner = await ctx.newPage();
      await learner.goto(`/learn/${SLUG}/lesson/${lessonId}`);
      await expect(learner.getByText("Today's video is being prepared.")).toBeVisible();
      await expect(learner.getByText(/it will appear right here later today/)).toBeVisible();
      // no materials attached either → the materials-pending message shows
      await expect(learner.getByText("Today's materials are on their way.")).toBeVisible();
      await expect(learner.locator("iframe")).toHaveCount(0);
      await ctx.close();
    });

    test("a junk paste (vimeo URL) can never render as an embed", async ({ page, browser }) => {
      await page.goto(`/admin/content/lesson/${lessonId}`);
      await page.getByLabel(/YouTube link or video ID/).fill("https://vimeo.com/12345");
      await page.getByRole("button", { name: "Save lesson" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();

      const ctx = await browser.newContext({ storageState: ENROLLED_STATE });
      const learner = await ctx.newPage();
      await learner.goto(`/learn/${SLUG}/lesson/${lessonId}`);
      await expect(learner.getByText("Today's video is being prepared.")).toBeVisible();
      await expect(learner.locator("iframe")).toHaveCount(0);
      await ctx.close();
    });

    test("attach a PDF resource to the scratch lesson; learner sees it under Materials", async ({ page, browser }) => {
      await page.goto("/admin/content/resources");
      const section = page.locator("section").filter({ hasText: "AI for Work" }).first();
      await section.getByText("+ Add a resource").click();
      await section.getByRole("textbox", { name: "Title", exact: true }).fill(PDF);
      await section.getByLabel(/or paste a link instead/).fill("https://pdfobject.com/pdf/sample.pdf");
      await section.getByLabel(/Day it belongs to/).selectOption({ label: LESSON });
      await section.getByRole("button", { name: "Add resource" }).click();
      await expect(section.getByText(PDF)).toBeVisible();

      const ctx = await browser.newContext({ storageState: ENROLLED_STATE });
      const learner = await ctx.newPage();
      await learner.goto(`/learn/${SLUG}/lesson/${lessonId}`);
      await expect(learner.getByText(PDF)).toBeVisible();
      // pending-materials message must be gone now that a real PDF exists
      await expect(learner.getByText("Today's materials are on their way.")).toHaveCount(0);
      await ctx.close();
    });

    test("rename via prompt dialog + cancel-delete leaves data intact", async ({ page }) => {
      await page.goto(`/admin/content/${courseId}`);
      const area = page.locator("section").filter({ hasText: AREA });
      const row = area.locator("li").filter({ hasText: LESSON });
      // rename
      page.once("dialog", (d) => d.accept(`${LESSON} v2`));
      await row.getByRole("button", { name: "Rename" }).click();
      await expect(area.getByText(`${LESSON} v2`)).toBeVisible();
      // delete but CANCEL the confirm — the lesson must survive
      page.once("dialog", (d) => d.dismiss());
      await area.locator("li").filter({ hasText: `${LESSON} v2` }).getByRole("button", { name: "Delete" }).click();
      await page.reload();
      await expect(page.getByText(`${LESSON} v2`)).toBeVisible();
    });

    test("cleanup: delete resource, lesson, and area (confirm accepted)", async ({ page }) => {
      // resource
      await page.goto("/admin/content/resources");
      const section = page.locator("section").filter({ hasText: "AI for Work" }).first();
      const resRow = section.locator("li").filter({ hasText: PDF });
      page.once("dialog", (d) => d.accept());
      await resRow.getByRole("button", { name: "Delete" }).click();
      await expect(section.getByText(PDF)).toHaveCount(0);
      // lesson
      await page.goto(`/admin/content/${courseId}`);
      const area = page.locator("section").filter({ hasText: AREA });
      page.once("dialog", (d) => d.accept());
      await area.locator("li").filter({ hasText: `${LESSON} v2` }).getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText(`${LESSON} v2`)).toHaveCount(0);
      // area
      page.once("dialog", (d) => d.accept());
      await area.getByRole("button", { name: "Delete" }).first().click();
      await expect(page.getByRole("heading", { name: AREA })).toHaveCount(0);
    });
  });

  // --- schedule: the launch-date lever -------------------------------------
  test.describe.serial("schedule", () => {
    test("shift starts_on, verify persistence, then restore exactly", async ({ page }) => {
      await page.goto("/admin/schedule");
      await expect(page.getByText(/4:00 AM IST/).first()).toBeVisible();
      const input = page.locator('input[type="date"]').first();
      const original = await input.inputValue();
      expect(original).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      await input.fill("2026-01-01");
      await page.getByRole("button", { name: "Save date" }).first().click();
      await expect(page.getByText("Saved.").first()).toBeVisible();
      await page.reload();
      await expect(page.locator('input[type="date"]').first()).toHaveValue("2026-01-01");

      // restore
      await page.locator('input[type="date"]').first().fill(original);
      await page.getByRole("button", { name: "Save date" }).first().click();
      await expect(page.getByText("Saved.").first()).toBeVisible();
      await page.reload();
      await expect(page.locator('input[type="date"]').first()).toHaveValue(original);
    });

    test("save button disabled until the date actually changes (no accidental writes)", async ({ page }) => {
      await page.goto("/admin/schedule");
      await expect(page.getByRole("button", { name: "Save date" }).first()).toBeDisabled();
    });
  });

  // --- progress: numbers must reflect reality -------------------------------
  test.describe.serial("progress integrity", () => {
    test("marking a lesson done as a learner moves the admin progress table, and un-marking moves it back", async ({ page, browser }) => {
      test.setTimeout(120_000);
      // read current completed count for the probe learner
      await page.goto("/admin/progress");
      const row = page.locator("tr").filter({ hasText: "probe-enrolled" });
      await expect(row).toBeVisible();
      const before = (await row.textContent()) ?? "";
      const match = /\((\d+)\/(\d+)\)/.exec(before);
      expect(match).not.toBeNull();
      const completedBefore = Number(match![1]);

      // learner marks the next lesson done
      const ctx = await browser.newContext({ storageState: ENROLLED_STATE });
      const learner = await ctx.newPage();
      await learner.goto("/learn");
      await learner.getByRole("link", { name: /start this lesson|continue/i }).first().click();
      await expect(learner).toHaveURL(/\/lesson\//);
      const lessonUrl = learner.url();
      // Normalise: a prior interrupted run may have left this lesson completed.
      const targetLessonId = lessonUrl.split("/").pop()!;
      await learner.request.post("/api/learn/progress", { data: { lessonId: targetLessonId, completed: false } });
      await learner.reload();
      // re-read the admin baseline AFTER normalising
      await page.reload();
      const normalised = (await page.locator("tr").filter({ hasText: "probe-enrolled" }).textContent()) ?? "";
      const normMatch = /\((\d+)\/(\d+)\)/.exec(normalised);
      const baseline = Number(normMatch![1]);
      const done = learner.waitForResponse((r) => r.url().includes("/api/learn/progress"));
      await learner.getByRole("button", { name: /^mark as complete$/i }).click();
      expect((await done).status()).toBe(200);

      // admin sees +1
      await page.reload();
      await expect(page.locator("tr").filter({ hasText: "probe-enrolled" })).toContainText(`(${baseline + 1}/`);

      // learner un-marks; admin sees the original count again
      await learner.goto(lessonUrl);
      const undo = learner.waitForResponse((r) => r.url().includes("/api/learn/progress"));
      await learner.getByRole("button", { name: /^completed$/i }).click();
      expect((await undo).status()).toBe(200);
      await ctx.close();

      await page.reload();
      await expect(page.locator("tr").filter({ hasText: "probe-enrolled" })).toContainText(`(${baseline}/`);
    });

    test("per-learner detail page opens from the table", async ({ page }) => {
      await page.goto("/admin/progress");
      await page.locator("tr").filter({ hasText: "probe-enrolled" }).getByRole("link", { name: /detail/i }).click();
      await expect(page).toHaveURL(/\/admin\/progress\//);
      await expect(page.getByText(/Day \d+/).first()).toBeVisible();
    });
  });

  // --- API hardening: admin routes reject non-admin writes ------------------
  test("batches PATCH without admin session is 403", async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ storageState: ENROLLED_STATE });
    const r = await ctx.request.patch(`${baseURL}/api/admin/content/batches`, {
      data: { id: "00000000-0000-0000-0000-000000000000", starts_on: "2020-01-01" },
    });
    expect(r.status()).toBe(403);
    await ctx.close();
  });

});

// Top level on purpose: inside the admin describe the request would inherit the
// admin storageState and stop being anonymous.
test("resources POST anonymously is 403", async ({ request }) => {
  const r = await request.post("/api/admin/content/resources", { data: { title: "hax" } });
  expect(r.status()).toBe(403);
});

// Top level: the built-in `request` fixture here carries no auth cookie, so this
// is the real Postman/unauthenticated case for the secure PDF proxy.
test("materials proxy blocks unauthenticated requests (Postman case)", async ({ request }) => {
  const r = await request.get("/api/learn/materials/00000000-0000-0000-0000-000000000000");
  expect(r.status()).toBe(401);
});

test("PDF upload anonymously is 403", async ({ request }) => {
  const r = await request.post("/api/admin/content/upload", {
    multipart: { file: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") } },
  });
  expect(r.status()).toBe(403);
});

// ---------------------------------------------------------------------------
// Guide + PDF upload (admin persona)
// ---------------------------------------------------------------------------
test.describe("guide and uploads", () => {
  test.use({ storageState: ADMIN_STATE });

  test("Guide is in the nav and answers the everyday questions", async ({ page }) => {
    await page.goto("/admin/guide");
    await expect(page.getByRole("heading", { name: "Guide", level: 1 })).toBeVisible();
    await expect(page.getByText("Put up today's video")).toBeVisible();
    await expect(page.getByText("Add the day's PDF")).toBeVisible();
    await expect(page.getByText(/4:00 AM IST/).first()).toBeVisible();
    await expect(page.getByText("Running late with content? Relax.")).toBeVisible();
    // reachable from the sidebar too
    await expect(page.getByLabel("Admin workspace").getByRole("link", { name: "Guide" })).toBeVisible();
  });

  test("upload a local PDF end-to-end: stored as a private path, never a public URL", async ({ page }) => {
    const title = `E2E Upload PDF ${RUN}`;
    await page.goto("/admin/content/resources");
    const section = page.locator("section").filter({ hasText: "AI for Work" }).first();
    await section.getByText("+ Add a resource").click();
    await section.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await section.getByLabel(/Upload a PDF from your computer/).setInputFiles({
      name: "e2e-material.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% e2e scratch material ${RUN}\n%%EOF`),
    });
    await section.getByRole("button", { name: "Add resource" }).click();

    const row = section.locator("li").filter({ hasText: title });
    await expect(row).toBeVisible();
    // Stored files must NOT be exposed as a clickable public URL in the admin
    // list - they are a private path served only through the auth-gated proxy.
    await expect(row.getByText(/^PDF ·/)).toBeVisible();
    await expect(row.getByRole("link", { name: title })).toHaveCount(0);
    // No supabase public-storage URL anywhere on the page.
    expect(await page.content()).not.toContain("/storage/v1/object/public/materials/");

    // cleanup
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(section.getByText(title)).toHaveCount(0);
  });

  test("form refuses to submit with neither a file nor a link", async ({ page }) => {
    await page.goto("/admin/content/resources");
    const section = page.locator("section").filter({ hasText: "AI for Work" }).first();
    await section.getByText("+ Add a resource").click();
    await section.getByRole("textbox", { name: "Title", exact: true }).fill("no source");
    await section.getByRole("button", { name: "Add resource" }).click();
    await expect(section.getByText(/one of the two is required/)).toBeVisible();
  });
});
