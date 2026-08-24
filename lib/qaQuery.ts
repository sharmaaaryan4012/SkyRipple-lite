/**
 * Task 8e: the CLOSED, TYPED query set the chat's Q&A path executes --
 * the "code disposes" half of api/qa_router.py's "Gemini proposes, code
 * disposes" split (see that module's own docstring for the full
 * architecture rationale: classification+parsing happens server-side,
 * EXECUTION happens here, against whatever's already loaded in the
 * browser).
 *
 * QUERY_KINDS below must stay byte-identical to api/qa_router.py's own
 * QUERY_KINDS set -- both sides name the same closed enum independently
 * (same discipline as 5b's DisruptionKind existing in both engine/
 * disruption.py and api/nl_parser.py's prompt text). isQueryKind() is
 * this file's own validation gate: Gemini's queryKind is re-checked HERE
 * too, even though api/qa_router.py already checked it server-side --
 * belt and suspenders, since this is the side that actually touches
 * real scenario data (a malformed/hallucinated kind must never reach an
 * executor).
 *
 * Every executor below REUSES an already-built, already-tested
 * aggregation rather than re-deriving a number a second way:
 *   - carrier_cost/carrier_ranking   -> lib/csvExport.ts's carrierRows()
 *   - airport_impact/airport_ranking -> lib/csvExport.ts's airportRows()
 *   - day_summary/day_comparison     -> lib/csvExport.ts's dayRows()
 *   - scenario_summary/baseline_comparison -> scenario.impactSummary directly
 *   - passenger_impact                -> airportRows()/dayRows()/impactSummary
 *   - recovery_summary                -> lib/recoveryView.ts's RecoveryView
 * These are the SAME functions the CSV export and (for airports) the 8c
 * click panel already use -- a Q&A answer and the dashboard/panel/CSV
 * can never drift, because they're computed by the identical code.
 *
 * SCOPE: unless a specific `day` is named in the question, every query
 * here answers over the FULL LOADED SCENARIO (fullScopeWindow below),
 * NOT whatever window the 8b view-scale toggle happens to be scrolled
 * to right now -- "which carrier fared worst" should mean the same
 * thing regardless of an unrelated UI scroll position.
 */

import type { AirportMeta, FlightLeg, ScenarioData } from "./types";
import type { RecoveryView } from "./recoveryView";
import { CARRIER_NAMES } from "./carrierNames";
import { formatCount, formatMinutes, formatUsd } from "./format";
import { getCoverage, dayOptions, dayToGlobalMin, formatShort, isMultiDay, type Coverage, type ViewWindow } from "./viewScale";
import { carrierRows, airportRows, dayRows, type AirportRow } from "./csvExport";
import { multiDayAirportStats, type AirportPanelStats } from "./airportAggregation";

export const QUERY_KINDS = [
  "carrier_cost",
  "carrier_ranking",
  "airport_impact",
  "airport_ranking",
  "day_summary",
  "day_comparison",
  "scenario_summary",
  "baseline_comparison",
  "passenger_impact",
  "recovery_summary",
] as const;
export type QueryKind = (typeof QUERY_KINDS)[number];

export function isQueryKind(kind: string): kind is QueryKind {
  return (QUERY_KINDS as readonly string[]).includes(kind);
}

export interface QueryParams {
  carrier?: string | null;
  airport?: string | null;
  day?: string | null;
  day2?: string | null;
  metric?: string | null;
  direction?: string | null;
}

export interface QAContext {
  scenario: ScenarioData;
  flights: FlightLeg[];
  recovery: RecoveryView | null;
}

export interface QAAnswer {
  /** false = an honest miss (missing param, unresolvable name, day
   * outside the loaded range, or a metric this data doesn't break out) --
   * `text` is the explanation, never a fabricated number. */
  ok: boolean;
  /** One-line restatement of what was understood -- the interpretation-
   * echo, built here (not by Gemini) so it can use real carrier/airport
   * names via CARRIER_NAMES/AirportMeta rather than bare codes. */
  interpretation: string;
  text: string;
}

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function carrierLabel(code: string): string {
  const name = CARRIER_NAMES[code];
  return name ? `${name} (${code})` : code;
}

function airportLabel(scenario: ScenarioData, iata: string): string {
  const a = scenario.airports.find((x: AirportMeta) => x.iata === iata);
  return a ? `${a.name} (${iata})` : iata;
}

function coverageHasDay(coverage: Coverage, day: string): boolean {
  return day >= coverage.startDay && day <= coverage.endDay;
}

function outOfRangeText(coverage: Coverage, day: string): string {
  return `This scenario only covers ${formatShort(coverage.startDay)}–${formatShort(coverage.endDay)} - ${day} isn't in the loaded range.`;
}

/** The whole loaded scenario's own span, as a ViewWindow -- for queries
 * with no day named (see this module's own docstring on why that's the
 * default scope, not the dashboard's current view-window UI state). */
function fullScopeWindow(scenario: ScenarioData, coverage: Coverage): ViewWindow {
  const days = dayOptions(coverage).length;
  return { scale: "month", startMin: 0, endMin: days * 1440, startDay: coverage.startDay, endDay: coverage.endDay, label: scenario.meta.label };
}

function metricLabel(metric: string): string {
  switch (metric) {
    case "cost":
      return "cost";
    case "delay":
      return "delay-minutes";
    case "cancellations":
      return "cancellations";
    case "passengers":
      return "passengers affected";
    default:
      return metric;
  }
}

function airportStatsText(stats: AirportPanelStats): string {
  const depPct = stats.flightsScheduledDeparting > 0 ? Math.round((stats.flightsDelayedDeparting / stats.flightsScheduledDeparting) * 100) : 0;
  const arrPct = stats.flightsScheduledArriving > 0 ? Math.round((stats.flightsDelayedArriving / stats.flightsScheduledArriving) * 100) : 0;
  return (
    `${formatUsd(stats.costUsd.typical)} above normal (range ${formatUsd(stats.costUsd.low)}–${formatUsd(stats.costUsd.high)}), ` +
    `${formatCount(stats.flightsDelayedDeparting)}/${formatCount(stats.flightsScheduledDeparting)} flights delayed departing (${depPct}%), ` +
    `${formatCount(stats.flightsDelayedArriving)}/${formatCount(stats.flightsScheduledArriving)} arriving (${arrPct}%), ` +
    `${formatCount(stats.passengersAffected)} passengers affected.`
  );
}

function dayRowText(row: { costUsdTypical: number; delayMinTotal: number; cancelledTotal: number; passengersAffectedTotal: number }): string {
  return `${formatUsd(row.costUsdTypical)} above normal, ${formatMinutes(row.delayMinTotal)} of delay, ${formatCount(row.cancelledTotal)} cancelled, ${formatCount(row.passengersAffectedTotal)} passengers affected`;
}

// ---------------------------------------------------------------------
// carrier_cost
// ---------------------------------------------------------------------
function carrierCost(params: QueryParams, ctx: QAContext): QAAnswer {
  const code = (params.carrier ?? "").toUpperCase();
  if (!code) {
    return { ok: false, interpretation: "You asked about a carrier's cost.", text: 'I need a specific carrier to answer that -- try naming an airline (e.g. "what did this cost United?").' };
  }

  const { scenario } = ctx;
  const coverage = getCoverage(scenario.meta);

  if (params.day) {
    const interpretation = `You asked about ${carrierLabel(code)}'s cost on ${formatShort(params.day)}.`;
    if (!coverageHasDay(coverage, params.day)) {
      return { ok: false, interpretation, text: outOfRangeText(coverage, params.day) };
    }
    if (!scenario.costTimeseries.carriers[code]) {
      return { ok: false, interpretation, text: `${code} isn't a carrier with flights in this loaded scenario.` };
    }
    const start = dayToGlobalMin(coverage, params.day);
    const dayWindow: ViewWindow = { scale: "day", startMin: start, endMin: start + 1440, startDay: params.day, endDay: params.day, label: params.day };
    const row = carrierRows(scenario, scenario.costTimeseries, dayWindow).find((r) => r.carrierCode === code);
    return { ok: true, interpretation, text: `${formatUsd(row?.costUsdTypicalWindow ?? 0)} above normal that day.` };
  }

  const interpretation = `You asked about ${carrierLabel(code)}'s cost across the loaded scenario (${scenario.meta.label}).`;
  const window = fullScopeWindow(scenario, coverage);
  const row = carrierRows(scenario, scenario.costTimeseries, window).find((r) => r.carrierCode === code);
  if (!row || !row.ledgerRow) {
    return { ok: false, interpretation, text: `${code} isn't a carrier with flights in this loaded scenario.` };
  }
  const v = row.ledgerRow.total.variance;
  return { ok: true, interpretation, text: `${formatUsd(v.typical)} above normal (range ${formatUsd(v.low)}–${formatUsd(v.high)}).` };
}

// ---------------------------------------------------------------------
// carrier_ranking
// ---------------------------------------------------------------------
const CARRIER_RANKING_METRICS = new Set(["cost", "delay", "cancellations"]);

function carrierRanking(params: QueryParams, ctx: QAContext): QAAnswer {
  const metric = (params.metric ?? "cost").toLowerCase();
  const direction = params.direction === "best" ? "best" : "worst";
  const interpretation = `You asked which carrier fared ${direction} by ${metricLabel(metric)}.`;

  if (!CARRIER_RANKING_METRICS.has(metric)) {
    return { ok: false, interpretation, text: `I don't have a per-carrier breakdown for "${metric}" -- I can rank carriers by cost, delay, or cancellations.` };
  }

  const { scenario } = ctx;
  const coverage = getCoverage(scenario.meta);
  const window = fullScopeWindow(scenario, coverage);
  const rows = carrierRows(scenario, scenario.costTimeseries, window).filter((r) => r.ledgerRow);
  if (rows.length === 0) return { ok: false, interpretation, text: "No per-carrier data in this loaded scenario." };

  const valueOf = (r: (typeof rows)[number]) => (metric === "cost" ? r.ledgerRow!.total.variance.typical : metric === "delay" ? (r.impact?.delayMin ?? 0) : (r.impact?.cancelled ?? 0));
  const sorted = [...rows].sort((a, b) => (direction === "best" ? valueOf(a) - valueOf(b) : valueOf(b) - valueOf(a)));
  const top = sorted[0];
  const value = valueOf(top);
  const valueText = metric === "cost" ? formatUsd(value) : metric === "delay" ? formatMinutes(value) : formatCount(value);
  return { ok: true, interpretation, text: `${carrierLabel(top.carrierCode)}: ${valueText} (of ${rows.length} carriers).` };
}

// ---------------------------------------------------------------------
// airport_impact
// ---------------------------------------------------------------------
function airportImpact(params: QueryParams, ctx: QAContext): QAAnswer {
  const iata = (params.airport ?? "").toUpperCase();
  if (!iata) {
    return { ok: false, interpretation: "You asked about an airport's impact.", text: 'I need a specific airport to answer that -- try naming one (e.g. "how did ORD do?").' };
  }

  const { scenario, flights } = ctx;
  const coverage = getCoverage(scenario.meta);
  const multiDay = isMultiDay(coverage);
  const meta = scenario.airports.find((a) => a.iata === iata);
  if (!meta) {
    const interpretation = `You asked about ${iata}'s impact.`;
    return { ok: false, interpretation, text: `${iata} isn't an airport with traffic in this loaded scenario.` };
  }

  if (params.day) {
    const interpretation = `You asked about ${airportLabel(scenario, iata)}'s impact on ${formatShort(params.day)}.`;
    if (!coverageHasDay(coverage, params.day)) {
      return { ok: false, interpretation, text: outOfRangeText(coverage, params.day) };
    }
    if (multiDay) {
      const stats = multiDayAirportStats(scenario.airportDaily ?? {}, iata, [params.day]);
      return { ok: true, interpretation, text: airportStatsText(stats) };
    }
    // Single-day scenario: the named day IS the only loaded day -- fall
    // through to the full-scenario stats below rather than duplicating them.
  }

  const interpretation = `You asked about ${airportLabel(scenario, iata)}'s impact across the loaded scenario.`;
  const window = fullScopeWindow(scenario, coverage);
  const row = airportRows(scenario, flights, window, multiDay).find((r) => r.airport.iata === iata);
  if (!row) return { ok: false, interpretation, text: `${iata} isn't an airport with traffic in this loaded scenario.` };
  return { ok: true, interpretation, text: airportStatsText(row.stats) };
}

// ---------------------------------------------------------------------
// airport_ranking
// ---------------------------------------------------------------------
const AIRPORT_RANKING_METRICS = new Set(["cost", "delay", "cancellations", "passengers"]);

function airportRanking(params: QueryParams, ctx: QAContext): QAAnswer {
  const metric = (params.metric ?? "cost").toLowerCase();
  const direction = params.direction === "best" ? "best" : "worst";
  const interpretation = `You asked which airport fared ${direction} by ${metricLabel(metric)}.`;

  if (!AIRPORT_RANKING_METRICS.has(metric)) {
    return { ok: false, interpretation, text: `I don't have a per-airport breakdown for "${metric}" -- I can rank airports by cost, delay, cancellations, or passengers affected.` };
  }

  const { scenario, flights } = ctx;
  const coverage = getCoverage(scenario.meta);
  const multiDay = isMultiDay(coverage);
  const window = fullScopeWindow(scenario, coverage);
  const rows = airportRows(scenario, flights, window, multiDay);
  if (rows.length === 0) return { ok: false, interpretation, text: "No per-airport data in this loaded scenario." };

  const valueOf = (r: AirportRow) => (metric === "cost" ? r.stats.costUsd.typical : metric === "delay" ? r.stats.delayMin : metric === "cancellations" ? r.stats.cancelled : r.stats.passengersAffected);
  const sorted = [...rows].sort((a, b) => (direction === "best" ? valueOf(a) - valueOf(b) : valueOf(b) - valueOf(a)));
  const top = sorted[0];
  const value = valueOf(top);
  const valueText = metric === "cost" ? formatUsd(value) : metric === "delay" ? formatMinutes(value) : formatCount(value);
  return { ok: true, interpretation, text: `${airportLabel(scenario, top.airport.iata)}: ${valueText} (of ${rows.length} airports with traffic).` };
}

// ---------------------------------------------------------------------
// day_summary
// ---------------------------------------------------------------------
function daySummary(params: QueryParams, ctx: QAContext): QAAnswer {
  const day = params.day;
  if (!day) return { ok: false, interpretation: "You asked for a day's totals.", text: "I need a specific day to answer that." };
  const interpretation = `You asked for ${formatShort(day)}'s totals.`;

  const { scenario } = ctx;
  const coverage = getCoverage(scenario.meta);
  if (!coverageHasDay(coverage, day)) {
    return { ok: false, interpretation, text: outOfRangeText(coverage, day) };
  }
  const window = fullScopeWindow(scenario, coverage);
  const row = dayRows(scenario, scenario.costTimeseries, coverage, window).find((r) => r.day === day);
  if (!row) return { ok: false, interpretation, text: `No data for ${day} in this loaded scenario.` };
  return { ok: true, interpretation, text: `${dayRowText(row)}.` };
}

// ---------------------------------------------------------------------
// day_comparison
// ---------------------------------------------------------------------
function dayComparison(params: QueryParams, ctx: QAContext): QAAnswer {
  const { day, day2 } = params;
  if (!day || !day2) {
    return { ok: false, interpretation: "You asked to compare two days.", text: "I need two specific days to compare." };
  }
  const interpretation = `You asked to compare ${formatShort(day)} to ${formatShort(day2)}.`;

  const { scenario } = ctx;
  const coverage = getCoverage(scenario.meta);
  const outOfRange = [day, day2].filter((d) => !coverageHasDay(coverage, d));
  if (outOfRange.length > 0) {
    return { ok: false, interpretation, text: outOfRangeText(coverage, outOfRange[0]) };
  }
  const window = fullScopeWindow(scenario, coverage);
  const rows = dayRows(scenario, scenario.costTimeseries, coverage, window);
  const r1 = rows.find((r) => r.day === day);
  const r2 = rows.find((r) => r.day === day2);
  if (!r1 || !r2) return { ok: false, interpretation, text: "No data for one of those days in this loaded scenario." };
  return { ok: true, interpretation, text: `${formatShort(day)}: ${dayRowText(r1)}.\n${formatShort(day2)}: ${dayRowText(r2)}.` };
}

// ---------------------------------------------------------------------
// scenario_summary
// ---------------------------------------------------------------------
function scenarioSummary(ctx: QAContext): QAAnswer {
  const impact = ctx.scenario.impactSummary;
  return {
    ok: true,
    interpretation: "You asked for the scenario's overall totals.",
    text:
      `${formatUsd(impact.totalCostUsd.typical)} above normal (range ${formatUsd(impact.totalCostUsd.low)}–${formatUsd(impact.totalCostUsd.high)}), ` +
      `${formatMinutes(impact.totalDelayMin)} of delay, ${formatCount(impact.flightsCancelled)} cancelled, ${formatCount(impact.passengersMisconnected)} passengers misconnected.`,
  };
}

// ---------------------------------------------------------------------
// baseline_comparison
// ---------------------------------------------------------------------
function baselineComparison(ctx: QAContext): QAAnswer {
  // ImpactSummary is ALREADY (injected - baseline) by construction (see
  // engine/disruption.py's compute_impact_diff) -- "vs a normal day" IS
  // these same numbers, just framed as a comparison rather than a total.
  const impact = ctx.scenario.impactSummary;
  return {
    ok: true,
    interpretation: "You asked how this scenario compares to a normal (baseline) day.",
    text:
      `${formatUsd(impact.totalCostUsd.typical)} more than a normal day (range ${formatUsd(impact.totalCostUsd.low)}–${formatUsd(impact.totalCostUsd.high)}), ` +
      `${formatMinutes(impact.totalDelayMin)} more delay, ${formatCount(impact.flightsCancelled)} more cancellations.`,
  };
}

// ---------------------------------------------------------------------
// passenger_impact
// ---------------------------------------------------------------------
function passengerImpact(params: QueryParams, ctx: QAContext): QAAnswer {
  const { scenario, flights } = ctx;
  const coverage = getCoverage(scenario.meta);
  const multiDay = isMultiDay(coverage);
  const filters: string[] = [];
  if (params.carrier) filters.push(carrierLabel(params.carrier.toUpperCase()));
  if (params.airport) filters.push(airportLabel(scenario, params.airport.toUpperCase()));
  if (params.day) filters.push(formatShort(params.day));
  const interpretation = `You asked about passengers affected${filters.length ? ` (${filters.join(", ")})` : ""}.`;

  if (params.carrier) {
    return { ok: false, interpretation, text: "I don't have passengers-affected broken out by carrier in this loaded scenario -- I can give you the airport-level or scenario-wide total." };
  }

  if (params.airport) {
    const iata = params.airport.toUpperCase();
    if (!scenario.airports.some((a) => a.iata === iata)) {
      return { ok: false, interpretation, text: `${iata} isn't an airport with traffic in this loaded scenario.` };
    }
    const window = fullScopeWindow(scenario, coverage);
    const row = airportRows(scenario, flights, window, multiDay).find((r) => r.airport.iata === iata);
    return { ok: true, interpretation, text: `${formatCount(row?.stats.passengersAffected ?? 0)} passengers affected.` };
  }

  if (params.day) {
    if (!coverageHasDay(coverage, params.day)) {
      return { ok: false, interpretation, text: outOfRangeText(coverage, params.day) };
    }
    if (!multiDay) {
      return { ok: true, interpretation, text: `${formatCount(scenario.impactSummary.passengersMisconnected)} passengers misconnected.` };
    }
    const window = fullScopeWindow(scenario, coverage);
    const row = dayRows(scenario, scenario.costTimeseries, coverage, window).find((r) => r.day === params.day);
    return { ok: true, interpretation, text: `${formatCount(row?.passengersAffectedTotal ?? 0)} passengers affected that day.` };
  }

  return { ok: true, interpretation, text: `${formatCount(scenario.impactSummary.passengersMisconnected)} passengers misconnected across the loaded scenario.` };
}

// ---------------------------------------------------------------------
// recovery_summary
// ---------------------------------------------------------------------
function recoverySummary(ctx: QAContext): QAAnswer {
  const interpretation = "You asked about the recovery run's savings.";
  const { recovery } = ctx;
  if (!recovery) {
    return { ok: false, interpretation, text: 'No recovery result has been computed for this scenario yet -- click "Compute recovery" first.' };
  }
  const delaySaved = recovery.beforeImpact.totalDelayMin - recovery.afterImpact.totalDelayMin;
  const cancelSaved = recovery.beforeImpact.flightsCancelled - recovery.afterImpact.flightsCancelled;
  const misconnectSaved = recovery.beforeImpact.passengersMisconnected - recovery.afterImpact.passengersMisconnected;
  const s = recovery.recoverySaving;
  return {
    ok: true,
    interpretation,
    text: `${formatUsd(s.typical)} saved (range ${formatUsd(s.low)}–${formatUsd(s.high)}), ${formatMinutes(delaySaved)} less delay, ${formatCount(cancelSaved)} fewer cancellations, ${formatCount(misconnectSaved)} fewer misconnects.`,
  };
}

// ---------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------
export function executeQuery(kind: string, params: QueryParams, ctx: QAContext): QAAnswer {
  if (!isQueryKind(kind)) {
    return {
      ok: false,
      interpretation: "",
      text: `I couldn't map that to something I know how to answer. I can answer about: ${QUERY_KINDS.join(", ")}.`,
    };
  }
  switch (kind) {
    case "carrier_cost":
      return carrierCost(params, ctx);
    case "carrier_ranking":
      return carrierRanking(params, ctx);
    case "airport_impact":
      return airportImpact(params, ctx);
    case "airport_ranking":
      return airportRanking(params, ctx);
    case "day_summary":
      return daySummary(params, ctx);
    case "day_comparison":
      return dayComparison(params, ctx);
    case "scenario_summary":
      return scenarioSummary(ctx);
    case "baseline_comparison":
      return baselineComparison(ctx);
    case "passenger_impact":
      return passengerImpact(params, ctx);
    case "recovery_summary":
      return recoverySummary(ctx);
  }
}
