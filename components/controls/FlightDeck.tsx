"use client";

import { useMemo } from "react";
import { useTimeCursor } from "@/lib/timeCursor";
import { useViewWindow } from "@/lib/viewWindowContext";
import { formatSimClock } from "@/lib/format";
import { markersInWindow } from "@/lib/timeAggregation";
import { formatShort, dayDiff, type ViewScale } from "@/lib/viewScale";
import { parseScenarioDay, formatCalendarDate } from "./DateClockReadout";
import { TimelineScrubber } from "./TimelineScrubber";
import { RadarDot } from "@/components/ui/RadarDot";
import type { ScenarioData } from "@/lib/types";

const SPEEDS = [1, 2, 4] as const;
const SCALES: ViewScale[] = ["day", "week", "month"];

/**
 * OCC FlightDeck & Horizon Console:
 * Integrates the time scope controller (Day / Week / Month + date picker)
 * directly with the timeline playback controls and high-precision scrubber.
 *
 * Tier 1 (Scope Strip): Granularity switcher, calendar range dropdown, and active incident jumps.
 * Tier 2 (Scrubber Track): Playback toggle, speed multipliers, cost sparkline scrubber, and live UTC clock.
 */
export function FlightDeck({ scenario }: { scenario: ScenarioData }) {
  const {
    isPlaying,
    toggle,
    speedMultiplier,
    setSpeedMultiplier,
    setMinute,
    currentMinute,
    minMinute,
    maxMinute,
  } = useTimeCursor();

  const {
    multiDay,
    scale,
    setScale,
    pickedDay,
    setPickedDay,
    dayOptions,
    pickedWeek,
    setPickedWeek,
    weekOptions,
    window,
  } = useViewWindow();

  const disruptionMarkers = useMemo(
    () => (multiDay ? markersInWindow(scenario.disruptionMarkers, minMinute, maxMinute) : scenario.disruptionMarkers),
    [scenario.disruptionMarkers, multiDay, minMinute, maxMinute]
  );

  const dayOffset = Math.floor(currentMinute / 1440);
  const baseDate = parseScenarioDay(scenario.meta.day);
  const displayDate = new Date(baseDate);
  displayDate.setUTCDate(displayDate.getUTCDate() + dayOffset);

  const activeDisruption = disruptionMarkers[0];

  const dayCount = dayDiff(window.startDay, window.endDay) + 1;
  const statusTag = scale === "day" ? "single day view" : `${dayCount} days selected`;

  return (
    <div className="bg-surface border border-border rounded-md px-3.5 py-2.5 flex flex-col gap-2 shrink-0 shadow-lg select-none" onTouchStart={(e) => e.stopPropagation()}>
      {/* Tier 1: Time Horizon & Scope Changing Menu */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 w-full pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider font-semibold mr-0.5">
            Scope
          </span>

          {multiDay ? (
            <div className="flex items-center gap-2 flex-wrap" data-testid="view-scale-toggle">
              {/* Day / Week / Month Granularity Switcher */}
              <div
                className="flex items-center bg-elevated border border-border rounded-md overflow-hidden p-0.5"
                role="tablist"
                aria-label="View scale"
              >
                {SCALES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={scale === s}
                    data-testid={`view-scale-${s}`}
                    onClick={() => setScale(s)}
                    className={`font-mono text-xs uppercase tracking-wider px-2.5 py-0.5 rounded transition-colors ${
                      scale === s
                        ? "bg-gold text-page font-bold shadow-sm"
                        : "text-muted hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Contextual Date Picker Dropdown */}
              {scale === "day" && (
                <select
                  value={pickedDay}
                  onChange={(e) => setPickedDay(e.target.value)}
                  aria-label="Pick a day"
                  data-testid="day-picker"
                  className="font-mono tabular-nums text-xs border border-border rounded-md px-2.5 py-1 bg-elevated text-white focus:outline-none focus:border-gold cursor-pointer"
                >
                  {dayOptions.map((d) => (
                    <option key={d} value={d} className="bg-page text-white">
                      {formatShort(d)}
                    </option>
                  ))}
                </select>
              )}

              {scale === "week" && (
                <select
                  value={pickedWeek?.label ?? ""}
                  onChange={(e) => {
                    const opt = weekOptions.find((w) => w.label === e.target.value);
                    if (opt) setPickedWeek(opt);
                  }}
                  aria-label="Pick a week"
                  data-testid="week-picker"
                  className="font-mono tabular-nums text-xs border border-border rounded-md px-2.5 py-1 bg-elevated text-white focus:outline-none focus:border-gold cursor-pointer"
                >
                  {weekOptions.map((w) => (
                    <option key={w.label} value={w.label} className="bg-page text-white">
                      {w.label}
                    </option>
                  ))}
                </select>
              )}

              {scale === "month" && (
                <span
                  className="font-mono text-xs text-white/90 bg-elevated border border-border rounded-md px-2.5 py-1"
                  data-testid="month-label"
                >
                  {window.label}
                </span>
              )}

              {/* Scope Horizon Summary Badge */}
              <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] border border-white/5 px-2 py-0.5 rounded hidden sm:inline">
                {statusTag}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-elevated border border-border rounded px-2.5 py-1">
              <span className="font-mono text-xs text-white">
                {formatCalendarDate(parseScenarioDay(scenario.meta.day))}
              </span>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wide">
                single day view
              </span>
            </div>
          )}
        </div>

        {/* Disruption Quick Jump Shortcut */}
        {activeDisruption && (
          <button
            onClick={() => setMinute(activeDisruption.simMin)}
            title={activeDisruption.label}
            className="flex items-center gap-2 font-mono text-xs text-[#F87171] bg-red-950/25 border border-red-900/40 rounded-md px-2.5 py-1 hover:bg-red-950/50 transition-colors shrink-0 ml-auto"
          >
            <RadarDot size="sm" />
            <span className="font-medium">Jump to Incident</span>
          </button>
        )}
      </div>

      {/* Tier 2: Playback Controls, Full-Width Scrubber, Clock Readout */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        {/* Playback Controls with min 44px touch targets */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            className={`min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-md border transition-all ${
              isPlaying
                ? "bg-gold text-page border-gold shadow-[0_0_12px_rgba(197,160,89,0.3)] font-bold"
                : "bg-elevated border-border text-white hover:bg-white/10"
            }`}
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                <rect x="1" y="0.5" width="3" height="9" rx="0.5" />
                <rect x="6" y="0.5" width="3" height="9" rx="0.5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor" className="ml-0.5">
                <path d="M1 0.5L9.5 5L1 9.5V0.5Z" />
              </svg>
            )}
          </button>

          <div className="flex items-center bg-elevated border border-border rounded-md overflow-hidden p-0.5">
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeedMultiplier(speed)}
                className={`font-mono tabular-nums text-xs px-2.5 py-1.5 sm:py-0.5 min-h-[36px] sm:min-h-0 rounded transition-colors ${
                  speedMultiplier === speed
                    ? "bg-white/15 text-white font-semibold shadow-sm"
                    : "text-muted hover:text-white"
                }`}
              >
                {speed}&times;
              </button>
            ))}
          </div>
        </div>

        {/* Center: Full-Width Scrubber with Cost Sparkline */}
        <div className="flex-1 w-full min-w-0">
          <TimelineScrubber
            costTimeseries={scenario.costTimeseries}
            disruptionMarkers={scenario.disruptionMarkers}
          />
        </div>

        {/* Right: Digital Sim Clock & Calendar Date */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pl-0 sm:pl-3 border-t sm:border-t-0 sm:border-l border-border pt-1.5 sm:pt-0 min-w-[96px]">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono tabular-nums text-lg sm:text-xl font-semibold text-white tracking-tight">
              {formatSimClock(currentMinute)}
            </span>
            <span className="font-mono text-[10px] text-gold uppercase tracking-wider font-medium">
              {dayOffset > 0 ? `D+${dayOffset}` : "D0"}
            </span>
          </div>
          <p className="font-mono text-[10px] text-muted truncate">
            {formatCalendarDate(displayDate)}
          </p>
        </div>
      </div>
    </div>
  );
}
