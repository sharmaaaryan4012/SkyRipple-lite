/**
 * Task 8c: pure, client-side per-airport aggregation -- the airport
 * layer's own equivalent of Task 8b's bucketByHour/bucketByDay. Reads
 * ONLY already-loaded ScenarioData (flights.json for a single-day
 * scenario, or the server-computed airport-daily.json for a multi-day
 * one -- see scripts/export_frontend_scenario_range.py's own
 * _range_airport_daily docstring for why a multi-day breakdown needs to
 * be computed SERVER-SIDE: flights.json only ever covers one day, even
 * for a multi-day scenario, see that export script's own module
 * docstring). Never re-simulates, never fabricates a number.
 *
 * RECONCILIATION: costUsd here is always impactSummary.byAirport (or
 * airport-daily.json, summed) -- the SAME ledger-grouped-by-airport_iata
 * numbers the backend already computed, guaranteed to sum to the
 * scenario's own totalCostUsd (see those export scripts' own
 * reconciliation proofs). This module never derives cost independently
 * from flights.json (which has no ledger-line-level data to sum).
 */

import type { AirportDaily, AirportDailyStats, DisruptionMarker, FlightLeg, ImpactSummary, Range, SeverityBucket } from "./types";

export interface AirportPanelStats {
  flightsDelayedDeparting: number;
  flightsScheduledDeparting: number;
  flightsDelayedArriving: number;
  flightsScheduledArriving: number;
  passengersAffected: number;
  costUsd: Range;
  delayMin: number;
  cancelled: number;
}

const ZERO_RANGE: Range = { low: 0, typical: 0, high: 0 };

function zeroStats(): AirportPanelStats {
  return {
    flightsDelayedDeparting: 0,
    flightsScheduledDeparting: 0,
    flightsDelayedArriving: 0,
    flightsScheduledArriving: 0,
    passengersAffected: 0,
    costUsd: ZERO_RANGE,
    delayMin: 0,
    cancelled: 0,
  };
}

/**
 * SINGLE-DAY: computed directly from the already-loaded flights.json.
 * passengersAffected = misconnectedOutbound (this airport as the failed
 * connection's ORIGIN leg) + misconnectionsCaused (this airport as the
 * failed connection's DEST/hub leg) -- the SAME per-leg fields Task A's
 * own passenger-enrichment attribution already validated, so this
 * number traces to the identical underlying data the ledger's own
 * MISCONNECT_REBOOK/PASSENGER_DELAY entries use (both keyed by
 * misconnect_hub server-side). Never double-counts: a given misconnect
 * event contributes to exactly one leg's misconnectionsCaused and one
 * (different) leg's misconnectedOutbound.
 */
export function singleDayAirportStats(flights: FlightLeg[], iata: string, impactSummary: ImpactSummary): AirportPanelStats {
  const stats = zeroStats();
  for (const f of flights) {
    if (f.originIata === iata) {
      stats.flightsScheduledDeparting++;
      if ((f.scenario.delayMin ?? 0) > 0) stats.flightsDelayedDeparting++;
      stats.passengersAffected += f.scenario.misconnectedOutbound;
    }
    if (f.destIata === iata) {
      stats.flightsScheduledArriving++;
      if ((f.scenario.delayMin ?? 0) > 0) stats.flightsDelayedArriving++;
      stats.passengersAffected += f.scenario.misconnectionsCaused;
    }
  }
  const airportImpact = impactSummary.byAirport?.[iata];
  stats.costUsd = airportImpact?.costUsd ?? ZERO_RANGE;
  stats.delayMin = airportImpact?.delayMin ?? 0;
  stats.cancelled = airportImpact?.cancelled ?? 0;
  return stats;
}

/** One leg reduced to what the airport panel's flight list shows -- the
 * OTHER end of the leg (destination for a departure row, origin for an
 * arrival row), the time relevant to THIS airport (scheduled/simulated
 * departure for a departure row, arrival for an arrival row), and its
 * outcome. `legId` is kept so a row can drive focus-mode (USMap.tsx's
 * onSelectFlight), same "click through to the real thing" pattern the
 * rest of this map already uses. */
export interface AirportFlightRow {
  legId: string;
  flightNumber: string | null;
  carrierCode: string;
  otherIata: string;
  scheduledMin: number | null;
  simMin: number | null;
  delayMin: number | null;
  severity: SeverityBucket;
  cancelled: boolean;
}

/** SINGLE-DAY only (see this module's own docstring on why flights.json
 * never covers a genuine multi-day range): every flight departing or
 * arriving at `iata`, straight off the already-loaded flights array --
 * no separate fetch, no re-derivation. Sorted by scheduled time so the
 * list reads chronologically, cancelled/schedule-less legs (null
 * scheduledMin) sorting last rather than fabricating a time for them. */
export function airportFlights(flights: FlightLeg[], iata: string): { departures: AirportFlightRow[]; arrivals: AirportFlightRow[] } {
  const departures: AirportFlightRow[] = [];
  const arrivals: AirportFlightRow[] = [];
  for (const f of flights) {
    if (f.originIata === iata) {
      departures.push({
        legId: f.legId,
        flightNumber: f.flightNumber,
        carrierCode: f.carrierCode,
        otherIata: f.destIata,
        scheduledMin: f.scheduledDepMin,
        simMin: f.scenario.simDepMin,
        delayMin: f.scenario.delayMin,
        severity: f.scenario.severity,
        cancelled: f.scenario.cancelled,
      });
    }
    if (f.destIata === iata) {
      arrivals.push({
        legId: f.legId,
        flightNumber: f.flightNumber,
        carrierCode: f.carrierCode,
        otherIata: f.originIata,
        scheduledMin: f.scheduledArrMin,
        simMin: f.scenario.simArrMin,
        delayMin: f.scenario.delayMin,
        severity: f.scenario.severity,
        cancelled: f.scenario.cancelled,
      });
    }
  }
  const byScheduled = (a: AirportFlightRow, b: AirportFlightRow) => (a.scheduledMin ?? Infinity) - (b.scheduledMin ?? Infinity);
  departures.sort(byScheduled);
  arrivals.sort(byScheduled);
  return { departures, arrivals };
}

/** MULTI-DAY: sums airport-daily.json's own per-day entries across
 * exactly the days in the CURRENT VIEW WINDOW (Task 8b) -- "the
 * airport's stats for what you're currently looking at," matching Task
 * 8d's later "download what I'm seeing" rationale. `days` should be
 * ISO date strings ("2025-12-15") within the loaded scenario's own
 * coverage; a day absent from airportDaily (this airport had zero
 * traffic that day) contributes zero, not an error. */
export function multiDayAirportStats(airportDaily: AirportDaily, iata: string, days: string[]): AirportPanelStats {
  const stats = zeroStats();
  let low = 0,
    typical = 0,
    high = 0;
  for (const day of days) {
    const s: AirportDailyStats | undefined = airportDaily[day]?.[iata];
    if (!s) continue;
    stats.flightsDelayedDeparting += s.flightsDelayedDeparting;
    stats.flightsScheduledDeparting += s.flightsScheduledDeparting;
    stats.flightsDelayedArriving += s.flightsDelayedArriving;
    stats.flightsScheduledArriving += s.flightsScheduledArriving;
    stats.passengersAffected += s.passengersAffected;
    stats.delayMin += s.delayMin;
    stats.cancelled += s.cancelled;
    low += s.costLow;
    typical += s.costTypical;
    high += s.costHigh;
  }
  stats.costUsd = { low, typical, high };
  return stats;
}

/** Per-day rows for the multi-day panel's own breakdown table/sparkline
 * -- one row per day in `days`, in order, zero-filled for a day this
 * airport had no traffic. */
export function airportDailyRows(airportDaily: AirportDaily, iata: string, days: string[]): { day: string; stats: AirportDailyStats }[] {
  const zero: AirportDailyStats = {
    costLow: 0,
    costTypical: 0,
    costHigh: 0,
    delayMin: 0,
    cancelled: 0,
    flightsDelayedDeparting: 0,
    flightsScheduledDeparting: 0,
    flightsDelayedArriving: 0,
    flightsScheduledArriving: 0,
    passengersAffected: 0,
  };
  return days.map((day) => ({ day, stats: airportDaily[day]?.[iata] ?? zero }));
}

// ---------------------------------------------------------------------
// AFFECTED vs UNAFFECTED
// ---------------------------------------------------------------------

/** An airport is AFFECTED iff it has an actual disruption injected at it
 * (e.g. ORD's own runway closure) -- NOT merely because cascading
 * spillover pushed its cost/delay stats above some threshold. An earlier
 * version also flagged spillover-crossing airports as AFFECTED; in a
 * multi-day cascade that lit up dozens of airports red at once (spillover
 * ripples everywhere), which is exactly the "over-highlighted, precious
 * signal budget spent" failure this task was told to avoid. The red
 * pulsing treatment is reserved for "a disruption happened HERE" --
 * every other airport (however much spillover it absorbed) is a plain
 * circle; its own stats are still available in its click panel. */
export function isAirportAffected(iata: string, disruptionMarkers: DisruptionMarker[]): boolean {
  return disruptionMarkers.some((m) => m.airportIata === iata);
}
