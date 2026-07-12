import { defineConfig, devices } from "@playwright/test";

// SINGLE project on purpose. Each test owns its own persona: the access-matrix
// tests create their own browser context with the right storageState, and the
// journey describe-blocks call test.use({ storageState }). Running the spec
// under multiple persona "projects" would execute every test once per project,
// multiplying runtime and producing false failures (e.g. an anon project
// hitting an enrolled route and landing on /login). Personas live in the tests,
// not the config.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "tests/e2e/report.json" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
