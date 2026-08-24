import { test, expect } from "@playwright/test";

/**
 * Task 8b browser/e2e verification: drives the real running app (next
 * dev + the live FastAPI backend is NOT required for these -- everything
 * here uses precomputed scenarios, no chat/live simulate calls).
 *
 * `?raw=1` skips the clean-boot transform so a scenario's REAL data
 * (real disruption markers, real multi-day coverage) renders -- see
 * app/page.tsx's own docstring for why this test-only affordance exists
 * and why it never affects default (`/`, no query params) behavior.
 */

const MULTI_DAY_URL = "/?scenario=december-cascade&raw=1";

// This scenario's real coverage is Dec 8-24 (a 17-day range chosen to keep
// export runtime tractable -- see scripts/export_frontend_scenario_range.py's
// own CLI invocation for this session; NOT the full calendar month). This
// itself exercises the coverage-constraint requirement for real: month view
// must honestly show "Dec 8 - Dec 24," never fabricate "December 2025," and
// the Dec 22-28 week option must clamp to Dec 22-24.

test.describe("checkpoint 1+2: toggle + picker scopes, coverage constraint", () => {
  test("month view is selectable and honestly shows the scenario's real (partial) coverage, not a fabricated full December", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-month").click();
    await expect(page.getByTestId("month-label")).toHaveText("Dec 8 - Dec 24");
  });

  test("day view: picking Dec 15 shows the 3-day window Dec 14-16", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-day").click();
    await page.getByTestId("day-picker").selectOption("2025-12-15");
    // The day-boundary divider labels render the actual covered dates.
    await expect(page.locator(".recharts-cartesian-axis-tick").filter({ hasText: "Dec 14" }).first()).toBeVisible();
    await expect(page.locator(".recharts-cartesian-axis-tick").filter({ hasText: "Dec 16" }).first()).toBeVisible();
  });

  test("week view: picking Dec 15-21 is offered and selectable", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-week").click();
    const picker = page.getByTestId("week-picker");
    await picker.selectOption({ label: "Dec 15 - Dec 21" });
    await expect(picker).toHaveValue("Dec 15 - Dec 21");
  });

  test("coverage constraint: the Dec 22-28 week option is offered but CLAMPED to Dec 22-24 (coverage ends there)", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-week").click();
    const picker = page.getByTestId("week-picker");
    const optionLabels = await picker.locator("option").allTextContents();
    expect(optionLabels).toContain("Dec 22 - Dec 24");
    expect(optionLabels).not.toContain("Dec 22 - Dec 28"); // the canonical (unclamped) week must never be offered as-is
    expect(optionLabels).not.toContain("Dec 1 - Dec 7"); // entirely outside coverage -- must not appear at all
  });
});

test.describe("checkpoint 3: edge dates", () => {
  test("picking Dec 8 (start of coverage) does not crash and shows an honest clamped 2-day window", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-day").click();
    await page.getByTestId("day-picker").selectOption("2025-12-08");
    await expect(page.locator(".recharts-cartesian-axis-tick").filter({ hasText: "Dec 9" }).first()).toBeVisible();
    await expect(page.locator(".recharts-responsive-container").first()).toBeVisible();
  });

  test("picking Dec 24 (end of coverage) does not crash and shows an honest clamped 2-day window", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-day").click();
    await page.getByTestId("day-picker").selectOption("2025-12-24");
    await expect(page.locator(".recharts-cartesian-axis-tick").filter({ hasText: "Dec 23" }).first()).toBeVisible();
    await expect(page.locator(".recharts-responsive-container").first()).toBeVisible();
  });
});

test.describe("checkpoint 6: disruption markers", () => {
  test("month view clusters Dec 15's two disruptions into one dot with count 2", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-month").click();
    const clusterDots = page.getByTestId("clustered-disruption-dot");
    await expect(clusterDots.first()).toBeVisible({ timeout: 10000 });
    const dataCounts = await clusterDots.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-count")));
    expect(dataCounts).toContain("2");
  });

  test("day/week view renders Dec 15's two disruptions as individual markers, not clustered", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-week").click();
    await page.getByTestId("week-picker").selectOption({ label: "Dec 15 - Dec 21" });
    await expect(page.getByTestId("clustered-disruption-dot")).toHaveCount(0);
  });
});

test.describe("checkpoint 7: cost graph + scrubber toggle together", () => {
  test("flipping to week view moves both the graph and the scrubber's own scrub range to the 7-day window", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    const scrubber = page.getByLabel("Simulated time");
    const dayMax = await scrubber.getAttribute("max");

    await page.getByTestId("view-scale-week").click();
    await page.getByTestId("week-picker").selectOption({ label: "Dec 15 - Dec 21" });
    await page.waitForTimeout(300); // state-transition settle, no assertion depends on animation completing

    const weekMin = await scrubber.getAttribute("min");
    const weekMax = await scrubber.getAttribute("max");
    expect(Number(weekMax) - Number(weekMin)).toBe(7 * 1440);
    expect(weekMax).not.toBe(dayMax);

    // Scrubbing still moves the cursor (and, transitively, the map) --
    // dragging the native range input to its midpoint should change value.
    const mid = Math.round((Number(weekMin) + Number(weekMax)) / 2);
    await scrubber.fill(String(mid));
    await expect(scrubber).toHaveValue(String(mid));
  });
});

test.describe("checkpoint 4: single-day regression", () => {
  test("default boot (no query params): the view-scale toggle IS present -- the boot data source now points at the multi-day december-cascade export so the month-long feature set is reachable without a URL param, but every figure stays honestly zeroed (clean boot, nothing injected yet)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("SkyRipple")).toBeVisible();
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Normal day operations").first()).toBeVisible();
    await expect(page.getByText("$0").first()).toBeVisible();
  });

  test("a real single-day precomputed scenario (ord-runway-closure, raw): toggle still absent", async ({ page }) => {
    await page.goto("/?scenario=ord-runway-closure&raw=1");
    await expect(page.getByText("ORD runway closure").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("view-scale-toggle")).toHaveCount(0);
    // The chart and scrubber still render their normal single-day content.
    await expect(page.locator(".recharts-responsive-container").first()).toBeVisible();
  });
});
