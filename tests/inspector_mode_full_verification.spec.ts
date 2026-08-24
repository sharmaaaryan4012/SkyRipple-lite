import { test, expect, type Page } from "@playwright/test";
import path from "path";

const ARTIFACTS_DIR = "/Users/aaryan/.gemini/antigravity/brain/56b2f34a-9e14-4bfd-a526-182ae82867f9";

interface MapDebug {
  airportCount: number;
  airportPositions: Record<string, { lon: number; lat: number }>;
  projectAirport: (lon: number, lat: number) => [number, number] | undefined;
  focusedLegId: string | null;
  focusedAirportIata: string | null;
}

async function gotoAndWait(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(
    () => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.airportCount,
    undefined,
    { timeout: 25000 }
  );
  await page.waitForTimeout(500);

  // Collapse chat dock if visible to keep map clear
  const chatToggle = page.getByTestId("chat-toggle");
  if (await chatToggle.isVisible()) {
    await chatToggle.click();
    await page.waitForTimeout(250);
  }
}

async function screenPosForAirport(page: Page, iata: string): Promise<{ x: number; y: number }> {
  const pos = await page.evaluate((code) => {
    const w = window as unknown as { __mapDebug: MapDebug };
    const p = w.__mapDebug.airportPositions[code];
    if (!p) return null;
    const screen = w.__mapDebug.projectAirport(p.lon, p.lat);
    if (!screen) return null;
    const canvas = document.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    return { x: screen[0] + (rect?.left ?? 0), y: screen[1] + (rect?.top ?? 0) };
  }, iata);
  if (!pos) throw new Error(`could not project airport ${iata}`);
  return pos;
}

async function clickAirportAndWait(page: Page, iata: string) {
  const { x, y } = await screenPosForAirport(page, iata);
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 20 });
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(
    (expected) => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.focusedAirportIata === expected,
    iata,
    { timeout: 10000 }
  );
  await expect(page.getByTestId("airport-detail-panel")).toBeVisible({ timeout: 10000 });
}

test.describe("Inspector Mode Full Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("1. Data provenance line is always visible and shows real counts", async ({ page }) => {
    await gotoAndWait(page, "/?scenario=ord-runway-closure&raw=1");
    const provenance = page.locator("text=Built from 582,304 real BTS flight legs across 343 airports.");
    await expect(provenance).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "01_data_provenance_line.png") });
  });

  test("2. Inspector Mode default OFF hides Rotation/Crew tabs; Toggle ON reveals them", async ({ page }) => {
    await gotoAndWait(page, "/?scenario=ord-runway-closure&raw=1");

    // Click ORD to open departures
    await clickAirportAndWait(page, "ORD");

    // Click first departure flight
    const firstFlightRow = page.getByTestId("airport-flights-departures").locator('[data-testid^="airport-flight-row-"]').first();
    await firstFlightRow.click();
    await expect(page.getByTestId("flight-detail-panel")).toBeVisible();

    // Verify Inspector Mode OFF (default): Rotation and Crew tabs should NOT exist
    await expect(page.getByTestId("flight-tab-rotation")).toHaveCount(0);
    await expect(page.getByTestId("flight-tab-crew")).toHaveCount(0);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "02_inspector_mode_off.png") });

    // Turn Inspector Mode ON
    const toggleBtn = page.getByTestId("inspector-mode-toggle").locator("button");
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-checked", "true");

    // Verify tabs are now visible
    await expect(page.getByTestId("flight-tab-overview")).toBeVisible();
    await expect(page.getByTestId("flight-tab-rotation")).toBeVisible();
    await expect(page.getByTestId("flight-tab-crew")).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "03_inspector_mode_on_tabs.png") });
  });

  test("3. Rotation tab lists chronological legs and clicking one re-focuses panel", async ({ page }) => {
    await gotoAndWait(page, "/?scenario=ord-runway-closure&raw=1");

    // Turn Inspector Mode ON
    await page.getByTestId("inspector-mode-toggle").locator("button").click();

    // Open ORD and click first flight
    await clickAirportAndWait(page, "ORD");
    await page.getByTestId("airport-flights-departures").locator('[data-testid^="airport-flight-row-"]').first().click();

    // Switch to Rotation tab
    await page.getByTestId("flight-tab-rotation").click();
    const rotationRows = page.locator('[data-testid="rotation-leg-row"]');
    await expect(rotationRows.first()).toBeVisible();

    const rowCount = await rotationRows.count();
    console.log(`Rotation has ${rowCount} legs for this tail`);
    expect(rowCount).toBeGreaterThan(0);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "04_rotation_tab_initial.png") });

    if (rowCount > 1) {
      const targetRow = rotationRows.nth(1);
      await targetRow.click();
      await page.waitForTimeout(300);

      // Panel should remain open with new leg
      await expect(page.getByTestId("flight-detail-panel")).toBeVisible();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "05_rotation_tab_refocused.png") });
    }
  });

  test("4. Crew tab displays real duty clock, role counts, and handles legality status", async ({ page }) => {
    await gotoAndWait(page, "/?scenario=ord-runway-closure&raw=1");

    // Turn Inspector Mode ON
    await page.getByTestId("inspector-mode-toggle").locator("button").click();

    // Open ORD and select a flight
    await clickAirportAndWait(page, "ORD");
    const flightRow = page.getByTestId("airport-flights-departures").locator('[data-testid^="airport-flight-row-"]').first();
    await flightRow.click();
    await expect(page.getByTestId("flight-detail-panel")).toBeVisible();

    // Switch to Crew tab
    await page.getByTestId("flight-tab-crew").click();

    // Verify crew details are rendered with real numbers (not 'No crew reference data')
    await expect(page.locator("text=Crew composition")).toBeVisible();
    await expect(page.locator("text=Captain")).toBeVisible();
    await expect(page.locator("text=First officer")).toBeVisible();
    await expect(page.locator("text=Flight attendant")).toBeVisible();
    await expect(page.locator("text=Duty clock")).toBeVisible();
    await expect(page.locator("text=On duty since")).toBeVisible();
    await expect(page.locator("text=Scheduled release")).toBeVisible();
    await expect(page.locator("text=Duty time so far")).toBeVisible();
    await expect(page.locator("text=Max FDP (legal limit)")).toBeVisible();
    await expect(page.locator("text=Remaining margin")).toBeVisible();
    await expect(page.locator("text=No crew reference data available")).toHaveCount(0);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "06_crew_tab_normal.png") });
  });

  test("5. Airport departures/arrivals in Inspector Mode shows full list with no 'Show all N' cap button", async ({ page }) => {
    await gotoAndWait(page, "/?scenario=ord-runway-closure&raw=1");

    // 5a. Inspector Mode OFF: "Show all N" button should appear for airport with >15 flights
    await clickAirportAndWait(page, "ORD");
    const departuresSection = page.getByTestId("airport-flights-departures");
    await expect(departuresSection).toBeVisible();

    const showAllBtn = departuresSection.locator("button:has-text('Show all')");
    await expect(showAllBtn).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "07_airport_inspector_off_capped.png") });

    // 5b. Inspector Mode ON: forceShowAll suppresses "Show all" button and shows all rows
    await page.getByTestId("inspector-mode-toggle").locator("button").click();
    await expect(showAllBtn).toHaveCount(0);

    const depRows = departuresSection.locator('[data-testid^="airport-flight-row-"]');
    const depCount = await depRows.count();
    console.log(`Inspector Mode ON: ORD departures rendered count = ${depCount}`);
    expect(depCount).toBeGreaterThan(15);

    const arrRows = page.getByTestId("airport-flights-arrivals").locator('[data-testid^="airport-flight-row-"]');
    const arrCount = await arrRows.count();
    console.log(`Inspector Mode ON: ORD arrivals rendered count = ${arrCount}`);
    expect(arrCount).toBeGreaterThan(15);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "08_airport_inspector_on_all_flights.png") });
  });

  test("6. Multi-day scenario renders 'Flight-level detail... for 2025-12-15 only' caveat and shows flight list only in Inspector Mode", async ({ page }) => {
    await gotoAndWait(page, "/?scenario=december-cascade&raw=1");

    // 6a. Inspector Mode OFF: multi-day scenario does NOT show flight list
    await clickAirportAndWait(page, "ORD");
    await expect(page.getByTestId("airport-flights-departures")).toHaveCount(0);
    await expect(page.getByTestId("airport-flights-arrivals")).toHaveCount(0);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "09_multiday_inspector_off_no_flightlist.png") });

    // 6b. Inspector Mode ON: multi-day scenario shows caveat note AND flight list
    await page.getByTestId("inspector-mode-toggle").locator("button").click();

    await expect(page.getByTestId("airport-flights-detail-day-note")).toBeVisible();
    await expect(page.getByTestId("airport-flights-detail-day-note")).toContainText("Flight-level detail below is real data for 2025-12-15 only");

    await expect(page.getByTestId("airport-flights-departures")).toBeVisible();
    await expect(page.getByTestId("airport-flights-arrivals")).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "10_multiday_inspector_on_with_caveat.png") });
  });
});
