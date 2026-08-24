"use client";

import { useMemo, useState } from "react";
import { useTimeCursor } from "@/lib/timeCursor";
import { useViewWindow } from "@/lib/viewWindowContext";
import { buildCostSparkline } from "@/lib/costSparkline";
import { windowedCumulative, bucketByHour, bucketByDay, markersInWindow, clusterMarkersByDay } from "@/lib/timeAggregation";
import { formatWindowTick } from "@/lib/viewScale";
import { formatUsd } from "@/lib/format";
import type { CostTimeseries, DisruptionMarker, ClusteredDisruptionMarker } from "@/lib/types";

const VIEW_W = 300;
const VIEW_H = 78;
const SPARK_TOP = 4;
const SPARK_BOTTOM = 40;
const TRACK_Y = 50;
const TRACK_H = 7;
const TICK_TOP = 4;
const TICK_BOTTOM = TRACK_Y + TRACK_H;

/**
 * The rich timeline: a muted sparkline (system-wide cumulative cost,
 * derived client-side from the already-loaded cost_timeseries,  see
 * lib/costSparkline.ts, no new export) showing the cascade's shape,
 * disruption markers you can hover/click, a D0/D1 midnight-rollover
 * divider, and the scrub handle,  all driving the SAME useTimeCursor()
 * cursor USMap already consumes.
 *
 * Interaction layering: a native <input type="range"> handles drag
 * (reliable, keyboard-accessible, no hand-rolled pointer math) and sits
 * BEHIND the SVG; the SVG's own pointer-events are off by default so
 * drags pass through to the range input everywhere EXCEPT the disruption
 * markers' own hit-circles, which explicitly re-enable pointer-events so
 * they're independently hoverable/clickable ("jump to this disruption")
 * without blocking scrubbing anywhere else on the track.
 */
export function TimelineScrubber({
  costTimeseries: rawCostTimeseries,
  disruptionMarkers: rawMarkers,
}: {
  costTimeseries: CostTimeseries;
  disruptionMarkers: DisruptionMarker[];
}) {
  const { currentMinute, minMinute, maxMinute, setMinute } = useTimeCursor();
  const { multiDay, scale, coverage } = useViewWindow();
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [hoveredClusterDay, setHoveredClusterDay] = useState<number | null>(null);

  // Task 8b: same aggregation CostTimeseriesChart applies, so the graph
  // and scrubber always agree on exactly what the current scale shows --
  // useTimeCursor()'s own minMinute/maxMinute ALREADY equal the current
  // view window's bounds (see SimulationProvider.tsx's TimeCursorBridge),
  // so no separate window lookup is needed here.
  const costTimeseries = useMemo(() => {
    if (!multiDay) return rawCostTimeseries;
    if (scale === "week") return bucketByHour(rawCostTimeseries, minMinute, maxMinute);
    if (scale === "month") return bucketByDay(rawCostTimeseries, minMinute, maxMinute);
    return windowedCumulative(rawCostTimeseries, minMinute, maxMinute);
  }, [rawCostTimeseries, multiDay, scale, minMinute, maxMinute]);

  const disruptionMarkers = useMemo(() => (multiDay ? markersInWindow(rawMarkers, minMinute, maxMinute) : rawMarkers), [rawMarkers, multiDay, minMinute, maxMinute]);
  const clusters = useMemo(
    () => (multiDay && scale === "month" ? clusterMarkersByDay(rawMarkers, minMinute, maxMinute) : []),
    [rawMarkers, multiDay, scale, minMinute, maxMinute]
  );

  const sparkline = useMemo(() => buildCostSparkline(costTimeseries), [costTimeseries]);
  const maxValue = useMemo(() => Math.max(1, ...sparkline.values), [sparkline]);
  const span = Math.max(1, maxMinute - minMinute);

  const xFor = (min: number) => ((min - minMinute) / span) * VIEW_W;
  const sparkYFor = (value: number) => SPARK_BOTTOM - (value / maxValue) * (SPARK_BOTTOM - SPARK_TOP);

  const areaPath = useMemo(() => {
    if (sparkline.bucketStartMin.length === 0) return "";
    const points = sparkline.bucketStartMin.map((min, i) => `${xFor(min).toFixed(1)},${sparkYFor(sparkline.values[i] ?? 0).toFixed(1)}`);
    return `M0,${SPARK_BOTTOM} L${points.join(" L")} L${VIEW_W},${SPARK_BOTTOM} Z`;
  }, [sparkline, minMinute, maxMinute]); // eslint-disable-line react-hooks/exhaustive-deps

  // Midnight boundaries within the playable range -- DAY view (either the
  // original single-day span, or Task 8b's 3-day window) shows every one
  // crossed, labelled with a real date once multi-day (formatShort); the
  // original single-day case keeps its own "D1"-style label unchanged.
  // Week/month skip this entirely (too many boundaries at that scale to
  // stay quiet furniture -- see this component's own docstring).
  const showBoundaries = !multiDay || scale === "day";
  const dayBoundaries = useMemo(() => {
    if (!showBoundaries) return [];
    const bounds: number[] = [];
    const first = (Math.floor(minMinute / 1440) + 1) * 1440;
    for (let m = first; m < maxMinute; m += 1440) bounds.push(m);
    return bounds;
  }, [showBoundaries, minMinute, maxMinute]);

  const cursorX = xFor(currentMinute);
  const hoveredMarker = disruptionMarkers.find((m) => m.id === hoveredMarkerId) ?? null;
  const hoveredCluster = clusters.find((c) => c.dayStartMin === hoveredClusterDay) ?? null;

  return (
    <div>
      <div className="relative" style={{ height: VIEW_H }}>
        <input
          type="range"
          min={minMinute}
          max={maxMinute}
          step={1}
          value={currentMinute}
          onChange={(e) => setMinute(Number(e.target.value))}
          aria-label="Simulated time"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
        />

        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Sparkline: muted, quiet,  context, not a headline chart. Never
              categorical/gold, per the design system's semantic rules. */}
          <path d={areaPath} fill="#E4DCE6" fillOpacity={0.5} stroke="none" />
          <polyline
            points={sparkline.bucketStartMin.map((min, i) => `${xFor(min).toFixed(1)},${sparkYFor(sparkline.values[i] ?? 0).toFixed(1)}`).join(" ")}
            fill="none"
            stroke="#7A6E82"
            strokeWidth={1}
          />

          {/* Track background. */}
          <rect x={0} y={TRACK_Y} width={VIEW_W} height={TRACK_H} rx={3.5} fill="#EFEAE3" />
          {/* Elapsed portion, filled quietly (muted, not gold,  gold is
              reserved for recovered value, not part of this task). */}
          <rect x={0} y={TRACK_Y} width={Math.max(0, cursorX)} height={TRACK_H} rx={3.5} fill="#6A3B72" fillOpacity={0.55} />

          {dayBoundaries.map((boundaryMin) => (
            <g key={boundaryMin}>
              <line x1={xFor(boundaryMin)} y1={TICK_TOP} x2={xFor(boundaryMin)} y2={TICK_BOTTOM} stroke="#7A6E82" strokeWidth={1} strokeDasharray="2 2" />
              <text x={xFor(boundaryMin) + 3} y={SPARK_TOP + 7} fill="#7A6E82" fontSize={7} fontFamily="var(--font-mono)">
                {multiDay ? formatWindowTick(coverage.startDay, boundaryMin) : `D${boundaryMin / 1440}`}
              </text>
            </g>
          ))}

          {scale === "month" && multiDay
            ? clusters.map((c) => (
                <g key={c.dayStartMin} data-testid="scrubber-cluster-marker" data-count={c.markers.length}>
                  <line x1={xFor(c.dayStartMin)} y1={TICK_TOP} x2={xFor(c.dayStartMin)} y2={TICK_BOTTOM} stroke="#C1121F" strokeWidth={hoveredClusterDay === c.dayStartMin ? 2 : 1.4} />
                  <circle
                    cx={xFor(c.dayStartMin)}
                    cy={TICK_TOP}
                    r={7}
                    fill="transparent"
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredClusterDay(c.dayStartMin)}
                    onMouseLeave={() => setHoveredClusterDay((d) => (d === c.dayStartMin ? null : d))}
                    onClick={() => setMinute(c.dayStartMin)}
                  />
                  <circle cx={xFor(c.dayStartMin)} cy={TICK_TOP} r={2.5} fill="#C1121F" style={{ pointerEvents: "none" }} />
                  {c.markers.length > 1 && (
                    <text x={xFor(c.dayStartMin)} y={TICK_TOP - 3} textAnchor="middle" fontSize={6} fontFamily="var(--font-mono)" fill="#C1121F" fontWeight={600}>
                      {c.markers.length}
                    </text>
                  )}
                </g>
              ))
            : disruptionMarkers.map((m) => (
                <g key={m.id}>
                  <line x1={xFor(m.simMin)} y1={TICK_TOP} x2={xFor(m.simMin)} y2={TICK_BOTTOM} stroke="#C1121F" strokeWidth={hoveredMarkerId === m.id ? 2 : 1.4} />
                  {/* An oversized, transparent hit-circle -- easier to hover/click
                      than the thin line itself, without visually widening it. */}
                  <circle
                    cx={xFor(m.simMin)}
                    cy={TICK_TOP}
                    r={7}
                    fill="transparent"
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredMarkerId(m.id)}
                    onMouseLeave={() => setHoveredMarkerId((id) => (id === m.id ? null : id))}
                    onClick={() => setMinute(m.simMin)}
                  />
                  <circle cx={xFor(m.simMin)} cy={TICK_TOP} r={2.5} fill="#C1121F" style={{ pointerEvents: "none" }} />
                </g>
              ))}

          {/* The scrub handle, drawn on top so it's always visible even
              directly over a disruption tick. */}
          <line x1={cursorX} y1={TICK_TOP} x2={cursorX} y2={TICK_BOTTOM} stroke="#4A1E52" strokeWidth={1.5} />
          <circle cx={cursorX} cy={TRACK_Y + TRACK_H / 2} r={4.5} fill="#4A1E52" style={{ pointerEvents: "none" }} />
        </svg>

        {hoveredMarker && <MarkerBubble marker={hoveredMarker} leftPct={(xFor(hoveredMarker.simMin) / VIEW_W) * 100} />}
        {hoveredCluster && <ClusterBubble cluster={hoveredCluster} leftPct={(xFor(hoveredCluster.dayStartMin) / VIEW_W) * 100} />}
      </div>
    </div>
  );
}

/** Same FT-style restraint as the dashboard's own disruption-marker
 * bubble: one number (marginal cost), one line of context (label). */
function MarkerBubble({ marker, leftPct }: { marker: DisruptionMarker; leftPct: number }) {
  const clampedLeft = Math.min(78, Math.max(0, leftPct));
  return (
    <div
      className="absolute z-10 bg-elevated border border-border rounded-md px-2.5 py-1.5 pointer-events-none max-w-[220px]"
      style={{ left: `${clampedLeft}%`, top: 0 }}
    >
      <p className="font-mono tabular-nums text-sm text-red-soft font-medium">{formatUsd(marker.marginalCost.typical)}</p>
      <p className="text-xs text-muted mt-0.5">{marker.label}</p>
    </div>
  );
}

/** MONTH view: hover-reveal for a clustered day -- every marker that day
 * had, stacked, same restraint as MarkerBubble above. */
function ClusterBubble({ cluster, leftPct }: { cluster: ClusteredDisruptionMarker; leftPct: number }) {
  const clampedLeft = Math.min(78, Math.max(0, leftPct));
  return (
    <div
      className="absolute z-10 bg-elevated border border-border rounded-md px-2.5 py-1.5 pointer-events-none max-w-[220px]"
      style={{ left: `${clampedLeft}%`, top: 0 }}
      data-testid="scrubber-cluster-bubble"
    >
      {cluster.markers.map((marker, i) => (
        <div key={marker.id} className={i > 0 ? "mt-1.5 pt-1.5 border-t border-border" : ""}>
          <p className="font-mono tabular-nums text-sm text-red-soft font-medium">{formatUsd(marker.marginalCost.typical)}</p>
          <p className="text-xs text-muted mt-0.5">{marker.label}</p>
        </div>
      ))}
    </div>
  );
}
