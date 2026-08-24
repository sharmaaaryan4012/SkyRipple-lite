import { test, expect, type Page, type Download } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";

const OUT_DIR = "/private/tmp/claude-501/-Users-aaryan-Desktop-Projects-aviation/15b06f4d-76ea-4675-a213-e051d224566d/scratchpad/screenshots";
const SINGLE_DAY_URL = "/?scenario=ord-runway-closure&raw=1";
const MULTI_DAY_URL = "/?scenario=december-cascade&raw=1";

/** Minimal CSV parser matching lib/csvExport.ts's own rowsToCsv escaping
 * (RFC4180-ish: double-quote wrapping, doubled quotes inside). Good
 * enough for this suite's own spot-checks -- not a general-purpose
 * parser. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip, \n handles the line break
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

async function gotoAndWaitForExportPanel(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("export-panel")).toBeVisible({ timeout: 20000 });
}

async function downloadWith(page: Page, action: () => Promise<void>): Promise<Download> {
  const [download] = await Promise.all([page.waitForEvent("download"), action()]);
  return download;
}

async function readDownload(download: Download): Promise<string> {
  const p = await download.path();
  if (!p) throw new Error("download had no path");
  return fs.readFileSync(p, "utf-8");
}

test.describe("checkpoint 1: picker UI", () => {
  test("single-day scenario offers exactly flight/airport/carrier (no per-day), all unchecked, columns all-on by default", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, SINGLE_DAY_URL);
    await expect(page.getByTestId("export-grain-flight")).toBeVisible();
    await expect(page.getByTestId("export-grain-airport")).toBeVisible();
    await expect(page.getByTestId("export-grain-carrier")).toBeVisible();
    await expect(page.getByTestId("export-grain-day")).toHaveCount(0);

    await expect(page.getByTestId("export-grain-flight")).not.toBeChecked();
    await expect(page.getByTestId("export-grain-airport")).not.toBeChecked();
    await expect(page.getByTestId("export-grain-carrier")).not.toBeChecked();

    await page.getByTestId("export-grain-airport").check();
    await page.getByTestId("export-columns-toggle-airport").click();
    const cols = page.getByTestId("export-columns-airport").locator("input[type=checkbox]");
    const count = await cols.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < count; i++) await expect(cols.nth(i)).toBeChecked();

    await page.getByTestId("export-panel").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT_DIR, "8d-01-picker-ui.png") });
  });

  test("multi-day scenario additionally offers per-day", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, MULTI_DAY_URL);
    await expect(page.getByTestId("export-grain-day")).toBeVisible();
  });

  test("select-all/none clears and restores every column checkbox for a grain", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, SINGLE_DAY_URL);
    await page.getByTestId("export-grain-flight").check();
    await page.getByTestId("export-columns-toggle-flight").click();
    const panel = page.getByTestId("export-columns-flight");
    await panel.getByText("None", { exact: true }).click();
    const cols = panel.locator("input[type=checkbox]");
    const count = await cols.count();
    for (let i = 0; i < count; i++) await expect(cols.nth(i)).not.toBeChecked();
    await panel.getByText("All", { exact: true }).click();
    for (let i = 0; i < count; i++) await expect(cols.nth(i)).toBeChecked();
  });
});

test.describe("checkpoint 2: scope-respecting row counts", () => {
  test("per-flight row count matches flights.json's own count when the window overlaps the scenario's own first 24 hours, and is 0 once scrubbed away from it", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, MULTI_DAY_URL);
    // flights.json's own scheduledDepMin/simDepMin are never rebased onto
    // the scenario's global axis (copied unchanged from a single-day
    // export -- see lib/csvExport.ts's own flightRows docstring for why
    // there's no reliable "which calendar day" field to filter by
    // instead). The default day-scale window on load (Dec 8-9, global
    // minutes [0, 2880)) overlaps flights.json's own [0, ~1440) local
    // axis for MOST flights -- independently recomputing the SAME
    // [startMin, endMin) filter directly against the raw file (rather
    // than assuming every one of the file's flights falls inside it)
    // is the honest spot-check here.
    const realCount = await page.evaluate(async () => {
      const res = await fetch("/scenarios/december-cascade/flights.json");
      const json = await res.json();
      return (json.flights as { scheduledDepMin: number | null }[]).filter((f) => f.scheduledDepMin != null && f.scheduledDepMin >= 0 && f.scheduledDepMin < 2880).length;
    });
    await expect(page.getByTestId("export-rowcount-flight")).toHaveText(`${realCount.toLocaleString("en-US")} rows`);

    // Scrubbing to a day whose window no longer overlaps global minute
    // [0, 1440) -- Dec 15 (global minutes [10080, 11520)) -- honestly
    // shows zero rather than fabricating flight data for that day.
    await page.getByTestId("view-scale-day").click();
    await page.getByTestId("day-picker").selectOption("2025-12-15");
    await expect(page.getByTestId("export-rowcount-flight")).toHaveText("0 rows");
  });

  test("per-airport row count is the same regardless of view window (every airport with traffic is always a row; only its stats change)", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, MULTI_DAY_URL);
    const dayCount = await page.getByTestId("export-rowcount-airport").textContent();
    await page.getByTestId("view-scale-month").click();
    const monthCount = await page.getByTestId("export-rowcount-airport").textContent();
    expect(dayCount).toBe(monthCount);
  });

  test("per-day row count matches the number of calendar days in the current window", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, MULTI_DAY_URL);
    await page.getByTestId("view-scale-month").click();
    await expect(page.getByTestId("export-rowcount-day")).toHaveText("17 rows");

    await page.getByTestId("view-scale-week").click();
    await page.getByTestId("week-picker").selectOption({ label: "Dec 15 - Dec 21" });
    await expect(page.getByTestId("export-rowcount-day")).toHaveText("7 rows");
  });
});

test.describe("checkpoints 3-6: per-grain exports, spot-checked against source data", () => {
  test("per-flight CSV: a known leg's fields match flights.json exactly", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, SINGLE_DAY_URL);
    await page.getByTestId("export-grain-flight").check();
    const download = await downloadWith(page, () => page.getByTestId("export-download-button").click());
    const text = await readDownload(download);
    const rows = csvToObjects(text);

    const source = await page.evaluate(async () => {
      const res = await fetch("/scenarios/ord-runway-closure/flights.json");
      const json = await res.json();
      return json.flights.find((f: { legId: string }) => f.legId === "LEG_00261699");
    });
    const row = rows.find((r) => r.legId === "LEG_00261699");
    expect(row).toBeTruthy();
    expect(row!.carrierCode).toBe(source.carrierCode);
    expect(row!.originIata).toBe(source.originIata);
    expect(row!.destIata).toBe(source.destIata);
    expect(Number(row!.scheduledDepMin)).toBe(source.scheduledDepMin);
    expect(Number(row!.scenarioDelayMin)).toBe(source.scenario.delayMin);
    expect(row!.scenarioSeverity).toBe(source.scenario.severity);
  });

  test("per-airport CSV: ORD's cost overrun matches impact-summary.json's byAirport exactly", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, SINGLE_DAY_URL);
    await page.getByTestId("export-grain-airport").check();
    const download = await downloadWith(page, () => page.getByTestId("export-download-button").click());
    expect(download.suggestedFilename()).toBe("skyripple_perairport_dec15.csv");
    const text = await readDownload(download);
    console.log("--- sample of skyripple_perairport_dec15.csv (first 4 lines) ---");
    console.log(text.split("\r\n").slice(0, 4).join("\n"));
    const rows = csvToObjects(text);

    const source = await page.evaluate(async () => {
      const res = await fetch("/scenarios/ord-runway-closure/impact-summary.json");
      const json = await res.json();
      return json.byAirport.ORD;
    });
    const row = rows.find((r) => r.iata === "ORD");
    expect(row).toBeTruthy();
    expect(Math.abs(Number(row!.costUsdTypical) - source.costUsd.typical)).toBeLessThan(1);
    expect(Number(row!.delayMin)).toBe(source.delayMin);
    expect(Number(row!.cancelled)).toBe(source.cancelled);
  });

  test("per-carrier CSV: AA's window cost (full single-day window) matches ledger-by-carrier.json's own scenario-total variance", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, SINGLE_DAY_URL);
    await page.getByTestId("export-grain-carrier").check();
    const download = await downloadWith(page, () => page.getByTestId("export-download-button").click());
    const rows = csvToObjects(await readDownload(download));

    const source = await page.evaluate(async () => {
      const res = await fetch("/scenarios/ord-runway-closure/ledger-by-carrier.json");
      const json: { carrierCode: string; total: { variance: { typical: number } } }[] = await res.json();
      return json.find((r) => r.carrierCode === "AA")!.total.variance.typical;
    });
    const row = rows.find((r) => r.carrierCode === "AA");
    expect(row).toBeTruthy();
    // Single-day scenario, full-day window: costUsdTypicalWindow (genuinely
    // window-scoped) and costUsdTypicalScenarioTotal (the ledger's own
    // total) should agree, since the window IS the whole scenario here.
    expect(Math.abs(Number(row!.costUsdTypicalWindow) - source)).toBeLessThan(1);
    expect(Math.abs(Number(row!.costUsdTypicalScenarioTotal) - source)).toBeLessThan(1);
  });

  test("per-day CSV: summing every row's cost over the full month window reconciles to impact-summary.json's own total", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, MULTI_DAY_URL);
    await page.getByTestId("view-scale-month").click();
    await page.getByTestId("export-grain-day").check();
    const download = await downloadWith(page, () => page.getByTestId("export-download-button").click());
    const rows = csvToObjects(await readDownload(download));
    expect(rows.length).toBe(17);

    const sumTypical = rows.reduce((acc, r) => acc + Number(r.costUsdTypical), 0);
    const totalTypical = await page.evaluate(async () => {
      const res = await fetch("/scenarios/december-cascade/impact-summary.json");
      const json = await res.json();
      return json.totalCostUsd.typical as number;
    });
    console.log(`per-day sum=${sumTypical} impact-summary total=${totalTypical}`);
    expect(Math.abs(sumTypical - totalTypical)).toBeLessThan(1);
  });
});

test.describe("checkpoint 7: multiple-grain export zips", () => {
  test("checking two grains downloads one .zip containing both CSVs", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, SINGLE_DAY_URL);
    await page.getByTestId("export-grain-airport").check();
    await page.getByTestId("export-grain-carrier").check();
    const download = await downloadWith(page, () => page.getByTestId("export-download-button").click());
    expect(download.suggestedFilename()).toMatch(/\.zip$/);

    const p = await download.path();
    expect(p).toBeTruthy();
    const buf = fs.readFileSync(p!);
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).sort();
    expect(names.length).toBe(2);
    expect(names.some((n) => n.includes("perairport"))).toBe(true);
    expect(names.some((n) => n.includes("percarrier"))).toBe(true);
  });
});

test.describe("checkpoint 8: column selection removes columns cleanly", () => {
  test("unchecking aircraftType removes it from the flight CSV's header and every row", async ({ page }) => {
    await gotoAndWaitForExportPanel(page, SINGLE_DAY_URL);
    await page.getByTestId("export-grain-flight").check();
    await page.getByTestId("export-columns-toggle-flight").click();
    await page.getByTestId("export-col-flight-aircraftType").uncheck();
    const download = await downloadWith(page, () => page.getByTestId("export-download-button").click());
    const text = await readDownload(download);
    const [header] = parseCsv(text);
    expect(header).not.toContain("aircraftType");
    expect(header).toContain("legId");
  });
});
