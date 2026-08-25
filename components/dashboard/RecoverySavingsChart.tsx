"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import type { CostTimeseries } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { formatSimTime } from "./CostTimeseriesChart";
import { useViewWindow } from "@/lib/viewWindowContext";
import { windowedCumulative, bucketByHour, bucketByDay } from "@/lib/timeAggregation";
import { formatWindowTick } from "@/lib/viewScale";

/**
 * The before/after recovery view's "money shot": the grand-total (summed
 * across every carrier) cumulative-cost curve --
 *   no recovery   solid, red    -- the disrupted cascade, nothing done
 *   recovered     solid, gold   -- what it actually cost after the OCC acted
 * -- with the GAP between them shaded gold: that shaded area geometrically
 * IS the saving, growing as the day's recovery actions take effect.
 *
 * BOTH lines come from `recoveredCostTimeseries` alone (lastRecovery's own
 * costTimeseries, i.e. `recovery.data.scenario.costTimeseries`) -- its
 * `.baseline` side is the no-recovery cascade and its `.scenario` side is
 * the recovered one (see api/recovery_job.py's _reshape_result call:
 * baseline_ledger=no_recovery_ledger, scenario_ledger=recovered_ledger).
 * Deliberately NOT mixed with the currently-active (pre-recovery) result's
 * own costTimeseries, even though that also has a "no recovery" side that
 * LOOKS like it should match -- it doesn't: /api/simulate's dollar figures
 * are costed off the REPRODUCE-mode state (real BTS delay + the
 * disruption), while the recovery job costs off the CLEAN-mode state (the
 * disruption in isolation, engine/disruption.py's "clean-injection only"
 * design) -- two different cost bases that happen to share field names.
 * Subtracting one from the other produced a large, meaningless "gap" that
 * had nothing to do with the actual saving (caught during this feature's
 * own verification: a real $0-saved case still showed a big gold band).
 * Using only recoveredCostTimeseries's own baseline/scenario pair keeps
 * both lines on the SAME cost basis, so the gap is honestly zero when the
 * saving is zero. This is also why there's no third "calm day" dashed
 * line here (unlike the per-carrier chart above it) -- the recovery job
 * never computes a true zero-disruption reference, only no-recovery vs
 * recovered, so there's nothing consistent to pair a calm-day line
 * against; that comparison already exists in the chart just above this
 * one. Deliberately a SEPARATE small chart from the existing per-carrier
 * CostTimeseriesChart (Dashboard.tsx) rather than adding a third
 * per-carrier line there -- a per-carrier gold band for each of up to 14
 * carriers would be unreadable; a single grand-total view is the legible
 * way to show ONE saving.
 */
export function RecoverySavingsChart({
  recoveredCostTimeseries: rawRecoveredCostTimeseries,
  revealed,
}: {
  recoveredCostTimeseries: CostTimeseries;
  /** Drives the ONE springy moment in this component -- the gold area's
   * fillOpacity transitions in with an overshoot-and-settle curve the
   * instant this flips true (see tailwind.config.ts's `spring` easing /
   * `reveal` duration, reserved for exactly this). Starts false so the
   * transition has a 0 -> filled edge to animate across. */
  revealed: boolean;
}) {
  const { multiDay, scale, window, coverage } = useViewWindow();

  // Task 8b: the SAME per-scale aggregation CostTimeseriesChart/
  // TimelineScrubber apply. Because windowedCumulative/bucketByWidth are
  // both pure, linear, telescoping-sum transforms (see lib/
  // timeAggregation.ts's own docstring), applying the IDENTICAL
  // transform to both the no-recovery and recovered sides preserves
  // their INTEGRATED difference exactly -- the gold area's total dollar
  // saving never changes when the view scale does, only its shape does.
  const recoveredCostTimeseries = useMemo(() => {
    if (!multiDay) return rawRecoveredCostTimeseries;
    if (scale === "week") return bucketByHour(rawRecoveredCostTimeseries, window.startMin, window.endMin);
    if (scale === "month") return bucketByDay(rawRecoveredCostTimeseries, window.startMin, window.endMin);
    return windowedCumulative(rawRecoveredCostTimeseries, window.startMin, window.endMin);
  }, [rawRecoveredCostTimeseries, multiDay, scale, window]);

  const tickFormatter = multiDay ? (min: number) => formatWindowTick(coverage.startDay, min) : formatSimTime;

  const rows = useMemo(() => {
    const noRecoveryTotal = grandTotal(recoveredCostTimeseries, "baseline");
    const recoveredTotal = grandTotal(recoveredCostTimeseries, "scenario");
    return recoveredCostTimeseries.bucketStartMin.map((min, i) => {
      const noRecovery = noRecoveryTotal[i] ?? 0;
      const recovered = recoveredTotal[i] ?? 0;
      return {
        min,
        noRecovery,
        recovered,
        // Clamped at 0: recovery is not guaranteed to beat no-recovery in
        // EVERY single hourly bucket (only in aggregate, which is what
        // recoverySaving reports) -- a transient negative gap would draw
        // a nonsensical area beneath the recovered line rather than
        // between the two, so it's floored rather than shown as-is. When
        // the saving is genuinely $0 this is 0 at every bucket, so the
        // band renders with real zero height, not just zero opacity.
        gap: Math.max(0, noRecovery - recovered),
      };
    });
  }, [recoveredCostTimeseries]);

  // A one-tick delay before flipping the CSS transition's starting state
  // to 0 so the browser registers it BEFORE `revealed` (the real trigger,
  // passed by the parent once) turns it up to its filled value -- the
  // standard "animate from a real initial frame" CSS-transition trick.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const goldOpacity = mounted && revealed ? 0.4 : 0;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={rows} margin={{ top: 20, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 3" vertical={false} />
          <XAxis
            dataKey="min"
            tickFormatter={tickFormatter}
            stroke="#94a3b8"
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255, 255, 255, 0.05)" }}
          />
          <YAxis
            tickFormatter={(v) => formatUsd(v)}
            stroke="#94a3b8"
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={70}
          />

          {/* Invisible riser + the gold band stacked on top of it -- the
              standard recharts trick for shading the GAP between two
              series rather than from zero. */}
          <Area type="monotone" dataKey="recovered" stackId="saving" stroke="none" fill="transparent" isAnimationActive={false} />
          <Area
            type="monotone"
            dataKey="gap"
            stackId="saving"
            stroke="none"
            fill="#C5A059"
            fillOpacity={goldOpacity}
            isAnimationActive={false}
            style={{ transition: "fill-opacity 700ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />

          <Line type="monotone" dataKey="noRecovery" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="recovered" stroke="#ffffff" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 px-2 font-mono text-xs text-muted">
        <Legend swatch="#EF4444" label="No recovery" />
        <Legend swatch="#ffffff" label="Recovered" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#C5A059", opacity: 0.6 }} />
          Gold area = saved by recovery
        </span>
      </div>
    </div>
  );
}

function grandTotal(costTimeseries: CostTimeseries, side: "baseline" | "scenario"): number[] {
  const n = costTimeseries.bucketStartMin.length;
  const totals = new Array(n).fill(0);
  for (const series of Object.values(costTimeseries.carriers)) {
    const arr = series[side];
    for (let i = 0; i < n; i++) totals[i] += arr[i] ?? 0;
  }
  return totals;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-0.5" style={{ backgroundColor: swatch }} />
      {label}
    </span>
  );
}
