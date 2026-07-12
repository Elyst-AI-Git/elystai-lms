import { defineConfig, devices } from "@playwright/test";

// Personas get their auth cookie from storageState files written by
// tests/e2e/global-setup.ts. "anon" carries no storage.
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
  projects: [
    { name: "anon",     use: { ...devices["Desktop Chrome"] } },
    { name: "enrolled", use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/enrolled.json" } },
    { name: "outsider", use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/outsider.json" } },
    { name: "admin",    use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/admin.json" } },
    { name: "mobile-enrolled", use: { ...devices["iPhone 13"], storageState: "tests/e2e/.auth/enrolled.json" } },
  ],
});
