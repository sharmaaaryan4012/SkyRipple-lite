import type { AirportDaily, CarrierLedgerRow, CostTimeseries, ImpactSummary, LedgerCategoryFigures, Range, SimulationData } from "./types";

/**
 * Fix 1 (clean-slate boot, Option B): the app must NOT auto-load a
 * disruption on startup,  it boots to the NORMAL day, nothing injected,
 * and the user injects the first disruption themselves (chat starters
 * or free text). This module is the ONE place that transform happens.
 *
 * WHERE THE BASELINE DATA COMES FROM: the precomputed ord-runway-closure
 * export already carries a `baseline` side on every flight AND in
 * costTimeseries/ledgerByCarrier (Phase 5's own "expected normal-day
 * operating cost, nothing injected" pair,  see engine/costing.py's own
 * module docstring),  it is NOT specific to the ORD disruption; it's
 * the SAME day-invariant baseline every scenario is diffed against
 * (confirmed by Task A's own investigation: baseline figures don't
 * depend on which disruption got injected). So reading the `.baseline`
 * side of an already-exported precomputed scenario IS "the normal day,"
 * honestly. Calling POST /api/simulate with an EMPTY disruption list
 * was considered and rejected: resolve_disruptions() requires at least
 * one disruption ("at least one disruption is required") -- validated
 * engine-adjacent behavior this task explicitly forbids touching -- so
 * there is no live endpoint that returns a pure no-disruption run.
 *
 * THE TRANSFORM: for every part of a ScenarioData that has a
 * scenario/baseline PAIR, this sets scenario = baseline (literally the
 * same values). That single rule produces every visible boot-state
 * property for free, with no other component touched:
 *   - flights: each leg's OWN `.scenario` side becomes a copy of its
 *     OWN `.baseline` side -- the map/hover/click-panel already always
 *     render `.scenario`, so they show TRUE baseline positions/severity/
 *     passenger figures unchanged, no map code edited. `.baseline` is
 *     also set to the same value (not null) so a click panel's
 *     scenario-vs-baseline CONTRAST section reads as "no difference"
 *     rather than crashing on a missing side.
 *   - costTimeseries: each carrier's `scenario` series becomes its own
 *     `baseline` series -- CostTimeseriesChart draws its normal two
 *     lines (dashed baseline + solid scenario) exactly on top of each
 *     other, reading as ONE real cost-accumulation line (this task's
 *     own "MY LEAN" instruction) with zero chart-component changes.
 *   - ledgerByCarrier / impactSummary: scenario = baseline at every
 *     category means every VARIANCE (scenario - baseline, what
 *     CarrierBreakdownTable/ImpactSummaryCards actually display) is
 *     exactly zero -- "nothing has been disrupted yet," derived
 *     honestly from real numbers rather than hand-typed zeros.
 *   - disruptionMarkers: [] -- nothing injected, no ticks anywhere
 *     (PlaybackControls' "Jump to disruption" list is already
 *     conditioned on `disruptionMarkers.length > 0`, so it disappears
 *     for free too).
 */
export function buildCleanBootState(source: SimulationData): SimulationData {
  const flights = source.flights.map((f) => {
    const baselineSide = f.baseline ?? f.scenario; // every real export has both sides; this fallback only guards a theoretically-missing one, never fabricates a value
    return { ...f, scenario: baselineSide, baseline: baselineSide };
  });

  const costTimeseries: CostTimeseries = {
    ...source.scenario.costTimeseries,
    carriers: Object.fromEntries(
      Object.entries(source.scenario.costTimeseries.carriers).map(([code, series]) => [code, { baseline: series.baseline, scenario: series.baseline }])
    ),
  };

  const zeroRange: Range = { low: 0, typical: 0, high: 0 };
  const collapseToBaseline = (figures: LedgerCategoryFigures): LedgerCategoryFigures => ({
    scenario: figures.baseline,
    baseline: figures.baseline,
    variance: zeroRange,
  });

  const ledgerByCarrier: CarrierLedgerRow[] = source.scenario.ledgerByCarrier.map((row) => ({
    carrierCode: row.carrierCode,
    categories: Object.fromEntries(Object.entries(row.categories).map(([cat, figures]) => [cat, figures ? collapseToBaseline(figures) : figures])),
    total: collapseToBaseline(row.total),
  }));

  const impactSummary: ImpactSummary = {
    asOfMin: source.scenario.impactSummary.asOfMin,
    totalCostUsd: zeroRange,
    totalDelayMin: 0,
    flightsDelayed: 0,
    flightsCancelled: 0,
    flightsDiverted: 0,
    passengersMisconnected: 0,
    crewIllegalities: 0,
    byCarrier: {},
    byAirport: {},
  };

  // Task 8c: airportDaily's cost/delay/cancelled/flights-delayed/
  // passengers-affected figures are ALL disruption-driven (the scenario's
  // own variance) -- zeroed for the same "nothing disrupted yet" reason
  // byCarrier/byAirport are empty above. flightsScheduled* survives
  // unchanged (a structural fact -- how many flights this airport has
  // that day -- independent of any disruption, like startDay/endDay).
  const airportDaily: AirportDaily | undefined = source.scenario.airportDaily
    ? Object.fromEntries(
        Object.entries(source.scenario.airportDaily).map(([day, byIata]) => [
          day,
          Object.fromEntries(
            Object.entries(byIata).map(([iata, s]) => [
              iata,
              {
                costLow: 0,
                costTypical: 0,
                costHigh: 0,
                delayMin: 0,
                cancelled: 0,
                flightsDelayedDeparting: 0,
                flightsScheduledDeparting: s.flightsScheduledDeparting,
                flightsDelayedArriving: 0,
                flightsScheduledArriving: s.flightsScheduledArriving,
                passengersAffected: 0,
              },
            ])
          ),
        ])
      )
    : undefined;

  return {
    flights,
    scenario: {
      meta: {
        scenarioId: "baseline",
        label: "Normal day operations",
        day: source.scenario.meta.day,
        // Task 8b: preserve the source scenario's real date coverage, if
        // any -- a no-op for every pre-8b single-day scenario (both stay
        // undefined, exactly as before), but WITHOUT this, a multi-day
        // scenario's day/week/month toggle would be silently disabled at
        // boot (getCoverage() sees no startDay/endDay and reports single-
        // day) even though the underlying costTimeseries genuinely spans
        // a real range -- these two fields carry no disruption-specific
        // information (unlike everything else this function collapses),
        // so preserving them doesn't compromise the clean-boot guarantee.
        startDay: source.scenario.meta.startDay,
        endDay: source.scenario.meta.endDay,
        disruptionSummary: "No disruption injected yet,  describe one below to begin.",
        sourceRunId: source.scenario.meta.sourceRunId,
        generatedAt: source.scenario.meta.generatedAt,
      },
      costTimeseries,
      disruptionMarkers: [],
      impactSummary,
      ledgerByCarrier,
      airports: source.scenario.airports, // pure identity metadata, no scenario/baseline distinction -- passes through unchanged
      airportDaily,
    },
  };
}
