"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ScenarioMeta } from "./types";
import {
  type Coverage,
  type ViewScale,
  type ViewWindow,
  type WeekOption,
  getCoverage,
  isWeekMonthEnabled,
  dayOptions,
  weekOptions,
  dayWindow,
  weekWindow,
  monthWindow,
} from "./viewScale";

export interface ViewWindowContextValue {
  /** The scenario's real date coverage (single-day scenarios report
   * startDay === endDay === meta.day -- see viewScale.ts). */
  coverage: Coverage;
  /** False for any pre-8b / single-day / live-chat scenario -- the ONE
   * flag every new component in this feature checks before doing
   * anything different from its pre-8b behavior (see each component's
   * own "pass through unchanged" branch). */
  multiDay: boolean;
  scale: ViewScale;
  setScale: (scale: ViewScale) => void;
  /** The CURRENT resolved window -- for a single-day scenario this is
   * ALWAYS `fullBounds` unchanged, regardless of `scale` (the toggle
   * falls back to the plain "scenario date" chip in that case anyway --
   * see components/controls/ScenarioScopePanel.tsx). */
  window: ViewWindow;
  pickedDay: string;
  setPickedDay: (day: string) => void;
  dayOptions: string[];
  pickedWeek: WeekOption | null;
  setPickedWeek: (week: WeekOption) => void;
  weekOptions: WeekOption[];
}

const ViewWindowContext = createContext<ViewWindowContextValue | null>(null);

/**
 * Task 8b: owns the day/week/month view-toggle state (which scale,
 * which picker selection) for one loaded scenario, and resolves it into
 * the CURRENT ViewWindow every consumer (CostTimeseriesChart,
 * TimelineScrubber, RecoverySavingsChart, ScenarioScopePanel) reads from
 * useViewWindow(). Mounted by SimulationProvider.tsx, wrapping
 * TimeCursorProvider so the SAME window that drives the graph/scrubber
 * ALSO drives the map's own scrub-cursor bounds (see that file's own
 * comment on why TimeCursorProvider needs to remount when the window
 * changes).
 *
 * REGRESSION SAFETY: `multiDay` is the single gate every new piece of
 * this feature checks. A scenario without BOTH meta.startDay/endDay (or
 * with startDay === endDay) is `multiDay: false`, `window` is pinned to
 * `fullBounds` forever regardless of `scale` state, and
 * ScenarioScopePanel.tsx falls back to the plain "scenario date" chip
 * with no toggle at all -- so a pre-8b scenario (or any live
 * /api/simulate|/api/parse-and-simulate result, always single-day) takes
 * the EXACT SAME code path through every consumer as before this
 * feature existed.
 */
export function ViewWindowProvider({
  meta,
  fullBounds,
  children,
}: {
  meta: ScenarioMeta;
  fullBounds: { minMinute: number; maxMinute: number };
  children: React.ReactNode;
}) {
  const coverage = useMemo(() => getCoverage(meta), [meta]);
  const multiDay = isWeekMonthEnabled(coverage);

  const [scale, setScale] = useState<ViewScale>("day");
  const [pickedDay, setPickedDay] = useState<string>(coverage.startDay);
  const weekOpts = useMemo(() => weekOptions(coverage), [coverage]);
  const [pickedWeek, setPickedWeek] = useState<WeekOption | null>(weekOpts[0] ?? null);

  const window: ViewWindow = useMemo(() => {
    if (!multiDay) {
      return {
        scale: "day",
        startMin: fullBounds.minMinute,
        endMin: fullBounds.maxMinute,
        startDay: coverage.startDay,
        endDay: coverage.endDay,
        label: meta.label,
      };
    }
    if (scale === "week") return weekWindow(pickedWeek ?? weekOpts[0], coverage);
    if (scale === "month") return monthWindow(coverage);
    return dayWindow(pickedDay, coverage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiDay, scale, pickedDay, pickedWeek, coverage, fullBounds]);

  const value: ViewWindowContextValue = {
    coverage,
    multiDay,
    scale,
    setScale,
    window,
    pickedDay,
    setPickedDay,
    dayOptions: useMemo(() => dayOptions(coverage), [coverage]),
    pickedWeek,
    setPickedWeek,
    weekOptions: weekOpts,
  };

  return <ViewWindowContext.Provider value={value}>{children}</ViewWindowContext.Provider>;
}

export function useViewWindow(): ViewWindowContextValue {
  const ctx = useContext(ViewWindowContext);
  if (!ctx) throw new Error("useViewWindow must be called within a ViewWindowProvider");
  return ctx;
}
