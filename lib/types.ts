/**
 * Types for the CLEAN, camelCase JSON this frontend actually reads from
 * public/scenarios/<scenario>/,  written by scripts/export_frontend_scenario.py.
 * They intentionally do NOT match the backend's raw snake_case artifacts
 * (cost_timeseries.json, impact_snapshot.json, ledger_by_carrier.csv,
 * disruption_markers.csv) byte-for-byte,  the export script reshapes those
 * into exactly this contract. If you add a field here, add it to the
 * export script's output too (and vice versa); nothing enforces the two
 * stay in sync automatically.
 */

/** A dollar (or minute) figure the backend never collapses to one number. */
export interface Range {
  low: number;
  typical: number;
  high: number;
}

export interface ScenarioMeta {
  scenarioId: string;
  label: string;
  day: string; // "2025-12-15"
  /**
   * Task 8b: the scenario's real date coverage, "2025-12-01".."2025-12-31"
   * style. BOTH present means this scenario supports the day/week/month
   * view toggle across that span; EITHER absent means a single-day
   * scenario (pre-8b shape) -- the toggle then only offers DAY view,
   * pinned to `day`, byte-identical to pre-8b behavior. Never fabricate
   * these from `day` alone -- absence is the signal that only one day of
   * data actually exists (see web/lib/viewScale.ts's own docstring).
   */
  startDay?: string;
  endDay?: string;
  /**
   * Inspector Mode (Task 8f) / multi-day flights.json gap: for a
   * multi-day (startDay !== endDay) scenario, flights.json's per-leg
   * records only ever cover ONE real calendar day within the range
   * (building genuine per-leg data for every day of a month is a much
   * larger, separate scope -- see export_frontend_scenario_range.py's
   * own docstring). This is THAT day, distinct from `day`/`startDay`
   * (which describe the range's own framing, not what flights.json
   * covers) -- absent for a single-day scenario, where `day` itself
   * already IS the answer.
   */
  flightsDetailDay?: string;
  disruptionSummary: string; // human label of the injected disruption(s)
  sourceRunId: string; // backend data/runs/<run_id> this was exported from
  generatedAt: string; // ISO timestamp of the export
  /**
   * Inspector Mode (Task 8f): the always-visible, non-gated data-
   * provenance line's own real counts -- a live COUNT(*) against the
   * actual database this scenario was built from, never a hardcoded
   * frontend constant. Optional because pre-8f scenarios (already on
   * disk, not yet re-exported) simply don't have it -- absence means
   * "don't show a provenance line," never "show zero."
   */
  recordCounts?: {
    flightLegCount: number;
    airportCount: number;
    ourAirportsRecordCount: number | null;
  };
}

/**
 * Per-carrier cumulative cost over the simulated day, for BOTH the
 * expected-normal baseline (reproduce mode, nothing injected) and the
 * injected scenario. Both arrays are the same length as bucketStartMin
 * and are cumulative (monotonic non-decreasing),  see Phase 5's
 * verify_phase5.py checkpoint 5.
 */
export interface CarrierTimeseries {
  baseline: number[];
  scenario: number[];
}

export interface CostTimeseries {
  bucketMinutes: number; // width of each bucket, e.g. 60
  bucketStartMin: number[]; // x-axis: minute-of-day each bucket starts at
  carriers: Record<string, CarrierTimeseries>; // keyed by carrier code, e.g. "AA"
}

export interface DisruptionMarker {
  id: string;
  kind: string; // e.g. "close_runway"
  simMin: number; // where on the timeline this disruption started
  label: string; // human-readable description
  airportIata: string | null; // null for disruption kinds not anchored to an airport (e.g. a grounded tail)
  airportLat: number | null;
  airportLon: number | null;
  marginalCost: Range;
}

/**
 * Task 8b, MONTH view: one calendar day's worth of disruption markers,
 * clustered into a single point on the timeline (a day with 3 markers
 * shows one dot labelled "3"; hover reveals each one). Built client-side
 * (web/lib/timeAggregation.ts::clusterMarkersByDay) from the same
 * DisruptionMarker[] day/week view renders individually -- never a
 * separate export.
 */
export interface ClusteredDisruptionMarker {
  dayStartMin: number; // this day's own bucket-start minute, on the same global axis as simMin
  markers: DisruptionMarker[]; // every marker whose simMin falls in this day, in simMin order
}

export interface CarrierImpact {
  costUsd: Range;
  delayMin: number;
  cancelled: number;
}

export interface ImpactSummary {
  asOfMin: number;
  totalCostUsd: Range; // NOTE: backend's total_cost_usd is typical-only today (see loadScenario.ts)
  totalDelayMin: number;
  flightsDelayed: number;
  flightsCancelled: number;
  flightsDiverted: number;
  passengersMisconnected: number;
  crewIllegalities: number;
  byCarrier: Record<string, CarrierImpact>;
  /**
   * Task 8c: per-airport scenario-vs-baseline variance, same shape/
   * source discipline as byCarrier (a real ledger-grouped delta, never
   * fabricated) -- keyed by IATA. Optional: absent for any scenario
   * exported before this field existed (never fabricate it from
   * nothing -- see web/lib/airportAggregation.ts's own docstring for
   * how callers must handle its absence).
   */
  byAirport?: Record<string, CarrierImpact>;
}

/**
 * Task 8c: one airport's reference identity -- IATA/name/city/state/
 * coordinates, read from aviation.db + the OurAirports source reference
 * (scripts/scenario_reshape.py's load_airport_meta) for every airport
 * with scenario traffic (i.e. every key impact-summary.json's byAirport
 * has). Fetched once per scenario via airports.json, alongside the
 * other ScenarioData files.
 */
export interface AirportMeta {
  iata: string;
  name: string;
  cityName: string;
  stateAbbr: string;
  lat: number | null;
  lon: number | null;
}

/**
 * Task 8c, multi-day scenarios only: one day's own stats at one airport
 * -- the airport panel's per-day breakdown section. Absent entirely
 * (airport-daily.json simply doesn't exist) for a single-day scenario,
 * whose per-day breakdown isn't meaningful -- the panel computes its
 * "flights delayed"/"passengers affected" numbers straight from the
 * already-loaded single day of flights.json instead (see
 * web/lib/airportAggregation.ts).
 */
export interface AirportDailyStats {
  costLow: number;
  costTypical: number;
  costHigh: number;
  delayMin: number;
  cancelled: number;
  flightsDelayedDeparting: number;
  flightsScheduledDeparting: number;
  flightsDelayedArriving: number;
  flightsScheduledArriving: number;
  passengersAffected: number;
}

/** iata -> day ("2025-12-15") -> that day's own AirportDailyStats. */
export type AirportDaily = Record<string, Record<string, AirportDailyStats>>;

/** One cost category's scenario / baseline / variance, each a full Range. */
export interface LedgerCategoryFigures {
  scenario: Range;
  baseline: Range;
  variance: Range; // scenario - baseline; the disruption's own marginal effect
}

export const LEDGER_CATEGORIES = [
  "aircraft_operating",
  "passenger_delay",
  "misconnect_rebook",
  "cancellation",
  "crew_reserve_callout",
] as const;

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export interface CarrierLedgerRow {
  carrierCode: string;
  categories: Partial<Record<LedgerCategory, LedgerCategoryFigures>>;
  total: LedgerCategoryFigures; // the backend's ALL_CATEGORIES row
}

/** Everything loadScenario() resolves for one scenario, ready to render. */
export interface ScenarioData {
  meta: ScenarioMeta;
  costTimeseries: CostTimeseries;
  disruptionMarkers: DisruptionMarker[];
  impactSummary: ImpactSummary;
  ledgerByCarrier: CarrierLedgerRow[];
  /** Task 8c: every airport with scenario traffic. Empty array for any
   * scenario exported before this field existed (loadScenario.ts
   * defaults a missing/404 airports.json to [], never fabricates
   * entries) -- the airport layer simply renders nothing for such a
   * scenario, same "absence is the signal" discipline as ScenarioMeta's
   * startDay/endDay in Task 8b. */
  airports: AirportMeta[];
  /** Task 8c, multi-day only: per-day per-airport breakdown. undefined
   * when airport-daily.json doesn't exist (single-day scenarios, or any
   * scenario exported before this field existed). */
  airportDaily?: AirportDaily;
}

// ---------------------------------------------------------------------
// Phase 7 Task 2 (the map): flights.json,  NOT part of ScenarioData /
// loadScenario() above. It's fetched separately (see lib/loadFlights.ts)
// because it's an order of magnitude larger than everything else
// combined (~19K flights) and only the map needs it,  bundling it into
// the dashboard's load would slow down a surface that never uses it.
// ---------------------------------------------------------------------

export type SeverityBucket = "on_time" | "minor" | "moderate" | "severe" | "cancelled" | "unresolved";

/** One run's worth of a flight's timing/outcome,  either the injected
 * scenario or the expected-normal baseline (see FlightLeg.baseline).
 *
 * Task A (map overhaul, per-flight enrichment) additions,  see
 * scripts/scenario_reshape.py's attribute_misconnects_to_legs() for the
 * full attribution rule this implements:
 *   - misconnectionsCaused: passengers who missed their onward connection
 *     BECAUSE this leg was late/cancelled/gate-deadlocked (this leg is
 *     the INBOUND leg of the failed connection). The number that matters
 *     when a user clicks the delayed/disrupted flight.
 *   - misconnectedOutbound: passengers booked ON this leg who never
 *     boarded because THEIR inbound leg failed (this leg is the
 *     OUTBOUND leg of the failed connection). Kept separate from
 *     misconnectionsCaused,  summing either field alone across every
 *     flight never double-counts a passenger (see the Python docstring).
 *   - misconnectCausedPct: misconnectionsCaused / connectingPassengers
 *     * 100 (see FlightLeg.connectingPassengers), or null where
 *     connectingPassengers is 0 (nothing to misconnect FROM this leg).
 *   - directCostUsd: this leg's OWN direct cost contribution,  PARTIAL,
 *     not the flight's full disruption cost. Includes aircraft-operating/
 *     cancellation/crew-reserve-callout/non-misconnected-passenger-delay
 *     costs (all cleanly leg-attributable); EXCLUDES misconnect-driven
 *     costs (rebooking + misconnected-passenger delay), which the
 *     backend can't cleanly pin to one leg,  see build_leg_direct_cost()'s
 *     own docstring. A leg with zero tracked-category cost (e.g. an
 *     on-time flight,  aircraft_operating only posts when delayed) is a
 *     real {0,0,0}, not null; null would only appear if a caller omitted
 *     leg-cost enrichment entirely (doesn't happen in this app). */
export interface FlightLegSide {
  simDepMin: number | null; // null iff cancelled, or never departed before the run ended
  simArrMin: number | null; // null iff cancelled, unresolved, or still airborne isn't possible here,  this is a completed replay, so null means it never landed in this run
  delayMin: number | null; // simArrMin - scheduledArrMin; null wherever simArrMin is null
  severity: SeverityBucket;
  cancelled: boolean;
  misconnectionsCaused: number;
  misconnectedOutbound: number;
  misconnectCausedPct: number | null;
  directCostUsd: Range | null;
  /**
   * Inspector Mode (Task 8f): already computed by the engine, just never
   * surfaced before this task. `primaryDelayMin` is always 0 in every
   * export this app produces (the pipeline always runs in "clean" mode,
   * where primary_delay_min() returns 0 by design) -- kept here for
   * completeness/honesty rather than omitted, but the Rotation tab's own
   * "delay inheritance" UI reads `reactionaryDelayMin`, the only
   * meaningful one of the two in this app.
   */
  crewIllegal: boolean;
  crewResolution: string;
  primaryDelayMin: number | null;
  reactionaryDelayMin: number | null;
  gateWaitMin: number | null;
}

export interface FlightLeg {
  legId: string;
  /** e.g. "UA1234",  carrier code + flight number, human-identifying
   * (distinguishes same-carrier flights in nearby slots). Null only if
   * the backend's DB-sourced identity lookup somehow has no row for this
   * leg_id (shouldn't happen for real data). */
  flightNumber: string | null;
  carrierCode: string;
  originIata: string;
  destIata: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  scheduledDepMin: number | null; // null for the small number of BTS-source-cancelled legs with no recorded schedule at all
  scheduledArrMin: number | null;
  tailNumber: string | null;
  /** e.g. "BOEING 777-222" (manufacturer + model), or null if this leg's
   * tail isn't resolvable to an aircraft type. */
  aircraftType: string | null;
  /** Structural passenger counts,  IDENTICAL for scenario and baseline
   * by construction (bookings/itineraries/connections are input data,
   * independent of which state got simulated), so surfaced ONCE here
   * rather than duplicated under both `scenario` and `baseline`. */
  passengersOnBoard: number;
  connectingPassengers: number;
  scenario: FlightLegSide;
  baseline: FlightLegSide | null; // null only if this leg_id is somehow absent from the baseline run (shouldn't happen,  same schedule underlies both)
  /**
   * Inspector Mode (Task 8f): static crew-reference facts (from the
   * schedule-generation parquet, not simulation output) plus this leg's
   * own computed duty/flight-time-so-far clocks -- null iff this leg_id
   * has no crew reference entry at all (never fabricated as a
   * placeholder). Same for both scenario and baseline sides by
   * construction (crew ASSIGNMENT is input data, like passenger
   * bookings above) -- surfaced once at the top level.
   */
  crew: {
    dutyId: string;
    reportMin: number;
    releaseMin: number;
    maxFdpMin: number;
    roleCounts: { captain: number; firstOfficer: number; flightAttendant: number };
    dutyTimeSoFarMin: number | null;
    flightTimeSoFarMin: number | null;
  } | null;
}

export interface FlightsData {
  severityThresholdsMin: { minor: number; moderate: number; severe: number };
  flights: FlightLeg[];
}

// ---------------------------------------------------------------------
// Phase 7 Task 5c: the live backend. `SimulationData` is what
// SimulationProvider hands its children regardless of where it came from
// (a precomputed fetch or a live POST response) -- see
// components/SimulationProvider.tsx and lib/activeResult.ts.
// ---------------------------------------------------------------------

/** Everything one loaded scenario needs to render, assembled either from
 * public/scenarios/<slug>/*.json (precomputed) or directly from a live
 * /api/simulate|/api/parse-and-simulate response body (in memory, no
 * fetch) -- both shapes are IDENTICAL because the backend guarantees it
 * (see api/engine_bridge.py's _reshape_result, which is the same
 * scripts/scenario_reshape.py the precomputed export script uses). */
export interface SimulationData {
  flights: FlightLeg[];
  scenario: ScenarioData;
}

/** The backend's OWN {kind, target, params} wire shape (engine/disruption.py's
 * DisruptionKind + _TARGET_KIND_FOR_DISRUPTION + _REQUIRED_PARAMS vocabulary,
 * snake_case because that's literally the JSON the backend's Pydantic models
 * expect -- see api/main.py's DisruptionRequest). Kept snake_case
 * deliberately, unlike the rest of this file's camelCase convention, for the
 * same reason lib/scenarioRegistry.ts's DisruptionIntent.params already is:
 * it's not a rendering type, it's the literal backend contract. Used to
 * re-POST an already-simulated scenario's disruptions to /api/recovery. */
export interface BackendDisruptionTarget {
  leg_id?: string | null;
  carrier_code?: string | null;
  flight_number?: number | null;
  fl_date?: string | null;
  tail_number?: string | null;
  airport_iata?: string | null;
}

export interface BackendDisruptionRequest {
  kind: string;
  target: BackendDisruptionTarget;
  params: Record<string, number>;
}
