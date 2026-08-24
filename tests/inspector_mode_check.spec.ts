import { test, expect, type Page } from "@playwright/test";

interface MapDebug {
  airportCount: number;
  airportPositions: Record<string, { lon: number; lat: number }>;
  projectAirport: (lon: number, lat: number) => [number, number] | undefined;
  focusedLegId: string | null;
  focusedAirportIata: string | null;
}

async function gotoAndWait(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.airportCount, undefined, { timeout: 20000 });
  await page.waitForTimeout(500);
}

async function screenPosForAirport(page: Page, iata: string) {
  const pos = await page.evaluate((code) => {
    const w = window as unknown as { __mapDebug: MapDebug };
    const p = w.__mapDebug.airportPositions[code];
    const screen = w.__mapDebug.projectAirport(p.lon, p.lat);
    if (!screen) return null;
    const canvas = document.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    return { x: screen[0] + (rect?.left ?? 0), y: screen[1] + (rect?.top ?? 0) };
  }, iata);
  if (!pos) throw new Error(`could not project airport ${iata}`);
  return pos;
}

test("inspector mode off by default, toggle reveals rotation/crew tabs with real data", async ({ page }) => {
  await gotoAndWait(page, "/?scenario=ord-runway-closure&raw=1");

  // Chat dock starts expanded and floats bottom-right -- collapse it
  // first so it can't obscure whichever airport we click. Wait out its
  // own 220ms collapse transition before computing/clicking a position.
  await page.getByTestId("chat-toggle").click();
  await page.waitForTimeout(350);

  const { x, y } = await screenPosForAirport(page, "ORD");
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 20 });
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction((expected) => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.focusedAirportIata === expected, "ORD", { timeout: 10000 });
  await expect(page.getByTestId("airport-detail-panel")).toBeVisible({ timeout: 10000 });

  const firstRow = page.getByTestId("airport-flights-departures").locator('[data-testid^="airport-flight-row-"]').first();
  await firstRow.click();
  await expect(page.getByTestId("flight-detail-panel")).toBeVisible({ timeout: 10000 });

  // Inspector Mode OFF by default: no tabs.
  await expect(page.getByTestId("flight-tab-rotation")).toHaveCount(0);
  await expect(page.getByTestId("flight-tab-crew")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/inspector_off.png" });

  // Flip the toggle.
  await page.getByTestId("inspector-mode-toggle").locator("button").click();
  await expect(page.getByTestId("flight-tab-rotation")).toBeVisible();
  await expect(page.getByTestId("flight-tab-crew")).toBeVisible();

  await page.getByTestId("flight-tab-rotation").click();
  await expect(page.locator('[data-testid="rotation-leg-row"]').first()).toBeVisible();
  const rotationRowCount = await page.locator('[data-testid="rotation-leg-row"]').count();
  expect(rotationRowCount).toBeGreaterThan(0);
  await page.screenshot({ path: "/tmp/inspector_rotation.png" });

  await page.getByTestId("flight-tab-crew").click();
  await page.screenshot({ path: "/tmp/inspector_crew.png" });

  // Reload -- toggle should persist (localStorage).
  await gotoAndWait(page, "/?scenario=ord-runway-closure&raw=1");
  await expect(page.getByTestId("inspector-mode-toggle").locator("button")).toHaveAttribute("aria-checked", "true");
});
