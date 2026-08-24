import { test, expect } from "@playwright/test";
import { windowedCumulative, bucketByHour, bucketByDay, bucketByWidth, clusterMarkersByDay, markersInWindow } from "../lib/timeAggregation";
import { dayWindow, weekOptions, monthWindow, getCoverage, isWeekMonthEnabled, dayOptions, formatWindowTick, formatShort } from "../lib/viewScale";
import type { CostTimeseries, DisruptionMarker } from "../lib/types";

/**
 * Task 8b, checkpoint 5 (bucket-sum correctness) + checkpoint 3 (edge
 * dates) + checkpoint 8 (recovery-overlay scale invariance) + checkpoint
 * 6 (marker clustering) -- all pure-function tests, no browser/dev
 * server needed. These prove the aggregation math is CORRECT, not just
 * visually plausible (see lib/timeAggregation.ts's own docstring).
 */

/** A synthetic minute-level CostTimeseries: one carrier, $1/minute of
 * cost accrued, cumulative. `nMinutes` long, starting at global minute 0. */
function makeSyntheticSeries(nMinutes: number, dollarsPerMinute = 1): CostTimeseries {
  const bucketStartMin = Array.from({ length: nMinutes }, (_, i) => i);
  const cumulative = Array.from({ length: nMinutes }, (_, i) => (i + 1) * dollarsPerMinute);
  return {
    bucketMinutes: 1,
    bucketStartMin,
    carriers: { AA: { baseline: [...cumulative], scenario: [...cumulative] } },
  };
}

test.describe("bucket-sum correctness (checkpoint 5)", () => {
  test("hour buckets in a week-scale aggregation equal the sum of their 60 constituent minute deltas", () => {
    const source = makeSyntheticSeries(3 * 1440); // 3 days of minute-level data
    const hourly = bucketByHour(source, 0, 3 * 1440);
    expect(hourly.bucketStartMin.length).toBe(3 * 24);

    // Pick 3 real hour buckets (not just bucket 0) and verify each one's
    // total equals the sum of its 60 own per-minute deltas, computed
    // directly from the SOURCE (never from the aggregated output itself
    // -- that would be circular).
    const source0 = source.carriers.AA.scenario;
    for (const hourIndex of [0, 5, 40]) {
      const bStart = hourIndex * 60;
      let manualSum = 0;
      for (let m = bStart; m < bStart + 60; m++) {
        const before = m === 0 ? 0 : source0[m - 1];
        manualSum += source0[m] - before;
      }
      expect(hourly.carriers.AA.scenario[hourIndex]).toBeCloseTo(manualSum, 2);
    }
  });

  test("day buckets in a month-scale aggregation equal the sum of their 24 constituent hour buckets", () => {
    const source = makeSyntheticSeries(5 * 1440);
    const daily = bucketByDay(source, 0, 5 * 1440);
    const hourly = bucketByHour(source, 0, 5 * 1440);
    expect(daily.bucketStartMin.length).toBe(5);

    for (const dayIndex of [0, 2, 4]) {
      const hoursThisDay = hourly.carriers.AA.scenario.slice(dayIndex * 24, dayIndex * 24 + 24);
      const sumOfHours = hoursThisDay.reduce((a, b) => a + b, 0);
      expect(daily.carriers.AA.scenario[dayIndex]).toBeCloseTo(sumOfHours, 2);
    }
  });

  test("bucketByWidth is exact for a non-uniform disruption shape (not just a flat $1/min series)", () => {
    // A single spike: $500 accrued in minute 30 only, everything else flat.
    const nMinutes = 120;
    const cumulative = Array.from({ length: nMinutes }, (_, i) => (i > 30 ? 500 : 0));
    const source: CostTimeseries = {
      bucketMinutes: 1,
      bucketStartMin: Array.from({ length: nMinutes }, (_, i) => i),
      carriers: { UA: { baseline: [...cumulative], scenario: [...cumulative] } },
    };
    const buckets = bucketByWidth(source, 60, 0, 120);
    // The spike lands in bucket 0 (minutes 0-59) since index 30 < 60.
    expect(buckets.carriers.UA.scenario[0]).toBeCloseTo(500, 2);
    expect(buckets.carriers.UA.scenario[1]).toBeCloseTo(0, 2);
  });
});

test.describe("windowedCumulative (day view)", () => {
  test("re-baselines dollar values to 0 at window start, keeps the time axis global", () => {
    const source = makeSyntheticSeries(5 * 1440);
    const windowed = windowedCumulative(source, 2 * 1440, 4 * 1440);
    expect(windowed.carriers.AA.scenario[0]).toBeCloseTo(0, 2); // re-baselined
    expect(windowed.bucketStartMin[0]).toBe(2 * 1440); // axis stays global, NOT shifted to 0
    const lastIdx = windowed.carriers.AA.scenario.length - 1;
    // The window spans exactly 2*1440 MINUTE-INTERVALS (2881 minute-marks,
    // inclusive of both endpoints) at $1/min -> climbs by exactly $2880.
    expect(windowed.carriers.AA.scenario[lastIdx]).toBeCloseTo(2 * 1440, 0);
  });
});

test.describe("marker clustering (checkpoint 6)", () => {
  function marker(id: string, simMin: number): DisruptionMarker {
    return { id, kind: "close_runway", simMin, label: id, airportIata: "ORD", airportLat: 41.9, airportLon: -87.9, marginalCost: { low: 1, typical: 2, high: 3 } };
  }

  test("day/week view: markers pass through individually", () => {
    const markers = [marker("a", 100), marker("b", 2000), marker("c", 5000)];
    const inWindow = markersInWindow(markers, 0, 2880);
    expect(inWindow.map((m) => m.id)).toEqual(["a", "b"]);
  });

  test("month view: clusters per calendar day, count + order correct, empty days absent", () => {
    const markers = [marker("a", 480), marker("b", 1200), marker("c", 1450), marker("d", 40000)];
    const clusters = clusterMarkersByDay(markers, 0, 31 * 1440);
    // day 0 (minutes 0-1439) has "a" and "b"; day 1 (1440-2879) has "c"; a much later day has "d".
    expect(clusters.length).toBe(3);
    expect(clusters[0].dayStartMin).toBe(0);
    expect(clusters[0].markers.map((m) => m.id)).toEqual(["a", "b"]);
    expect(clusters[1].dayStartMin).toBe(1440);
    expect(clusters[1].markers.map((m) => m.id)).toEqual(["c"]);
  });
});

test.describe("recovery-overlay scale invariance (checkpoint 8)", () => {
  test("the integrated saving is identical whether measured cumulative (day) or per-bucket (week/month)", () => {
    // A synthetic recovery pair: no-recovery accrues $2/min, recovered
    // accrues $1/min -- a real, constant $1/min saving, $1440 by the end
    // of a 1-day (1440-minute) window.
    const nMinutes = 3 * 1440;
    const noRecovery = Array.from({ length: nMinutes }, (_, i) => (i + 1) * 2);
    const recovered = Array.from({ length: nMinutes }, (_, i) => (i + 1) * 1);
    const source: CostTimeseries = {
      bucketMinutes: 1,
      bucketStartMin: Array.from({ length: nMinutes }, (_, i) => i),
      carriers: { AA: { baseline: noRecovery, scenario: recovered } },
    };

    const dayView = windowedCumulative(source, 0, 1440);
    const dayViewSaving = dayView.carriers.AA.baseline[dayView.carriers.AA.baseline.length - 1] - dayView.carriers.AA.scenario[dayView.carriers.AA.scenario.length - 1];

    const weekView = bucketByHour(source, 0, 1440);
    const weekViewSaving = weekView.bucketStartMin.reduce((acc, _m, i) => acc + (weekView.carriers.AA.baseline[i] - weekView.carriers.AA.scenario[i]), 0);

    const monthView = bucketByDay(source, 0, 1440);
    const monthViewSaving = monthView.bucketStartMin.reduce((acc, _m, i) => acc + (monthView.carriers.AA.baseline[i] - monthView.carriers.AA.scenario[i]), 0);

    expect(dayViewSaving).toBeCloseTo(1440, 0);
    expect(weekViewSaving).toBeCloseTo(dayViewSaving, 0);
    expect(monthViewSaving).toBeCloseTo(dayViewSaving, 0);
  });
});

test.describe("viewScale.ts coverage + windowing (checkpoints 2, 3)", () => {
  test("single-day scenario: week/month disabled", () => {
    const coverage = getCoverage({ scenarioId: "x", label: "x", day: "2025-12-15", disruptionSummary: "", sourceRunId: "", generatedAt: "" });
    expect(isWeekMonthEnabled(coverage)).toBe(false);
  });

  test("multi-day scenario: week/month enabled, dayOptions spans the full coverage", () => {
    const coverage = getCoverage({ scenarioId: "x", label: "x", day: "2025-12-01", startDay: "2025-12-01", endDay: "2025-12-31", disruptionSummary: "", sourceRunId: "", generatedAt: "" });
    expect(isWeekMonthEnabled(coverage)).toBe(true);
    expect(dayOptions(coverage).length).toBe(31);
    expect(dayOptions(coverage)[0]).toBe("2025-12-01");
    expect(dayOptions(coverage)[30]).toBe("2025-12-31");
  });

  test("edge date: picking Dec 1 (start of coverage) clamps to a 2-day window, not fabricated Nov 30", () => {
    const coverage = { startDay: "2025-12-01", endDay: "2025-12-31" };
    const w = dayWindow("2025-12-01", coverage);
    expect(w.startDay).toBe("2025-12-01");
    expect(w.endDay).toBe("2025-12-02");
  });

  test("edge date: picking Dec 31 (end of coverage) clamps to a 2-day window, not fabricated Jan 1", () => {
    const coverage = { startDay: "2025-12-01", endDay: "2025-12-31" };
    const w = dayWindow("2025-12-31", coverage);
    expect(w.startDay).toBe("2025-12-30");
    expect(w.endDay).toBe("2025-12-31");
  });

  test("a genuinely interior day gets the full 3-day window", () => {
    const coverage = { startDay: "2025-12-01", endDay: "2025-12-31" };
    const w = dayWindow("2025-12-15", coverage);
    expect(w.startDay).toBe("2025-12-14");
    expect(w.endDay).toBe("2025-12-16");
    expect(w.endMin - w.startMin).toBe(3 * 1440);
  });

  test("partial-month coverage: only overlapping weeks are offered, each clamped to coverage", () => {
    const coverage = { startDay: "2025-12-15", endDay: "2025-12-22" };
    const weeks = weekOptions(coverage);
    // December's own weeks are Dec1-7/8-14/15-21/22-28/29-31 -- only
    // 15-21 and 22-28 overlap [15,22], and each must be clamped to it.
    expect(weeks.length).toBe(2);
    expect(weeks[0].startDay).toBe("2025-12-15");
    expect(weeks[0].endDay).toBe("2025-12-21");
    expect(weeks[1].startDay).toBe("2025-12-22");
    expect(weeks[1].endDay).toBe("2025-12-22"); // clamped -- coverage ends there
  });

  test("month view labels the FULL calendar month only when coverage genuinely is all of it", () => {
    const full = monthWindow({ startDay: "2025-12-01", endDay: "2025-12-31" });
    expect(full.label).toBe("December 2025");
    const partial = monthWindow({ startDay: "2025-12-15", endDay: "2025-12-22" });
    expect(partial.label).not.toBe("December 2025");
  });

  test("formatWindowTick resolves a global minute to a real calendar date, not a meaningless day-of-span offset", () => {
    expect(formatWindowTick("2025-12-01", 19 * 1440)).toBe(formatShort("2025-12-20"));
  });
});
