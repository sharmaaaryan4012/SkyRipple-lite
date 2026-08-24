import { test, expect, type Page } from "@playwright/test";
import { executeQuery, type QAContext } from "../lib/qaQuery";

const SINGLE_DAY_URL = "/?scenario=ord-runway-closure&raw=1";
const MULTI_DAY_URL = "/?scenario=december-cascade&raw=1";

/**
 * Task 8e verification: the chat's second job (Tier A/B questions about
 * the loaded scenario) alongside its first (disruption injection,
 * Task 5b, unmodified). Real HTTP to the local FastAPI backend (Gemini
 * classification, api/qa_router.py) + real browser interaction with the
 * running Next.js dev server -- no mocking, per every prior LLM task's
 * own verification discipline. Requires GEMINI_API_KEY in .env and both
 * servers running.
 *
 * Every numeric assertion below was independently computed from the raw
 * exported JSON (impact-summary.json, ledger-by-carrier.json, cost-
 * timeseries.json) BEFORE writing the test -- not by calling this app's
 * own lib/qaQuery.ts a second time -- so a match here is a genuine
 * zero-drift check against source data, the same discipline every
 * airport/CSV-export test in this suite already uses.
 */

async function gotoAndWaitForChat(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("chat-input")).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(500); // let the boot-time scenario-summary message land first
}

async function sendAndWaitForReply(page: Page, text: string, timeout = 25000): Promise<string> {
  const before = await page.getByTestId("chat-message").count();
  const input = page.getByTestId("chat-input");
  await input.fill(text);
  await page.getByTestId("chat-send-button").click();
  await page.waitForFunction(
    ({ before }) => {
      const nodes = document.querySelectorAll('[data-testid="chat-message"]');
      if (nodes.length < before + 2) return false;
      const last = nodes[nodes.length - 1];
      return last.getAttribute("data-pending") === "false";
    },
    { before },
    { timeout }
  );
  const bubbles = page.getByTestId("chat-message");
  const count = await bubbles.count();
  return (await bubbles.nth(count - 1).textContent()) ?? "";
}

test.describe("checkpoint 1+2: classification routes correctly", () => {
  test("disruption path unchanged: 'close a runway at ORD' still parses+simulates, not a Q&A answer", async ({ page }) => {
    test.setTimeout(120_000); // real /api/parse-and-simulate call, ~15-45s -- default 30s test timeout is too short
    await gotoAndWaitForChat(page, SINGLE_DAY_URL);
    const reply = await sendAndWaitForReply(page, "close a runway at ORD", 100000);
    // The EXISTING 5b interpretation format ("I understood this as: 1) close_runway...")
    // -- never the Q&A "You asked about..." framing.
    expect(reply.toLowerCase()).toContain("close_runway");
    expect(reply.toLowerCase()).not.toContain("you asked");
  });

  test("question path: 'what did this cost United?' answers directly, no simulation triggered", async ({ page }) => {
    await gotoAndWaitForChat(page, SINGLE_DAY_URL);
    const reply = await sendAndWaitForReply(page, "what did this cost United?");
    expect(reply).toMatch(/united/i);
    expect(reply).toMatch(/\$[\d,]+/);
    expect(reply.toLowerCase()).not.toContain("i understood this as");
  });
});

test.describe("checkpoint 3: aggregate lookup (Tier A) matches the dashboard exactly", () => {
  test("carrier_cost for American matches ledger-by-carrier.json's own total.variance.typical ($83,625)", async ({ page }) => {
    await gotoAndWaitForChat(page, SINGLE_DAY_URL);
    const reply = await sendAndWaitForReply(page, "what did this cost American?");
    console.log("carrier_cost reply:", reply);
    expect(reply).toContain("$83,625");
  });
});

test.describe("checkpoint 4: airport lookup matches the 8c panel exactly", () => {
  test("'how did ORD do?' matches the airport panel's own cost/delay/passenger numbers", async ({ page }) => {
    await gotoAndWaitForChat(page, SINGLE_DAY_URL);
    const reply = await sendAndWaitForReply(page, "how did ORD do?");
    console.log("airport_impact reply:", reply);
    expect(reply).toContain("$234,031");
    expect(reply).toContain("229");
    expect(reply).toContain("957");
    expect(reply).toContain("11,087");
  });
});

test.describe("checkpoint 5: ranking (Tier B)", () => {
  test("'which carrier fared worst?' returns DL, matching the sorted ledger-by-carrier data", async ({ page }) => {
    await gotoAndWaitForChat(page, MULTI_DAY_URL);
    const reply = await sendAndWaitForReply(page, "which carrier fared worst by cost?");
    console.log("carrier_ranking reply:", reply);
    expect(reply).toContain("DL");
    expect(reply).toContain("$1,191,187");
  });
});

test.describe("checkpoint 6: comparison (Tier B)", () => {
  test("'compare Dec 15 to Dec 20' matches independently-computed per-day cost aggregates", async ({ page }) => {
    await gotoAndWaitForChat(page, MULTI_DAY_URL);
    const reply = await sendAndWaitForReply(page, "compare Dec 15 to Dec 20");
    console.log("day_comparison reply:", reply);
    expect(reply).toContain("$953,310");
    expect(reply).toContain("-$3,725");
  });
});

test.describe("checkpoint 7: interpretation-echo", () => {
  test("every answer restates what was understood before the number", async ({ page }) => {
    await gotoAndWaitForChat(page, SINGLE_DAY_URL);
    const reply = await sendAndWaitForReply(page, "what did this cost United?");
    expect(reply.toLowerCase()).toMatch(/you asked/);
  });
});

test.describe("checkpoint 10: honest miss -- ambiguous", () => {
  test("'how did they do?' asks a clarifying question instead of guessing", async ({ page }) => {
    await gotoAndWaitForChat(page, SINGLE_DAY_URL);
    const reply = await sendAndWaitForReply(page, "how did they do?");
    console.log("ambiguous reply:", reply);
    expect(reply).toContain("?");
    expect(reply).not.toMatch(/\$[\d,]+/);
  });
});

test.describe("checkpoint 8: honest miss -- unknown query shape", () => {
  test("'what's the pilot's mood?' names answerable kinds, fabricates nothing", async ({ page }) => {
    await gotoAndWaitForChat(page, SINGLE_DAY_URL);
    const reply = await sendAndWaitForReply(page, "what's the pilot's mood today?");
    console.log("unknown reply:", reply);
    expect(reply.toLowerCase()).toMatch(/carrier|airport|day|scenario/);
    expect(reply).not.toMatch(/\$\d/);
  });
});

test.describe("checkpoint 9: honest miss -- data doesn't support (out of range)", () => {
  test("a day outside the loaded Dec 8-24 range names the actual loaded coverage", async ({ page }) => {
    await gotoAndWaitForChat(page, MULTI_DAY_URL);
    const reply = await sendAndWaitForReply(page, "what was the cost on December 5th?");
    console.log("out-of-range reply:", reply);
    expect(reply).toMatch(/dec\s*8/i);
    expect(reply).toMatch(/dec\s*24/i);
  });
});

test.describe("checkpoint 11: Tier C -- out of scope (causal)", () => {
  test("'why did American benefit from the DEN closure?' declines honestly, no fabricated causal story", async ({ page }) => {
    await gotoAndWaitForChat(page, MULTI_DAY_URL);
    const reply = await sendAndWaitForReply(page, "why did American benefit from the DEN closure?");
    console.log("tier_c reply:", reply);
    expect(reply.toLowerCase()).toMatch(/can't reliably tell you why|can not reliably tell you why/);
    expect(reply).not.toMatch(/\$[\d,]+/);
  });
});

test.describe("checkpoint 12: validation gate -- malformed queryKind rejected client-side", () => {
  test("an unknown queryKind never reaches an executor; returns an honest miss, no crash", () => {
    // Deliberately a ctx no executor could work with -- if isQueryKind's
    // gate didn't run FIRST, this would throw reading scenario.* fields
    // that don't exist, rather than returning the honest-miss text below.
    // A malformed kind must be rejected BEFORE ctx is ever touched.
    const brokenCtx = {} as unknown as QAContext;
    const result = executeQuery("not_a_real_query_kind", {}, brokenCtx);
    expect(result.ok).toBe(false);
    expect(result.text.toLowerCase()).toContain("i can answer about");
  });

  test("a real queryKind's own required-param check also runs before touching ctx.scenario", () => {
    // carrier_cost with no carrier named -- must honest-miss on the missing
    // param, not crash trying to read scenario.meta off a broken ctx.
    const brokenCtx = {} as unknown as QAContext;
    const result = executeQuery("carrier_cost", {}, brokenCtx);
    expect(result.ok).toBe(false);
    expect(result.text.toLowerCase()).toContain("i need a specific carrier");
  });
});
