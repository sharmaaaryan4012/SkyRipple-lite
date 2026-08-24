import type { FlightLeg } from "./types";

/**
 * Inspector Mode (Task 8f), Rotation tab: one tail's own chronological
 * leg timeline for the loaded day, built entirely CLIENT-SIDE from the
 * already-loaded flights.json -- no backend change needed, since every
 * field the tab shows (scheduled/simulated times, delay, cancellation)
 * is already present per-leg.
 *
 * KNOWN GAP (documented, not fixed here): `FlightLeg.tailNumber` is
 * built from the engine's IMMUTABLE `world.flight_leg().tail_number`,
 * never the runtime-mutated `state.tail_of_leg` -- so if the OCC's
 * recovery ever issued a SWAP_TAILS action, this rotation will show the
 * PRE-swap tail assignment, not what actually flew. Filtering by
 * tailNumber is honest for every leg that was NOT touched by a tail
 * swap (the overwhelming majority), and no swap-aware correction is
 * attempted here -- flagged in this task's own spec as a nice-to-have,
 * not core.
 */
export function buildRotation(flights: FlightLeg[], tailNumber: string): FlightLeg[] {
  return flights
    .filter((f) => f.tailNumber === tailNumber)
    .sort((a, b) => {
      const aMin = a.scheduledDepMin ?? Infinity;
      const bMin = b.scheduledDepMin ?? Infinity;
      return aMin - bMin;
    });
}
