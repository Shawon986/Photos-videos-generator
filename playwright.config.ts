import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. Requires browsers:
 *   npx playwright install chromium
 * Run:
 *   npm run dev   (in another terminal — Playwright reuses the dev server)
 *   npm run e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
