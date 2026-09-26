"use client";

import { useMemo, useState } from "react";
import { useTimeCursor } from "@/lib/timeCursor";
import { useViewWindow } from "@/lib/viewWindowContext";
import { buildCostSparkline } from "@/lib/costSparkline";
import {
  windowedCumulative,
  bucketByHour,
  bucketByDay,
  markersInWindow,
  clusterMarkersByDay,
} from "@/lib/timeAggregation";
import { formatWindowTick } from "@/lib/viewScale";
import { formatUsd } from "@/lib/format";
import { RadarDot } from "@/components/ui/RadarDot";
import type { CostTimeseries, DisruptionMarker, ClusteredDisruptionMarker } from "@/lib/types";

const VIEW_W = 300;
const VIEW_H = 46;
const SPARK_TOP = 2;
const SPARK_BOTTOM = 28;
const TRACK_Y = 32;
const TRACK_H = 6;
const TICK_TOP = 2;
const TICK_BOTTOM = 38;

/**
 * Modern High-Precision Timeline Scrubber:
 * Combines cumulative cost sparkline, track progress, day boundaries,
 * and disruption marker pins.
 *
 * Typography & Aspect Ratio Fix:
 * All text labels (e.g. day boundaries like "Dec 2") and marker dots are
 * rendered as pure HTML absolute elements outside the SVG, eliminating
 * the horizontal font glyph distortion caused by SVG preserveAspectRatio="none".
 * Vector strokes use vectorEffect="non-scaling-stroke" for razor-sharp rendering.
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

  const costTimeseries = useMemo(() => {
    if (!multiDay) return rawCostTimeseries;
    if (scale === "week") return bucketByHour(rawCostTimeseries, minMinute, maxMinute);
    if (scale === "month") return bucketByDay(rawCostTimeseries, minMinute, maxMinute);
    return windowedCumulative(rawCostTimeseries, minMinute, maxMinute);
  }, [rawCostTimeseries, multiDay, scale, minMinute, maxMinute]);

  const disruptionMarkers = useMemo(
    () => (multiDay ? markersInWindow(rawMarkers, minMinute, maxMinute) : rawMarkers),
    [rawMarkers, multiDay, minMinute, maxMinute]
  );
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
    const points = sparkline.bucketStartMin.map(
      (min, i) => `${xFor(min).toFixed(1)},${sparkYFor(sparkline.values[i] ?? 0).toFixed(1)}`
    );
    return `M0,${SPARK_BOTTOM} L${points.join(" L")} L${VIEW_W},${SPARK_BOTTOM} Z`;
  }, [sparkline, minMinute, maxMinute]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="w-full" onTouchStart={(e) => e.stopPropagation()}>
      <div className="relative w-full" style={{ height: VIEW_H }}>
        {/* Transparent native range input for accessible drag & scrub */}
        <input
          type="range"
          min={minMinute}
          max={maxMinute}
          step={1}
          value={currentMinute}
          onChange={(e) => setMinute(Number(e.target.value))}
          onTouchStart={(e) => e.stopPropagation()}
          aria-label="Simulated time"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0 z-10 touch-manipulation"
        />

        {/* Scalable SVG for continuous geometry and lines */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <linearGradient id="scrubberCostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C5A059" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#C5A059" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Cost Sparkline Area & Stroke */}
          <path d={areaPath} fill="url(#scrubberCostGrad)" stroke="none" />
          <polyline
            points={sparkline.bucketStartMin
              .map((min, i) => `${xFor(min).toFixed(1)},${sparkYFor(sparkline.values[i] ?? 0).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke="#C5A059"
            strokeOpacity={0.65}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />

          {/* Track Background */}
          <rect
            x={0}
            y={TRACK_Y}
            width={VIEW_W}
            height={TRACK_H}
            rx={3}
            fill="rgba(255, 255, 255, 0.08)"
          />

          {/* Elapsed Progress Track */}
          <rect
            x={0}
            y={TRACK_Y}
            width={Math.max(0, cursorX)}
            height={TRACK_H}
            rx={3}
            fill="#C5A059"
            fillOpacity={0.9}
          />

          {/* Day Boundary Vertical Dashed Lines */}
          {dayBoundaries.map((boundaryMin) => (
            <line
              key={boundaryMin}
              x1={xFor(boundaryMin)}
              y1={TICK_TOP}
              x2={xFor(boundaryMin)}
              y2={TICK_BOTTOM}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Disruption Marker Vertical Tick Lines */}
          {scale === "month" && multiDay
            ? clusters.map((c) => (
                <line
                  key={c.dayStartMin}
                  x1={xFor(c.dayStartMin)}
                  y1={TICK_TOP}
                  x2={xFor(c.dayStartMin)}
                  y2={TICK_BOTTOM}
                  stroke="#EF4444"
                  strokeWidth={hoveredClusterDay === c.dayStartMin ? 2 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              ))
            : disruptionMarkers.map((m) => (
                <line
                  key={m.id}
                  x1={xFor(m.simMin)}
                  y1={TICK_TOP}
                  x2={xFor(m.simMin)}
                  y2={TICK_BOTTOM}
                  stroke="#EF4444"
                  strokeWidth={hoveredMarkerId === m.id ? 2 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

          {/* Scrub Needle Line */}
          <line
            x1={cursorX}
            y1={TICK_TOP}
            x2={cursorX}
            y2={TICK_BOTTOM}
            stroke="#ffffff"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* HTML Day Boundary Labels (natural typography, zero SVG stretching) */}
        {dayBoundaries.map((boundaryMin) => (
          <div
            key={boundaryMin}
            className="absolute pointer-events-none -translate-x-1/2 z-10 select-none"
            style={{
              left: `${(xFor(boundaryMin) / VIEW_W) * 100}%`,
              top: "1px",
            }}
          >
            <span className="font-mono text-[9px] text-slate-300 bg-[#0B132B]/90 px-1 py-0.5 rounded border border-white/10 whitespace-nowrap shadow-sm">
              {multiDay ? formatWindowTick(coverage.startDay, boundaryMin) : `D${boundaryMin / 1440}`}
            </span>
          </div>
        ))}

        {/* The Scrub Handle Circle (1:1 circular aspect ratio, centered on the track) */}
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 rounded-full bg-white shadow-[0_0_12px_rgba(197,160,89,0.9)] border-2 border-[#0B132B] z-20 flex items-center justify-center"
          style={{
            left: `${(cursorX / VIEW_W) * 100}%`,
            top: `${TRACK_Y + TRACK_H / 2}px`,
          }}
        >
          <span className="w-8 h-8 rounded-full bg-gold/15 pointer-events-none absolute" />
        </div>

        {/* Disruption Marker Pin Dots in HTML (crisp 1:1 circles directly on track) */}
        {scale === "month" && multiDay
          ? clusters.map((c) => (
              <div
                key={c.dayStartMin}
                data-testid="scrubber-cluster-marker"
                data-count={c.markers.length}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
                style={{
                  left: `${(xFor(c.dayStartMin) / VIEW_W) * 100}%`,
                  top: `${TRACK_Y + TRACK_H / 2}px`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setMinute(c.dayStartMin)}
                  onMouseEnter={() => setHoveredClusterDay(c.dayStartMin)}
                  onMouseLeave={() => setHoveredClusterDay((d) => (d === c.dayStartMin ? null : d))}
                  className="flex flex-col items-center justify-center cursor-pointer group p-0 m-0 border-0 bg-transparent"
                >
                  {c.markers.length > 1 && (
                    <span className="text-[8px] font-mono text-[#EF4444] font-bold -mb-0.5 pointer-events-none bg-[#0B132B]/90 px-0.5 rounded">
                      {c.markers.length}
                    </span>
                  )}
                  {hoveredClusterDay === c.dayStartMin ? (
                    <span className="w-3 h-3 rounded-full bg-white ring-2 ring-[#EF4444] scale-125 shadow-md transition-all" />
                  ) : (
                    <RadarDot size="sm" />
                  )}
                </button>
              </div>
            ))
          : disruptionMarkers.map((m) => (
              <div
                key={m.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
                style={{
                  left: `${(xFor(m.simMin) / VIEW_W) * 100}%`,
                  top: `${TRACK_Y + TRACK_H / 2}px`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setMinute(m.simMin)}
                  onMouseEnter={() => setHoveredMarkerId(m.id)}
                  onMouseLeave={() => setHoveredMarkerId((id) => (id === m.id ? null : id))}
                  className="w-4 h-4 flex items-center justify-center cursor-pointer group p-0 m-0 border-0 bg-transparent"
                >
                  {hoveredMarkerId === m.id ? (
                    <span className="w-3 h-3 rounded-full bg-white ring-2 ring-[#EF4444] scale-125 shadow-md transition-all" />
                  ) : (
                    <RadarDot size="sm" />
                  )}
                </button>
              </div>
            ))}

        {/* Disruption Popups */}
        {hoveredMarker && (
          <MarkerBubble marker={hoveredMarker} leftPct={(xFor(hoveredMarker.simMin) / VIEW_W) * 100} />
        )}
        {hoveredCluster && (
          <ClusterBubble
            cluster={hoveredCluster}
            leftPct={(xFor(hoveredCluster.dayStartMin) / VIEW_W) * 100}
          />
        )}
      </div>
    </div>
  );
}

function MarkerBubble({ marker, leftPct }: { marker: DisruptionMarker; leftPct: number }) {
  const clampedLeft = Math.min(80, Math.max(0, leftPct));
  return (
    <div
      className="absolute z-30 bg-[#0F172A]/95 backdrop-blur-md border border-white/15 shadow-xl rounded-md px-2.5 py-1.5 pointer-events-none max-w-[220px] -translate-y-full -top-1"
      style={{ left: `${clampedLeft}%` }}
    >
      <p className="font-mono tabular-nums text-xs text-white font-semibold">
        {formatUsd(marker.marginalCost.typical)}
      </p>
      <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">{marker.label}</p>
    </div>
  );
}

function ClusterBubble({
  cluster,
  leftPct,
}: {
  cluster: ClusteredDisruptionMarker;
  leftPct: number;
}) {
  const clampedLeft = Math.min(80, Math.max(0, leftPct));
  return (
    <div
      className="absolute z-30 bg-[#0F172A]/95 backdrop-blur-md border border-white/15 shadow-xl rounded-md px-2.5 py-1.5 pointer-events-none max-w-[220px] -translate-y-full -top-1"
      style={{ left: `${clampedLeft}%` }}
      data-testid="scrubber-cluster-bubble"
    >
      {cluster.markers.map((marker, i) => (
        <div key={marker.id} className={i > 0 ? "mt-1.5 pt-1.5 border-t border-white/10" : ""}>
          <p className="font-mono tabular-nums text-xs text-white font-semibold">
            {formatUsd(marker.marginalCost.typical)}
          </p>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">{marker.label}</p>
        </div>
      ))}
    </div>
  );
}
