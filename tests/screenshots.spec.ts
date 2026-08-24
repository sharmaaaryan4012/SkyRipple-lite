import { test, type Page } from "@playwright/test";
import * as path from "path";

const MULTI_DAY_URL = "/?scenario=december-cascade&raw=1";
const OUT_DIR = "/private/tmp/claude-501/-Users-aaryan-Desktop-Projects-aviation/15b06f4d-76ea-4675-a213-e051d224566d/scratchpad/screenshots";

// The ledger grid area scrolls independently (ControlRoomShell.tsx's own
// `overflow-y-auto` column) -- a fullPage screenshot only captures the
// viewport, missing the cost graph entirely. Screenshotting the chart
// Panel directly by its own stable testid (scrollIntoViewIfNeeded first)
// captures the whole card regardless of where it sits in that column.
// (This USED to locate the panel via the view-scale-toggle's own
// ancestor -- that broke the moment the toggle relocated to the controls
// rail alongside "Simulated time", since it's no longer inside this
// card at all; `cost-chart-panel` is a stable identity that doesn't
// depend on which controls happen to live inside the card.)
async function screenshotGraphPanel(page: Page, filename: string) {
  const panel = page.getByTestId("cost-chart-panel");
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: path.join(OUT_DIR, filename) });
}

test.describe("Task 8b screenshots: day/week/month at multiple picker selections", () => {
  test("day view, two picks", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await page.getByTestId("view-scale-toggle").waitFor({ timeout: 20000 });
    await page.getByTestId("view-scale-day").click();

    await page.getByTestId("day-picker").selectOption("2025-12-15");
    await page.waitForTimeout(400);
    await screenshotGraphPanel(page, "day-dec15.png");

    await page.getByTestId("day-picker").selectOption("2025-12-22");
    await page.waitForTimeout(400);
    await screenshotGraphPanel(page, "day-dec22.png");
  });

  test("week view, two picks", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await page.getByTestId("view-scale-toggle").waitFor({ timeout: 20000 });
    await page.getByTestId("view-scale-week").click();

    await page.getByTestId("week-picker").selectOption({ label: "Dec 15 - Dec 21" });
    await page.waitForTimeout(400);
    await screenshotGraphPanel(page, "week-dec15-21.png");

    await page.getByTestId("week-picker").selectOption({ label: "Dec 22 - Dec 24" });
    await page.waitForTimeout(400);
    await screenshotGraphPanel(page, "week-dec22-24.png");
  });

  test("month view, default + cluster hover", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await page.getByTestId("view-scale-toggle").waitFor({ timeout: 20000 });
    await page.getByTestId("view-scale-month").click();
    await page.waitForTimeout(400);
    await screenshotGraphPanel(page, "month-default.png");

    // Hover the clustered Dec-15 dot (count=2) to reveal both disruptions.
    // force: true -- the pulsing SMIL <animate> ring never settles into
    // Playwright's own "stable element" check, even though the actual
    // hit-target position itself is fixed.
    const clusterDot = page.getByTestId("clustered-disruption-dot").first();
    await clusterDot.hover({ force: true });
    await page.waitForTimeout(200);
    await screenshotGraphPanel(page, "month-cluster-hover.png");
  });

  test("full-page overview (map + controls + graph scrolled into view)", async ({ page }) => {
    await page.goto(MULTI_DAY_URL);
    await page.getByTestId("view-scale-toggle").waitFor({ timeout: 20000 });
    await page.getByTestId("view-scale-week").click();
    await page.getByTestId("week-picker").selectOption({ label: "Dec 15 - Dec 21" });
    await page.waitForTimeout(400);
    await page.getByTestId("view-scale-toggle").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT_DIR, "full-overview-week.png") });
  });
});
