/**
 * Task 8b: pure, client-side time-bucket aggregation over an already-
 * exported CostTimeseries. Every function here reads its input, never
 * mutates it, and returns a brand-new CostTimeseries -- reused by both
 * CostTimeseriesChart (the graph) and TimelineScrubber (the scrubber),
 * so the two always agree on exactly what a given view scale shows.
 *
 * ASSUMPTION (holds for every scenario this app loads, precomputed or
 * live): `source.bucketStartMin` is a UNIFORM grid starting at 0, step
 * `source.bucketMinutes` -- i.e. bucketStartMin[i] === i * bucketMinutes.
 * scripts/export_frontend_scenario.py and scripts/export_frontend_
 * scenario_range.py both guarantee this (a full, unbroken bucket run,
 * no gaps) -- if it ever didn't hold, cumulativeAt() below would need a
 * real binary search instead of direct index arithmetic.
 *
 * BUCKET-SUM CORRECTNESS (why this is provably correct, not just
 * visually plausible -- see this project's own verify suite): every
 * carrier's baseline/scenario series is CUMULATIVE. A coarser bucket's
 * TOTAL is therefore cumulativeAt(bucketEnd) - cumulativeAt(bucketStart)
 * -- a telescoping sum of every finer-grained delta in between, by
 * elementary arithmetic. bucketByWidth() computes every coarse bucket
 * this same way directly against the SOURCE's own fine-grained series,
 * so an hour bucket in week view is, by construction, exactly the sum
 * of its 60 constituent minute buckets -- never a separate, potentially-
 * drifting re-aggregation.
 */

import type { CarrierTimeseries, CostTimeseries, DisruptionMarker, ClusteredDisruptionMarker } from "./types";

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** The cumulative value effective AT minute `targetMin` on `source`'s
 * own axis (i.e. total cost accrued through the end of the fine bucket
 * immediately preceding `targetMin`). 0 before the source's first
 * bucket; clamped to the last known value past its end. */
function cumulativeAt(source: CostTimeseries, series: number[], targetMin: number): number {
  const base = source.bucketStartMin[0] ?? 0;
  const step = source.bucketMinutes;
  const idx = Math.round((targetMin - base) / step) - 1;
  if (idx < 0) return 0;
  if (idx >= series.length) return series[series.length - 1] ?? 0;
  return series[idx];
}

/** The index of the fine bucket whose OWN start is exactly `targetMin`
 * (clamped to the array's bounds) -- for slicing, not for cumulative
 * differencing (see cumulativeAt above for that). */
function indexAt(source: CostTimeseries, targetMin: number): number {
  const base = source.bucketStartMin[0] ?? 0;
  const step = source.bucketMinutes;
  const idx = Math.round((targetMin - base) / step);
  return Math.max(0, Math.min(source.bucketStartMin.length - 1, idx));
}

/**
 * DAY VIEW: cumulative cost across [startMin, endMin] (inclusive), with
 * the DOLLAR VALUES (not the time axis) re-baselined to 0 at startMin,
 * so the 3-day window's own climb is visible without an offset from
 * everything before it. `bucketStartMin` stays on the SAME GLOBAL axis
 * as the source (and as useTimeCursor()'s own currentMinute/minMinute/
 * maxMinute) -- deliberately NOT shifted to 0, so the scrub cursor and
 * every marker's simMin keep lining up with the chart with no separate
 * translation step. Slices `source`'s own bucket grid directly -- no
 * re-aggregation, since day view wants the SAME minute granularity the
 * export already has.
 */
export function windowedCumulative(source: CostTimeseries, startMin: number, endMin: number): CostTimeseries {
  const startIdx = indexAt(source, startMin);
  const endIdx = indexAt(source, endMin);
  const bucketStartMin = source.bucketStartMin.slice(startIdx, endIdx + 1);
  const carriers: Record<string, CarrierTimeseries> = {};
  for (const [code, series] of Object.entries(source.carriers)) {
    const baseline0 = series.baseline[startIdx] ?? 0;
    const scenario0 = series.scenario[startIdx] ?? 0;
    carriers[code] = {
      baseline: series.baseline.slice(startIdx, endIdx + 1).map((v) => round2(v - baseline0)),
      scenario: series.scenario.slice(startIdx, endIdx + 1).map((v) => round2(v - scenario0)),
    };
  }
  return { bucketMinutes: source.bucketMinutes, bucketStartMin, carriers };
}

/**
 * WEEK/MONTH VIEW: per-bucket TOTALS (NOT cumulative) at `bucketMin`
 * granularity across [startMin, endMin) -- deliberately per-bucket, not
 * running, so the SHAPE of which periods were worst is visible (see
 * Task 8b's own design rationale: a cumulative month view only ever
 * climbs and hides which days hurt). `bucketStartMin` stays on the
 * SAME GLOBAL axis as the source -- see windowedCumulative's own
 * docstring for why (cursor/marker alignment, no separate translation).
 */
export function bucketByWidth(source: CostTimeseries, bucketMin: number, startMin: number, endMin: number): CostTimeseries {
  const nBuckets = Math.max(0, Math.ceil((endMin - startMin) / bucketMin));
  const bucketStartMin: number[] = [];
  const carriers: Record<string, CarrierTimeseries> = {};
  for (const code of Object.keys(source.carriers)) carriers[code] = { baseline: [], scenario: [] };

  for (let i = 0; i < nBuckets; i++) {
    const bStart = startMin + i * bucketMin;
    const bEnd = Math.min(bStart + bucketMin, endMin);
    bucketStartMin.push(bStart);
    for (const [code, series] of Object.entries(source.carriers)) {
      const bTotal = round2(cumulativeAt(source, series.baseline, bEnd) - cumulativeAt(source, series.baseline, bStart));
      const sTotal = round2(cumulativeAt(source, series.scenario, bEnd) - cumulativeAt(source, series.scenario, bStart));
      carriers[code].baseline.push(bTotal);
      carriers[code].scenario.push(sTotal);
    }
  }
  return { bucketMinutes: bucketMin, bucketStartMin, carriers };
}

export function bucketByHour(source: CostTimeseries, startMin: number, endMin: number): CostTimeseries {
  return bucketByWidth(source, 60, startMin, endMin);
}

export function bucketByDay(source: CostTimeseries, startMin: number, endMin: number): CostTimeseries {
  return bucketByWidth(source, 1440, startMin, endMin);
}

/** Sum of every carrier's `side` value at bucket index `i` -- the
 * system-wide total for that bucket, reused by both the sparkline
 * (lib/costSparkline.ts) and the recovery-overlay area chart. */
export function grandTotalAt(costTimeseries: CostTimeseries, side: "baseline" | "scenario", i: number): number {
  let total = 0;
  for (const series of Object.values(costTimeseries.carriers)) total += series[side][i] ?? 0;
  return total;
}

/**
 * Every marker whose simMin falls in [startMin, endMin) -- day/week
 * view render these individually, one ReferenceLine each.
 */
export function markersInWindow(markers: DisruptionMarker[], startMin: number, endMin: number): DisruptionMarker[] {
  return markers.filter((m) => m.simMin >= startMin && m.simMin < endMin);
}

/**
 * MONTH VIEW: cluster markers per CALENDAR DAY (1440-minute buckets on
 * the same global axis as simMin) -- a day with 3 disruptions becomes
 * one clustered point with count 3; hover reveals all three. Always
 * returns clusters in day order; a day with zero markers is simply
 * absent (never a zero-count cluster).
 */
export function clusterMarkersByDay(markers: DisruptionMarker[], startMin: number, endMin: number): ClusteredDisruptionMarker[] {
  const byDay = new Map<number, DisruptionMarker[]>();
  for (const m of markers) {
    if (m.simMin < startMin || m.simMin >= endMin) continue;
    const dayStart = Math.floor((m.simMin - startMin) / 1440) * 1440 + startMin;
    const bucket = byDay.get(dayStart) ?? [];
    bucket.push(m);
    byDay.set(dayStart, bucket);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([dayStartMin, dayMarkers]) => ({
      dayStartMin,
      markers: [...dayMarkers].sort((a, b) => a.simMin - b.simMin),
    }));
}
