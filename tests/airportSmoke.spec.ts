import { test, expect } from "@playwright/test";
import * as path from "path";

const OUT_DIR = "/private/tmp/claude-501/-Users-aaryan-Desktop-Projects-aviation/15b06f4d-76ea-4675-a213-e051d224566d/scratchpad/screenshots";

test("airport layer smoke test on single-day ord-runway-closure (raw)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    // A 404 for airport-daily.json is EXPECTED for a single-day scenario
    // (lib/loadScenario.ts's fetchJsonOptional treats it as "doesn't
    // exist," by design -- see that module's own docstring) -- not a
    // real error to fail this smoke test on.
    if (msg.type() === "error" && !msg.text().includes("404")) errors.push(msg.text());
  });

  await page.goto("/?scenario=ord-runway-closure&raw=1");
  await page.waitForTimeout(3000);

  const debug = await page.evaluate(() => (window as unknown as { __mapDebug?: Record<string, unknown> }).__mapDebug);
  console.log("mapDebug:", JSON.stringify(debug, null, 2));

  await page.screenshot({ path: path.join(OUT_DIR, "airport-smoke-full.png"), fullPage: false });

  expect(errors, `console/page errors: ${errors.join("\n")}`).toEqual([]);
  expect(debug?.airportCount).toBeGreaterThan(0);
});
