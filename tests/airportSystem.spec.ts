import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const OUT_DIR = "/private/tmp/claude-501/-Users-aaryan-Desktop-Projects-aviation/15b06f4d-76ea-4675-a213-e051d224566d/scratchpad/screenshots";
const SINGLE_DAY_URL = "/?scenario=ord-runway-closure&raw=1";
const MULTI_DAY_URL = "/?scenario=december-cascade&raw=1";

interface MapDebug {
  airportCount: number;
  affectedAirportIatas: string[];
  hoveredAirportIata: string | null;
  focusedAirportIata: string | null;
  airportStatsByIata: Record<string, { costUsd: { low: number; typical: number; high: number }; delayMin: number; cancelled: number; flightsDelayedDeparting: number; flightsScheduledDeparting: number; flightsDelayedArriving: number; flightsScheduledArriving: number; passengersAffected: number }>;
  airportPositions: Record<string, { lon: number; lat: number }>;
  hoveredLegId: string | null;
  focusedLegId: string | null;
  inAirLegIds: string[];
}

async function getDebug(page: Page): Promise<MapDebug> {
  return page.evaluate(() => (window as unknown as { __mapDebug: MapDebug }).__mapDebug);
}

/** Converts an airport's lon/lat to a PAGE-relative screen pixel via
 * the SAME live deck.gl viewport projection the map itself uses
 * (window.__mapDebug's own projectAirport, exposed by USMap.tsx) --
 * never a hand-rolled Mercator approximation that could drift from the
 * real render. deck.gl's project() returns CANVAS-relative coordinates
 * (0,0 at the canvas's own top-left); the map panel sits offset within
 * the page layout (the controls rail to its left), so Playwright's
 * page-relative mouse actions need the canvas element's own bounding-
 * box offset added on top -- caught by this test suite's own first
 * attempt landing every hover/click at (0,0)-relative-wrong positions. */
async function screenPosForAirport(page: Page, iata: string): Promise<{ x: number; y: number }> {
  const pos = await page.evaluate((code) => {
    const w = window as unknown as { __mapDebug: MapDebug & { projectAirport: (lon: number, lat: number) => [number, number] | undefined } };
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

/** Picks an unaffected airport whose PROJECTED position genuinely falls
 * on the visible canvas -- a plain "first key not in affectedAirportIatas"
 * pick can land on an airport the current pan/zoom projects OFF-canvas
 * (e.g. ABE at this app's default view state projects to canvas x=649
 * against a ~589px-wide canvas), which silently times out waiting for a
 * hover/click that can never land. Same "verify the real projected
 * position, don't assume" discipline as this suite's own panel-overlay-
 * aware plane selection in checkpoint 7. */
async function findOnCanvasUnaffectedAirport(page: Page): Promise<string> {
  const iata = await page.evaluate(() => {
    const w = window as unknown as { __mapDebug: MapDebug & { projectAirport: (lon: number, lat: number) => [number, number] | undefined } };
    const canvas = document.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return null;
    for (const code of Object.keys(w.__mapDebug.airportPositions)) {
      if (w.__mapDebug.affectedAirportIatas.includes(code)) continue;
      const p = w.__mapDebug.airportPositions[code];
      const screen = w.__mapDebug.projectAirport(p.lon, p.lat);
      if (!screen) continue;
      if (screen[0] > 20 && screen[0] < rect.width - 20 && screen[1] > 20 && screen[1] < rect.height - 20) return code;
    }
    return null;
  });
  if (!iata) throw new Error("no unaffected airport projects onto the visible canvas");
  return iata;
}

async function gotoAndWait(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.airportCount, undefined, { timeout: 20000 });
  await page.waitForTimeout(500);
  // Task 8f-adjacent layout fix: ChatDock now floats over the map,
  // bottom-right, and starts EXPANDED (see ChatDock.tsx's own state
  // machine) -- at its default size that panel can physically cover
  // central-US airports (ORD included). Collapsing it here is the
  // correct fix (not a workaround): every assertion below is about MAP
  // interaction, which is honestly only unobstructed once a real user
  // either collapses the dock or submits their first disruption (the
  // dock's own auto-collapse trigger) -- collapsing up front tests the
  // map exactly as a user would see it after either path.
  await page.getByTestId("chat-toggle").click();
  await page.waitForTimeout(250);
}

/** deck.gl's own hover-picking commit lands on a real but variable
 * number of animation-frame ticks after the mouse event -- a FIXED
 * wait after the move is genuinely racy (confirmed directly during this
 * suite's own development: identical code passed or failed run to run
 * depending on incidental timing). Polling window.__mapDebug's own
 * hoveredAirportIata until it matches is robust regardless of how many
 * ticks deck.gl actually needs. */
async function hoverAirportAndWait(page: Page, x: number, y: number, iata: string) {
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 20 });
  await page.waitForFunction((expected) => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.hoveredAirportIata === expected, iata, { timeout: 10000 });
}

async function clickAirportAndWait(page: Page, x: number, y: number, iata: string) {
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 20 });
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction((expected) => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.focusedAirportIata === expected, iata, { timeout: 10000 });
}

/** Same genuine deck.gl picking latency as hover (see hoverAirportAndWait's
 * own comment) applies to CLICK callbacks too -- the GPU-readback-based
 * picking commit can land a real, variable number of frames after the
 * mouse event, so a fixed wait after an "empty space" click raced the
 * app's own state clearing (caught directly: a standalone debug script
 * showed the onClick handler's clearing branch DID run and DID update
 * focusedLegId to null, just after this function's old fixed 400ms
 * timeout had already read the stale prior value). Polling for both
 * focus fields to clear is robust regardless of how many frames it takes. */
async function clickAt(page: Page, x: number, y: number) {
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 20 });
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(
    () => {
      const d = (window as unknown as { __mapDebug?: MapDebug }).__mapDebug;
      return d?.focusedAirportIata === null && d?.focusedLegId === null;
    },
    undefined,
    { timeout: 10000 }
  );
}

test.describe("checkpoint 1: every airport renders, affected/unaffected split", () => {
  test("real counts: 272 airports with traffic, only the directly-disrupted ORD is affected (not every spillover-crossing airport)", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const debug = await getDebug(page);
    expect(debug.airportCount).toBe(272);
    expect(debug.affectedAirportIatas).toEqual(["ORD"]);
    console.log(`airportCount=${debug.airportCount} affected=${JSON.stringify(debug.affectedAirportIatas)}`);
    await page.screenshot({ path: path.join(OUT_DIR, "8c-01-all-airports.png") });
  });
});

test.describe("checkpoint 2: hover", () => {
  test("hovering the affected airport (ORD) shows IATA/city/state + disruption info", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const { x, y } = await screenPosForAirport(page, "ORD");
    await hoverAirportAndWait(page, x, y, "ORD");
    const box = page.getByTestId("airport-hover-box");
    await expect(box).toBeVisible();
    await expect(box).toContainText("ORD");
    await expect(box).toContainText("Chicago, IL");
    await expect(box).toContainText("CLOSE_RUNWAY");
    await page.screenshot({ path: path.join(OUT_DIR, "8c-02-hover-affected.png") });
  });

  test("hovering an unaffected airport shows IATA/city/state ALONE, no disruption text", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const unaffected = await findOnCanvasUnaffectedAirport(page);
    const { x, y } = await screenPosForAirport(page, unaffected);
    await hoverAirportAndWait(page, x, y, unaffected);
    const box = page.getByTestId("airport-hover-box");
    await expect(box).toBeVisible();
    await expect(box).toContainText(unaffected);
    await expect(box).not.toContainText("CLOSE_RUNWAY");
    await expect(box).not.toContainText("GROUND_AIRCRAFT");
    await page.screenshot({ path: path.join(OUT_DIR, "8c-02-hover-unaffected.png") });
  });
});

test.describe("checkpoint 3+4: click panel real numbers + reconciliation", () => {
  test("clicking ORD opens a panel whose cost overrun matches the computed airport stats exactly", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const { x, y } = await screenPosForAirport(page, "ORD");
    await clickAirportAndWait(page, x, y, "ORD");
    const debug = await getDebug(page);

    const ordStats = debug.airportStatsByIata.ORD;
    await expect(page.getByTestId("airport-detail-panel")).toBeVisible();
    // The panel's own rendered typical cost must equal the computed stats' typical cost, to the cent.
    const typicalUsd = Math.round(ordStats.costUsd.typical);
    await expect(page.getByTestId("airport-detail-panel")).toContainText(`$${typicalUsd.toLocaleString("en-US")}`);
    console.log("ORD stats:", JSON.stringify(ordStats));
    await page.screenshot({ path: path.join(OUT_DIR, "8c-03-click-affected-panel.png") });
  });

  test("reconciliation: sum of ALL airports' cost-overrun typical equals the scenario's total cost overrun", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const debug = await getDebug(page);
    const sumTypical = Object.values(debug.airportStatsByIata).reduce((acc, s) => acc + s.costUsd.typical, 0);
    const totalTypical = await page.evaluate(async () => {
      const res = await fetch("/scenarios/ord-runway-closure/impact-summary.json");
      const json = await res.json();
      return json.totalCostUsd.typical;
    });
    console.log(`sum of per-airport typical=${sumTypical} total=${totalTypical}`);
    expect(Math.abs(sumTypical - totalTypical)).toBeLessThan(1);
  });
});

test.describe("checkpoint 5: unaffected airport click panel", () => {
  test("clicking an unaffected airport opens a panel with real (mostly zero) numbers, honest identity", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const unaffected = await findOnCanvasUnaffectedAirport(page);
    const { x, y } = await screenPosForAirport(page, unaffected);
    await clickAirportAndWait(page, x, y, unaffected);
    await expect(page.getByTestId("airport-detail-panel")).toBeVisible();
    await expect(page.getByTestId("airport-detail-panel")).toContainText("No disruption injected at this airport.");
    await page.screenshot({ path: path.join(OUT_DIR, "8c-05-click-unaffected-panel.png") });
  });
});

test.describe("checkpoint 9: airport flight list (departures/arrivals)", () => {
  test("clicking ORD lists individual departures/arrivals matching flights.json exactly, and clicking a row focuses that flight", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const { x, y } = await screenPosForAirport(page, "ORD");
    await clickAirportAndWait(page, x, y, "ORD");

    // Departures/Arrivals now live behind their own tabs (Overview shows
    // first) -- click into each before asserting on its content.
    await expect(page.getByTestId("airport-tab-departures")).toContainText("957");
    await expect(page.getByTestId("airport-tab-arrivals")).toContainText("958");

    await page.getByTestId("airport-tab-departures").click();
    const depSection = page.getByTestId("airport-flights-departures");
    await expect(depSection).toBeVisible();
    await expect(depSection).toContainText("(957)");

    // Spot-check the first shown departure row against flights.json directly.
    const source = await page.evaluate(async () => {
      const res = await fetch("/scenarios/ord-runway-closure/flights.json");
      const json = await res.json();
      const deps = (json.flights as { legId: string; originIata: string; flightNumber: string | null; destIata: string; scheduledDepMin: number | null }[])
        .filter((f) => f.originIata === "ORD")
        .sort((a, b) => (a.scheduledDepMin ?? Infinity) - (b.scheduledDepMin ?? Infinity));
      return deps[0];
    });
    const firstRow = depSection.locator('[data-testid^="airport-flight-row-"]').first();
    await expect(firstRow).toContainText(source.flightNumber ?? source.legId);
    await expect(firstRow).toContainText(source.destIata);
    await page.screenshot({ path: path.join(OUT_DIR, "8c-09-airport-flight-list.png") });

    // Clicking a departure row jumps into that flight's own focus mode.
    await firstRow.click();
    await page.waitForFunction((expected) => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.focusedLegId === expected, source.legId, { timeout: 10000 });
    const debug = await getDebug(page);
    expect(debug.focusedLegId).toBe(source.legId);
    expect(debug.focusedAirportIata).toBeNull();
    await expect(page.getByTestId("airport-detail-panel")).toHaveCount(0);
  });

  test("multi-day scenario shows no per-flight departures/arrivals section (flights.json never covers a genuine multi-day range)", async ({ page }) => {
    await gotoAndWait(page, MULTI_DAY_URL);
    const { x, y } = await screenPosForAirport(page, "ORD");
    await clickAirportAndWait(page, x, y, "ORD");
    await expect(page.getByTestId("airport-detail-panel")).toBeVisible();
    await expect(page.getByTestId("airport-flights-departures")).toHaveCount(0);
    await expect(page.getByTestId("airport-flights-arrivals")).toHaveCount(0);
  });
});

test.describe("checkpoint 7: focus-mode interaction", () => {
  test("clicking an airport dims other airports; clicking a plane switches focus; clicking empty clears both", async ({ page }) => {
    await gotoAndWait(page, SINGLE_DAY_URL);
    const { x, y } = await screenPosForAirport(page, "ORD");
    await clickAirportAndWait(page, x, y, "ORD");
    let debug = await getDebug(page);
    expect(debug.focusedAirportIata).toBe("ORD");
    expect(debug.focusedLegId).toBeNull();

    // Click a known in-air plane (if any) to switch focus. Must pick one
    // whose PROJECTED position falls clear of the now-open
    // AirportDetailPanel's own 340px-wide overlay (top-0 right-0 within
    // the map's own relative wrapper) -- an arbitrary "first in-air leg"
    // can easily land underneath that panel, where a click hits the
    // panel's DOM instead of the canvas beneath it (caught directly
    // during this suite's own development: hoveredLegId/focusedLegId
    // both silently stayed null for such a leg, with no error -- just a
    // click swallowed by the wrong element).
    const candidate = await page.evaluate(() => {
      const w = window as unknown as {
        __mapDebug: MapDebug & { inAirByLegId: Record<string, { curLon: number; curLat: number }>; project: (lon: number, lat: number) => [number, number] | undefined };
      };
      const canvas = document.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return null;
      const panelLeftEdge = rect.width - 340;
      for (const legId of w.__mapDebug.inAirLegIds) {
        const f = w.__mapDebug.inAirByLegId[legId];
        const screen = w.__mapDebug.project(f.curLon, f.curLat);
        if (!screen) continue;
        if (screen[0] < panelLeftEdge - 20 && screen[0] > 20 && screen[1] > 20 && screen[1] < rect.height - 20) {
          return { legId, x: screen[0] + rect.left, y: screen[1] + rect.top };
        }
      }
      return null;
    });
    expect(candidate, "expected at least one in-air plane clear of the airport panel's overlay area").toBeTruthy();
    if (candidate) {
      const targetLegId = candidate.legId;
      const projected: [number, number] = [candidate.x, candidate.y];
      {
        await page.mouse.move(0, 0);
        await page.mouse.move(projected[0], projected[1], { steps: 20 });
        await page.waitForTimeout(200);
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForFunction((expected) => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.focusedLegId === expected, targetLegId, { timeout: 10000 });
        debug = await getDebug(page);
        expect(debug.focusedLegId).toBe(targetLegId);
        expect(debug.focusedAirportIata).toBeNull();
      }
    }

    // Click empty map space (top-left corner, away from anything) to clear focus.
    await clickAt(page, 300, 60);
    debug = await getDebug(page);
    expect(debug.focusedAirportIata).toBeNull();
    expect(debug.focusedLegId).toBeNull();
  });
});

test.describe("checkpoint 6: multi-day per-day breakdown", () => {
  test("clicking ORD on the december-cascade scenario shows a per-day breakdown whose Dec 15 row matches airport-daily.json exactly", async ({ page }) => {
    await gotoAndWait(page, MULTI_DAY_URL);

    // Switch to month scale first so the view window covers the FULL
    // Dec 8-24 range (the default day-scale window on load is a 2-3 day
    // slice starting at coverage.startDay, which would exclude Dec 15's
    // disruption entirely -- see lib/viewWindowContext.tsx's own default
    // state). The per-day breakdown renders exactly the days in the
    // CURRENT view window (USMap.tsx's own viewDays), consistent with
    // Task 8b/8d's "show what you're currently looking at" convention.
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-month").click();

    const { x, y } = await screenPosForAirport(page, "ORD");
    await clickAirportAndWait(page, x, y, "ORD");

    const panel = page.getByTestId("airport-detail-panel");
    await expect(panel).toBeVisible();
    const breakdown = page.getByTestId("airport-per-day-breakdown");
    await expect(breakdown).toBeVisible();

    const row = page.getByTestId("airport-day-row-2025-12-15");
    await expect(row).toBeVisible();
    const rowCostCell = page.getByTestId("airport-day-cost-2025-12-15");
    const renderedCost = (await rowCostCell.textContent())?.trim();
    expect(renderedCost).toBeTruthy();

    // Cross-check against airport-daily.json fetched directly -- not the
    // app's own debug hook -- so this genuinely verifies the panel traces
    // to the exported source data, the same discipline checkpoint 3+4's
    // reconciliation check already uses.
    const sourceOrdDec15 = await page.evaluate(async () => {
      const res = await fetch("/scenarios/december-cascade/airport-daily.json");
      const json = await res.json();
      return json["2025-12-15"]?.ORD;
    });
    expect(sourceOrdDec15).toBeTruthy();
    console.log("ORD Dec15 source:", JSON.stringify(sourceOrdDec15), "rendered:", renderedCost);
    // Mirrors lib/format.ts's own formatUsd exactly (sign prefix before
    // the $, not inside it) so a negative variance still compares correctly.
    const v = sourceOrdDec15.costTypical;
    const expectedFormatted = `${v < 0 ? "-" : ""}$${Math.round(Math.abs(v)).toLocaleString("en-US")}`;
    expect(renderedCost).toBe(expectedFormatted);

    await breakdown.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT_DIR, "8c-06-multiday-perday-breakdown.png") });
  });

  test("reconciliation: multi-day airportStatsByIata summed over the full range equals impact-summary.json's own byAirport", async ({ page }) => {
    await gotoAndWait(page, MULTI_DAY_URL);
    await expect(page.getByTestId("view-scale-toggle")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("view-scale-month").click();
    // Let the month-scale view window (and its dependent airportStatsByIata
    // recompute) settle before reading the debug hook.
    await page.waitForFunction(() => (window as unknown as { __mapDebug?: MapDebug }).__mapDebug?.airportStatsByIata?.ORD?.costUsd?.typical !== 0, undefined, { timeout: 10000 });
    const debug = await getDebug(page);
    const ordComputed = debug.airportStatsByIata.ORD;

    const sourceByAirport = await page.evaluate(async () => {
      const res = await fetch("/scenarios/december-cascade/impact-summary.json");
      const json = await res.json();
      return json.byAirport as Record<string, { costUsd: { typical: number } }>;
    });
    const ordSource = sourceByAirport.ORD;
    console.log("ORD computed (client, summed over view window):", JSON.stringify(ordComputed.costUsd), "source (server range total):", JSON.stringify(ordSource.costUsd));
    expect(Math.abs(ordComputed.costUsd.typical - ordSource.costUsd.typical)).toBeLessThan(1);
  });
});
