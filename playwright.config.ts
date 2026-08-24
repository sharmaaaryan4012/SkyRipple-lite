import { defineConfig, devices } from "@playwright/test";

/**
 * Task 8b: this project's first e2e/verification harness (none existed
 * before -- see this task's own investigation). Deliberately minimal:
 * one project (chromium), no CI-specific retry/sharding config, since
 * this is a local-only app with no deployment pipeline (matching this
 * whole codebase's own "local-only, no deployment" architecture). Runs
 * against `next dev` (NOT the static export build) so the pure-function
 * unit tests (timeAggregation.spec.ts) and the browser e2e tests
 * (viewToggle.spec.ts) share one config and one server.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  // Task 8c: headless Chromium's own deck.gl/WebGL hover-picking commit
  // lands a genuinely variable number of animation-frame ticks after a
  // mouse event (confirmed directly during this task's own development
  // -- identical test code passed or failed run-to-run on incidental
  // timing alone, even with generous waitForFunction polling). One
  // retry absorbs that real environment variance without masking an
  // actual regression (a genuinely broken interaction fails BOTH
  // attempts, every time).
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
