"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import type { CostTimeseries, DisruptionMarker, ClusteredDisruptionMarker } from "@/lib/types";
import { assignCarrierColors } from "@/lib/carrierColors";
import { formatUsd } from "@/lib/format";
import { useViewWindow } from "@/lib/viewWindowContext";
import { windowedCumulative, bucketByHour, bucketByDay, markersInWindow, clusterMarkersByDay } from "@/lib/timeAggregation";
import { formatWindowTick } from "@/lib/viewScale";

/**
 * Simulated minutes-since-day-start -> "D0 HH:MM" / "D1 HH:MM". The
 * window commonly runs past 24h (a delayed flight's cascade can land the
 * following day,  see the backend's own "D0+HH:MM" / "D1+HH:MM" report
 * notation), so a plain HH:MM label would silently wrap and make the
 * axis look like it reverses partway through. Matching the backend's own
 * day-prefix convention keeps this readable and consistent with the
 * financial reports this data comes from.
 */
export function formatSimTime(minuteOfDaySpan: number): string {
  const day = Math.floor(minuteOfDaySpan / 1440);
  const minuteOfDay = minuteOfDaySpan % 1440;
  const h = Math.floor(minuteOfDay / 60);
  const m = Math.round(minuteOfDay % 60);
  return `D${day} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface ChartRow {
  min: number;
  [seriesKey: string]: number; // "<CARRIER>_baseline" / "<CARRIER>_scenario"
}

export function CostTimeseriesChart({ data: rawData, markers: rawMarkers }: { data: CostTimeseries; markers: DisruptionMarker[] }) {
  const { multiDay, scale, window, coverage } = useViewWindow();

  // Task 8b: apply the current view scale's aggregation -- a no-op pass-
  // through (byte-identical to pre-8b) whenever the scenario isn't
  // genuinely multi-day. See lib/timeAggregation.ts's own docstring for
  // why bucketByHour/bucketByDay's per-bucket totals are provably the
  // sum of their constituent finer buckets.
  const data = useMemo(() => {
    if (!multiDay) return rawData;
    if (scale === "week") return bucketByHour(rawData, window.startMin, window.endMin);
    if (scale === "month") return bucketByDay(rawData, window.startMin, window.endMin);
    return windowedCumulative(rawData, window.startMin, window.endMin);
  }, [rawData, multiDay, scale, window]);

  const markers = useMemo(() => (multiDay ? markersInWindow(rawMarkers, window.startMin, window.endMin) : rawMarkers), [rawMarkers, multiDay, window]);
  const clusters = useMemo(
    () => (multiDay && scale === "month" ? clusterMarkersByDay(rawMarkers, window.startMin, window.endMin) : []),
    [rawMarkers, multiDay, scale, window]
  );

  // DAY view: a thin divider + date label at every midnight crossed by
  // the 3-day window (Task 8b's own "day boundaries marked subtly"
  // requirement) -- e.g. picking Dec 15 shows dividers at the Dec14/15
  // and Dec15/16 midnights.
  const dayBoundaries = useMemo(() => {
    if (!multiDay || scale !== "day") return [];
    const bounds: number[] = [];
    const first = Math.ceil(window.startMin / 1440) * 1440;
    for (let m = first; m < window.endMin; m += 1440) bounds.push(m);
    return bounds;
  }, [multiDay, scale, window]);

  const carrierCodes = useMemo(() => Object.keys(data.carriers).sort(), [data]);
  const colors = useMemo(() => assignCarrierColors(carrierCodes), [carrierCodes]);

  // "Most-affected" = the largest final divergence between the scenario
  // and baseline cumulative cost,  i.e. the carriers this disruption
  // actually cost the most, not just whichever happen to fly the most.
  // For week/month (per-bucket totals, not cumulative), "final" cost is
  // meaningless -- rank by the SUM across every bucket instead, same idea
  // (which carriers this scenario actually cost the most), applied to
  // whichever shape the current scale actually shows.
  const rankedByImpact = useMemo(() => {
    const impactOf = (code: string) => {
      const series = data.carriers[code];
      if (!series) return 0;
      if (!multiDay || scale === "day") return lastValue(series.scenario) - lastValue(series.baseline);
      return sum(series.scenario) - sum(series.baseline);
    };
    return [...carrierCodes].sort((a, b) => impactOf(b) - impactOf(a));
  }, [carrierCodes, data, multiDay, scale]);

  const [showAll, setShowAll] = useState(false);
  const DEFAULT_SHOWN = 5;
  const shownCarriers = showAll ? rankedByImpact : rankedByImpact.slice(0, DEFAULT_SHOWN);

  const chartData: ChartRow[] = useMemo(() => {
    return data.bucketStartMin.map((min, i) => {
      const row: ChartRow = { min };
      for (const code of carrierCodes) {
        row[`${code}_baseline`] = data.carriers[code]?.baseline[i] ?? 0;
        row[`${code}_scenario`] = data.carriers[code]?.scenario[i] ?? 0;
      }
      return row;
    });
  }, [data, carrierCodes]);

  const [hovered, setHovered] = useState<DisruptionMarker | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<ClusteredDisruptionMarker | null>(null);

  // Task 8b: a multi-day scenario's bucketStartMin is a GLOBAL axis (0 at
  // coverage.startDay's own midnight, can run into the thousands of
  // minutes for a day late in the range) -- formatSimTime's "D0/D1"
  // convention assumes a single day's own 0-based span and would show a
  // meaningless "D19" for day 20 of a month. formatWindowTick resolves
  // the SAME global minute to a real calendar date instead, for every
  // multi-day scale (day/week/month) -- only the ORIGINAL single-day
  // pass-through path keeps formatSimTime, unchanged.
  const tickFormatter = multiDay ? (min: number) => formatWindowTick(coverage.startDay, min) : formatSimTime;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted">
          {multiDay && scale !== "day" ? "Per-period totals" : "Solid = injected scenario · dashed = expected-normal baseline"} &nbsp;&middot;&nbsp; showing{" "}
          {shownCarriers.length} of {carrierCodes.length} carriers
        </p>
        {carrierCodes.length > DEFAULT_SHOWN && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="font-mono text-xs uppercase tracking-widest text-aubergine-soft hover:text-aubergine state-transition border border-border rounded px-2 py-1"
          >
            {showAll ? "Show top 5" : `Show all ${carrierCodes.length}`}
          </button>
        )}
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 20, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#E4DCE6" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="min"
              tickFormatter={tickFormatter}
              stroke="#7A6E82"
              tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#7A6E82" }}
              tickLine={false}
              axisLine={{ stroke: "#E4DCE6" }}
            />
            <YAxis
              tickFormatter={(v) => formatUsd(v)}
              stroke="#7A6E82"
              tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#7A6E82" }}
              tickLine={false}
              axisLine={false}
              width={70}
            />

            {shownCarriers.map((code) => (
              <Line
                key={`${code}_baseline`}
                type="monotone"
                dataKey={`${code}_baseline`}
                stroke={colors[code]}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={0.45}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {shownCarriers.map((code) => (
              <Line
                key={`${code}_scenario`}
                type="monotone"
                dataKey={`${code}_scenario`}
                stroke={colors[code]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {dayBoundaries.map((boundaryMin) => (
              <ReferenceLine
                key={`boundary-${boundaryMin}`}
                x={boundaryMin}
                stroke="#7A6E82"
                strokeOpacity={0.4}
                strokeDasharray="2 2"
                label={{ value: formatWindowTick(coverage.startDay, boundaryMin), position: "insideTopRight", fill: "#7A6E82", fontSize: 10, fontFamily: "var(--font-mono)" }}
              />
            ))}

            {scale === "month" && multiDay
              ? clusters.map((cluster) => (
                  // MONTH view: one marker per CALENDAR DAY, clustered --
                  // see lib/timeAggregation.ts's clusterMarkersByDay. A
                  // day with 3 disruptions renders ONE dot labelled "3";
                  // hover reveals every one of them.
                  <ReferenceLine
                    key={cluster.dayStartMin}
                    x={cluster.dayStartMin}
                    stroke="#C1121F"
                    strokeOpacity={0.35}
                    strokeDasharray="2 3"
                    label={(props: unknown) => (
                      <ClusteredDisruptionDot
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        viewBox={(props as any).viewBox}
                        count={cluster.markers.length}
                        onEnter={() => setHoveredCluster(cluster)}
                        onLeave={() => setHoveredCluster((h) => (h?.dayStartMin === cluster.dayStartMin ? null : h))}
                      />
                    )}
                  />
                ))
              : markers.map((marker) => (
                  // A vertical ReferenceLine (x only, no y) spans the FULL
                  // plot height automatically and is positioned purely from
                  // the x-axis,  unlike ReferenceDot, it's never clipped by
                  // the y-axis's data-driven domain, which is what a first
                  // version of this component got wrong (a dot placed above
                  // the highest line fell outside the auto-computed y-domain
                  // and Recharts silently dropped it). The interactive dot
                  // is rendered via the `label` render-prop instead, pinned
                  // to the top of the plot area using the viewBox it's given.
                  <ReferenceLine
                    key={marker.id}
                    x={marker.simMin}
                    stroke="#C1121F"
                    strokeOpacity={0.35}
                    strokeDasharray="2 3"
                    label={(props: unknown) => (
                      <DisruptionDot
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        viewBox={(props as any).viewBox}
                        onEnter={() => setHovered(marker)}
                        onLeave={() => setHovered((h) => (h?.id === marker.id ? null : h))}
                      />
                    )}
                  />
                ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend, colored to match each carrier's line. */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 px-2">
          {shownCarriers.map((code) => (
            <div key={code} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[code] }} />
              <span className="font-mono text-xs text-muted">{code}</span>
            </div>
          ))}
        </div>

        {hovered && <MarkerBubble marker={hovered} />}
        {hoveredCluster && <ClusterBubble cluster={hoveredCluster} />}
      </div>
    </div>
  );
}

function lastValue(series: number[] | undefined): number {
  if (!series || series.length === 0) return 0;
  return series[series.length - 1] ?? 0;
}

function sum(series: number[] | undefined): number {
  if (!series) return 0;
  return series.reduce((a, b) => a + b, 0);
}

/** The pulsing red disruption-marker dot, pinned to the top of the
 * chart's plot area (viewBox.x/viewBox.y, supplied by ReferenceLine's
 * `label` render prop) directly above where its vertical guide line
 * crosses the x-axis. Pure SVG/SMIL animation (an <animate> element),
 * no JS animation library,  works fine in a static export and respects
 * the design system's "motion reports a state, doesn't perform one"
 * rule better than a bouncy JS-driven pulse would. */
function DisruptionDot({
  viewBox,
  onEnter,
  onLeave,
}: {
  viewBox?: { x?: number; y?: number };
  onEnter: () => void;
  onLeave: () => void;
}) {
  const cx = viewBox?.x;
  const cy = viewBox?.y;
  if (cx === undefined || cy === undefined) return null;
  return (
    <g onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ cursor: "pointer" }}>
      <circle cx={cx} cy={cy} r={9} fill="#C1121F" opacity={0.35}>
        <animate attributeName="r" values="6;11;6" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={5} fill="#C1121F" stroke="#F7F4F0" strokeWidth={1.5} />
    </g>
  );
}

/** FT-style hover bubble: one number, one line of context, nothing more. */
function MarkerBubble({ marker }: { marker: DisruptionMarker }) {
  return (
    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 bg-elevated border border-border rounded-md px-3 py-2 shadow-none max-w-xs pointer-events-none">
      <p className="font-mono tabular-nums text-base text-red-soft font-medium">{formatUsd(marker.marginalCost.typical)}</p>
      <p className="text-xs text-muted mt-0.5">{marker.label}</p>
      <p className="font-mono text-[11px] text-muted mt-1">
        range {formatUsd(marker.marginalCost.low)} &ndash; {formatUsd(marker.marginalCost.high)}
      </p>
    </div>
  );
}

/** MONTH view's clustered marker dot -- same pulsing-dot treatment as
 * DisruptionDot, with a small count badge whenever a day had more than
 * one disruption (the common case is 1, which shows no badge at all --
 * a bare dot reads as "one disruption" without extra chrome). */
function ClusteredDisruptionDot({
  viewBox,
  count,
  onEnter,
  onLeave,
}: {
  viewBox?: { x?: number; y?: number };
  count: number;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const cx = viewBox?.x;
  const cy = viewBox?.y;
  if (cx === undefined || cy === undefined) return null;
  return (
    <g onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ cursor: "pointer" }} data-testid="clustered-disruption-dot" data-count={count}>
      <circle cx={cx} cy={cy} r={9} fill="#C1121F" opacity={0.35}>
        <animate attributeName="r" values="6;11;6" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={5} fill="#C1121F" stroke="#F7F4F0" strokeWidth={1.5} />
      {count > 1 && (
        <text x={cx} y={cy - 11} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="#C1121F" fontWeight={600}>
          {count}
        </text>
      )}
    </g>
  );
}

/** Hover-reveal for a clustered day: every one of that day's markers,
 * stacked, in simMin order -- the count badge's own detail view. */
function ClusterBubble({ cluster }: { cluster: ClusteredDisruptionMarker }) {
  return (
    <div
      className="absolute top-1 left-1/2 -translate-x-1/2 z-10 bg-elevated border border-border rounded-md px-3 py-2 shadow-none max-w-xs pointer-events-none"
      data-testid="cluster-bubble"
    >
      {cluster.markers.map((marker, i) => (
        <div key={marker.id} className={i > 0 ? "mt-2 pt-2 border-t border-border" : ""}>
          <p className="font-mono tabular-nums text-base text-red-soft font-medium">{formatUsd(marker.marginalCost.typical)}</p>
          <p className="text-xs text-muted mt-0.5">{marker.label}</p>
        </div>
      ))}
    </div>
  );
}
