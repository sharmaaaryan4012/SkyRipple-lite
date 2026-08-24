/**
 * Task 8d: pick-your-columns CSV export -- four separate grains (never
 * mixed in one file), each a pure function over data this app has
 * ALREADY loaded (ScenarioData + flights.json + the current view
 * window). No re-simulation, no new backend endpoint: every number here
 * traces to a field lib/types.ts already defines, read straight off the
 * scenario/flights the dashboard is already rendering.
 *
 * SCOPE = the current view window (lib/viewWindowContext.tsx's
 * `window`), matching this task's own "download what I'm seeing"
 * requirement -- see each grain's own row-builder for exactly how that
 * scope is applied, and its own comment for any field that can't
 * honestly be window-scoped (flights.json only ever covers ONE
 * calendar day even inside a multi-day scenario -- see
 * scripts/export_frontend_scenario_range.py's own docstring -- and the
 * carrier ledger breakdown/impact totals were only ever computed as a
 * SCENARIO-TOTAL, with no per-window slice available client-side). Any
 * such column is suffixed `ScenarioTotal` so a reader never mistakes it
 * for a window-scoped figure.
 */

import type { AirportMeta, CarrierLedgerRow, CostTimeseries, FlightLeg, ImpactSummary, ScenarioData } from "./types";
import { multiDayAirportStats, singleDayAirportStats, type AirportPanelStats } from "./airportAggregation";
import { dayOptions, dayToGlobalMin, type Coverage, type ViewWindow } from "./viewScale";
import { windowedCumulative } from "./timeAggregation";

export type ExportGrain = "flight" | "airport" | "carrier" | "day";

export const GRAIN_LABELS: Record<ExportGrain, string> = {
  flight: "Per-flight",
  airport: "Per-airport",
  carrier: "Per-carrier",
  day: "Per-day",
};

export interface ColumnDef<T> {
  id: string;
  label: string;
  get: (row: T) => string | number | boolean | null;
}

function csvCell(v: string | number | boolean | null): string {
  if (v === null) return "";
  const s = typeof v === "string" ? v : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Renders exactly the SELECTED columns, in `columns`' own order --
 * never all of them, so a user unchecking a column removes it from the
 * file entirely rather than leaving it blank. */
export function rowsToCsv<T>(columns: ColumnDef<T>[], selectedIds: Set<string>, rows: T[]): string {
  const cols = columns.filter((c) => selectedIds.has(c.id));
  const header = cols.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) => cols.map((c) => csvCell(c.get(row))).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------
// PER-FLIGHT
// ---------------------------------------------------------------------

export interface FlightRow {
  leg: FlightLeg;
}

export const FLIGHT_COLUMNS: ColumnDef<FlightRow>[] = [
  { id: "legId", label: "legId", get: (r) => r.leg.legId },
  { id: "flightNumber", label: "flightNumber", get: (r) => r.leg.flightNumber },
  { id: "carrierCode", label: "carrierCode", get: (r) => r.leg.carrierCode },
  { id: "originIata", label: "originIata", get: (r) => r.leg.originIata },
  { id: "destIata", label: "destIata", get: (r) => r.leg.destIata },
  { id: "tailNumber", label: "tailNumber", get: (r) => r.leg.tailNumber },
  { id: "aircraftType", label: "aircraftType", get: (r) => r.leg.aircraftType },
  { id: "scheduledDepMin", label: "scheduledDepMin", get: (r) => r.leg.scheduledDepMin },
  { id: "scheduledArrMin", label: "scheduledArrMin", get: (r) => r.leg.scheduledArrMin },
  { id: "passengersOnBoard", label: "passengersOnBoard", get: (r) => r.leg.passengersOnBoard },
  { id: "connectingPassengers", label: "connectingPassengers", get: (r) => r.leg.connectingPassengers },
  { id: "scenarioSimDepMin", label: "scenarioSimDepMin", get: (r) => r.leg.scenario.simDepMin },
  { id: "scenarioSimArrMin", label: "scenarioSimArrMin", get: (r) => r.leg.scenario.simArrMin },
  { id: "scenarioDelayMin", label: "scenarioDelayMin", get: (r) => r.leg.scenario.delayMin },
  { id: "scenarioSeverity", label: "scenarioSeverity", get: (r) => r.leg.scenario.severity },
  { id: "scenarioCancelled", label: "scenarioCancelled", get: (r) => r.leg.scenario.cancelled },
  { id: "misconnectionsCaused", label: "misconnectionsCaused", get: (r) => r.leg.scenario.misconnectionsCaused },
  { id: "misconnectedOutbound", label: "misconnectedOutbound", get: (r) => r.leg.scenario.misconnectedOutbound },
  { id: "misconnectCausedPct", label: "misconnectCausedPct", get: (r) => r.leg.scenario.misconnectCausedPct },
  // "Partial" is honest, not decorative -- see FlightLegSide.directCostUsd's own
  // docstring in lib/types.ts: this EXCLUDES misconnect-driven cost, which the
  // backend can't cleanly pin to one leg.
  { id: "scenarioDirectCostLowPartial", label: "scenarioDirectCostLowPartial", get: (r) => r.leg.scenario.directCostUsd?.low ?? null },
  { id: "scenarioDirectCostTypicalPartial", label: "scenarioDirectCostTypicalPartial", get: (r) => r.leg.scenario.directCostUsd?.typical ?? null },
  { id: "scenarioDirectCostHighPartial", label: "scenarioDirectCostHighPartial", get: (r) => r.leg.scenario.directCostUsd?.high ?? null },
  { id: "baselineSimDepMin", label: "baselineSimDepMin", get: (r) => r.leg.baseline?.simDepMin ?? null },
  { id: "baselineSimArrMin", label: "baselineSimArrMin", get: (r) => r.leg.baseline?.simArrMin ?? null },
  { id: "baselineDelayMin", label: "baselineDelayMin", get: (r) => r.leg.baseline?.delayMin ?? null },
  { id: "baselineSeverity", label: "baselineSeverity", get: (r) => r.leg.baseline?.severity ?? null },
];

/** flights.json covers exactly ONE calendar day even for a multi-day
 * scenario, and (unlike costTimeseries/disruptionMarkers) its own
 * scheduledDepMin/simDepMin are NEVER rebased onto the scenario's global
 * axis -- they're copied unchanged from the single-day export (see
 * scripts/export_frontend_scenario_range.py's own "flights.json: copied
 * unchanged" comment) and stay on THAT day's own local 0-at-midnight
 * axis. Critically, `meta.day` does NOT reliably name which calendar day
 * this is for a range export -- it's set to the range's own start_day
 * (see that script's own meta construction), which is unrelated to
 * whichever single-day scenario flights.json was copied from. There is
 * no field anywhere in the exported JSON that names the real day.
 *
 * Given that, the only ground truth available is the SAME one the map
 * (USMap.tsx's inAirFlights) already uses for this same data: flight
 * minutes are compared directly against the view window's own
 * [startMin, endMin), exactly as if they sat on the global axis. This
 * mirrors the app's existing (if imperfect) convention rather than
 * inventing a second, inconsistent one here -- flights surface exactly
 * when the window overlaps the scenario's own first 24 hours (global
 * minute 0-1440, wherever flights.json's local axis lands once placed at
 * the window's start), and honestly show zero otherwise. */
export function flightRows(flights: FlightLeg[], window: ViewWindow): FlightRow[] {
  return flights.filter((f) => f.scheduledDepMin != null && f.scheduledDepMin >= window.startMin && f.scheduledDepMin < window.endMin).map((leg) => ({ leg }));
}

// ---------------------------------------------------------------------
// PER-AIRPORT (Task 8c)
// ---------------------------------------------------------------------

export interface AirportRow {
  airport: AirportMeta;
  stats: AirportPanelStats;
}

export const AIRPORT_COLUMNS: ColumnDef<AirportRow>[] = [
  { id: "iata", label: "iata", get: (r) => r.airport.iata },
  { id: "name", label: "name", get: (r) => r.airport.name },
  { id: "cityName", label: "cityName", get: (r) => r.airport.cityName },
  { id: "stateAbbr", label: "stateAbbr", get: (r) => r.airport.stateAbbr },
  { id: "costUsdLow", label: "costUsdLow", get: (r) => r.stats.costUsd.low },
  { id: "costUsdTypical", label: "costUsdTypical", get: (r) => r.stats.costUsd.typical },
  { id: "costUsdHigh", label: "costUsdHigh", get: (r) => r.stats.costUsd.high },
  { id: "delayMin", label: "delayMin", get: (r) => r.stats.delayMin },
  { id: "cancelled", label: "cancelled", get: (r) => r.stats.cancelled },
  { id: "flightsDelayedDeparting", label: "flightsDelayedDeparting", get: (r) => r.stats.flightsDelayedDeparting },
  { id: "flightsScheduledDeparting", label: "flightsScheduledDeparting", get: (r) => r.stats.flightsScheduledDeparting },
  { id: "flightsDelayedArriving", label: "flightsDelayedArriving", get: (r) => r.stats.flightsDelayedArriving },
  { id: "flightsScheduledArriving", label: "flightsScheduledArriving", get: (r) => r.stats.flightsScheduledArriving },
  { id: "passengersAffected", label: "passengersAffected", get: (r) => r.stats.passengersAffected },
];

/** Reuses the SAME aggregation the airport click-panel already renders
 * (lib/airportAggregation.ts) -- summed over exactly the days in the
 * CURRENT view window for a multi-day scenario, or the single loaded
 * day otherwise. Never a separate/independent computation. */
export function airportRows(scenario: ScenarioData, flights: FlightLeg[], window: ViewWindow, multiDay: boolean): AirportRow[] {
  const viewDays = multiDay ? dayOptions({ startDay: window.startDay, endDay: window.endDay }) : [];
  return scenario.airports.map((airport) => ({
    airport,
    stats: multiDay ? multiDayAirportStats(scenario.airportDaily ?? {}, airport.iata, viewDays) : singleDayAirportStats(flights, airport.iata, scenario.impactSummary),
  }));
}

// ---------------------------------------------------------------------
// PER-CARRIER
// ---------------------------------------------------------------------

export interface CarrierRow {
  carrierCode: string;
  costUsdTypicalWindow: number;
  ledgerRow: CarrierLedgerRow | undefined;
  impact: ImpactSummary["byCarrier"][string] | undefined;
}

export const CARRIER_COLUMNS: ColumnDef<CarrierRow>[] = [
  { id: "carrierCode", label: "carrierCode", get: (r) => r.carrierCode },
  { id: "costUsdTypicalWindow", label: "costUsdTypicalWindow", get: (r) => Math.round(r.costUsdTypicalWindow * 100) / 100 },
  // ScenarioTotal: the ledger's category breakdown/range bands and the
  // impact summary's delay/cancelled counts were only ever computed as
  // ONE scenario-wide total (no per-window slice exists client-side --
  // see this module's own docstring) -- suffixed so this never reads as
  // window-scoped like costUsdTypicalWindow above.
  { id: "costUsdLowScenarioTotal", label: "costUsdLowScenarioTotal", get: (r) => r.ledgerRow?.total.variance.low ?? null },
  { id: "costUsdTypicalScenarioTotal", label: "costUsdTypicalScenarioTotal", get: (r) => r.ledgerRow?.total.variance.typical ?? null },
  { id: "costUsdHighScenarioTotal", label: "costUsdHighScenarioTotal", get: (r) => r.ledgerRow?.total.variance.high ?? null },
  { id: "delayMinScenarioTotal", label: "delayMinScenarioTotal", get: (r) => r.impact?.delayMin ?? null },
  { id: "cancelledScenarioTotal", label: "cancelledScenarioTotal", get: (r) => r.impact?.cancelled ?? null },
];

/** costUsdTypicalWindow is the one genuinely window-scoped figure here:
 * the SAME windowedCumulative() 8b's own chart/scrubber use, differenced
 * at the window's own end (scenario minus baseline, both already
 * re-baselined to 0 at the window start by that function). */
export function carrierRows(scenario: ScenarioData, costTimeseries: CostTimeseries, window: ViewWindow): CarrierRow[] {
  const windowed = windowedCumulative(costTimeseries, window.startMin, window.endMin);
  const codes = new Set<string>([...Object.keys(costTimeseries.carriers), ...scenario.ledgerByCarrier.map((r) => r.carrierCode)]);
  return Array.from(codes)
    .sort()
    .map((carrierCode) => {
      const series = windowed.carriers[carrierCode];
      const last = series ? series.scenario.length - 1 : -1;
      const costUsdTypicalWindow = last >= 0 ? (series.scenario[last] ?? 0) - (series.baseline[last] ?? 0) : 0;
      return {
        carrierCode,
        costUsdTypicalWindow,
        ledgerRow: scenario.ledgerByCarrier.find((r) => r.carrierCode === carrierCode),
        impact: scenario.impactSummary.byCarrier[carrierCode],
      };
    });
}

// ---------------------------------------------------------------------
// PER-DAY (multi-day scenarios only)
// ---------------------------------------------------------------------

export interface DayRow {
  day: string;
  costUsdTypical: number;
  delayMinTotal: number;
  cancelledTotal: number;
  flightsScheduledTotal: number;
  flightsDelayedDepartingTotal: number;
  flightsDelayedArrivingTotal: number;
  passengersAffectedTotal: number;
}

export const DAY_COLUMNS: ColumnDef<DayRow>[] = [
  { id: "day", label: "day", get: (r) => r.day },
  { id: "costUsdTypical", label: "costUsdTypical", get: (r) => Math.round(r.costUsdTypical * 100) / 100 },
  { id: "delayMinTotal", label: "delayMinTotal", get: (r) => r.delayMinTotal },
  { id: "cancelledTotal", label: "cancelledTotal", get: (r) => r.cancelledTotal },
  { id: "flightsScheduledTotal", label: "flightsScheduledTotal", get: (r) => r.flightsScheduledTotal },
  { id: "flightsDelayedDepartingTotal", label: "flightsDelayedDepartingTotal", get: (r) => r.flightsDelayedDepartingTotal },
  { id: "flightsDelayedArrivingTotal", label: "flightsDelayedArrivingTotal", get: (r) => r.flightsDelayedArrivingTotal },
  { id: "passengersAffectedTotal", label: "passengersAffectedTotal", get: (r) => r.passengersAffectedTotal },
];

/** One row per calendar day in the current view window. Cost is derived
 * via windowedCumulative() sliced to exactly that day's own [midnight,
 * midnight+1440) span -- the same telescoping-sum technique (and the
 * same function) 8b's own bucket-sum-correctness checks already verify,
 * so a day bucket here is provably the sum of its own minute deltas, not
 * a separate re-aggregation. The other fields sum airport-daily.json
 * across every airport for that day (each flight is attributed to
 * exactly one origin airport there, so summing never double-counts --
 * see scripts/export_frontend_scenario_range.py's own
 * _range_airport_daily docstring). */
export function dayRows(scenario: ScenarioData, costTimeseries: CostTimeseries, coverage: Coverage, window: ViewWindow): DayRow[] {
  const days = dayOptions({ startDay: window.startDay, endDay: window.endDay });
  const airportDaily = scenario.airportDaily ?? {};
  return days.map((day) => {
    const start = dayToGlobalMin(coverage, day);
    const windowed = windowedCumulative(costTimeseries, start, start + 1440);
    let costUsdTypical = 0;
    for (const series of Object.values(windowed.carriers)) {
      const last = series.scenario.length - 1;
      costUsdTypical += (series.scenario[last] ?? 0) - (series.baseline[last] ?? 0);
    }
    const byAirport = airportDaily[day] ?? {};
    let delayMinTotal = 0,
      cancelledTotal = 0,
      flightsScheduledTotal = 0,
      flightsDelayedDepartingTotal = 0,
      flightsDelayedArrivingTotal = 0,
      passengersAffectedTotal = 0;
    for (const s of Object.values(byAirport)) {
      delayMinTotal += s.delayMin;
      cancelledTotal += s.cancelled;
      flightsScheduledTotal += s.flightsScheduledDeparting;
      flightsDelayedDepartingTotal += s.flightsDelayedDeparting;
      flightsDelayedArrivingTotal += s.flightsDelayedArriving;
      passengersAffectedTotal += s.passengersAffected;
    }
    return { day, costUsdTypical, delayMinTotal, cancelledTotal, flightsScheduledTotal, flightsDelayedDepartingTotal, flightsDelayedArrivingTotal, passengersAffectedTotal };
  });
}

// ---------------------------------------------------------------------
// Scope label / filenames
// ---------------------------------------------------------------------

/** "dec15-17" style scope tag for a filename -- derived from the
 * window's own startDay/endDay (both inclusive calendar dates), never
 * fabricated independently of it. Drops the repeated month abbreviation
 * when start/end fall in the same month ("dec15-17", not "dec15-dec17");
 * keeps both when they don't ("dec29-jan2"). */
export function scopeTag(window: ViewWindow): string {
  const monthAbbr = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toLowerCase();
  const dayNum = (iso: string) => parseInt(iso.slice(8, 10), 10);
  const startTag = `${monthAbbr(window.startDay)}${dayNum(window.startDay)}`;
  if (window.startDay === window.endDay) return startTag;
  const sameMonth = window.startDay.slice(0, 7) === window.endDay.slice(0, 7);
  const endTag = sameMonth ? `${dayNum(window.endDay)}` : `${monthAbbr(window.endDay)}${dayNum(window.endDay)}`;
  return `${startTag}-${endTag}`;
}

export function exportFilename(scenarioId: string, grain: ExportGrain, window: ViewWindow): string {
  return `skyripple_${grain === "day" ? "perday" : `per${grain}`}_${scopeTag(window)}.csv`;
}
