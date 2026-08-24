import type { CostTimeseries } from "./types";

export interface Sparkline {
  bucketStartMin: number[];
  values: number[]; // total scenario cost, summed across every carrier, per bucket
}

/**
 * Derives a single system-wide series from the already-loaded
 * cost_timeseries (the SAME data Task 1's dashboard chart plots
 * per-carrier),  no new export, no backend re-run. Summing every
 * carrier's cumulative scenario cost per bucket gives exactly the
 * "flat early, rising through the disruption window" shape the
 * timeline's sparkline needs: the total is monotonic non-decreasing
 * (each carrier's own series already is,  see Phase 5's
 * verify_phase5.py checkpoint 5), so summing preserves that, and the
 * STEEPEST part of the resulting curve is visually exactly where the
 * disruption's cost accumulated fastest.
 */
export function buildCostSparkline(costTimeseries: CostTimeseries): Sparkline {
  const { bucketStartMin, carriers } = costTimeseries;
  const carrierSeries = Object.values(carriers);
  const values = bucketStartMin.map((_, i) => carrierSeries.reduce((sum, c) => sum + (c.scenario[i] ?? 0), 0));
  return { bucketStartMin, values };
}
