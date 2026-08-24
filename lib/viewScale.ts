/**
 * Task 8b: the day/week/month view toggle's own coverage + windowing
 * logic -- pure date arithmetic, no rendering. A scenario's real date
 * coverage lives in ScenarioMeta.startDay/endDay (Task 8b's own
 * additive fields, see lib/types.ts); a scenario built before 8b (or
 * any live /api/simulate|/api/parse-and-simulate result, which is
 * always single-day) simply lacks them, and every function here treats
 * that as "day view only, pinned to `meta.day`" -- NEVER fabricates a
 * range from a single day. This is what satisfies the "never offer a
 * selection the data doesn't support" requirement: the UI can only ever
 * ask this module what's actually available.
 */

import type { ScenarioMeta } from "./types";

export type ViewScale = "day" | "week" | "month";

export interface Coverage {
  startDay: string;
  endDay: string;
}

export interface ViewWindow {
  scale: ViewScale;
  /** Global-axis minutes, 0 at `startDay`'s own midnight -- the same
   * axis every CostTimeseries/DisruptionMarker in an 8b-era scenario
   * already uses. */
  startMin: number;
  endMin: number;
  startDay: string;
  endDay: string;
  label: string;
}

export interface WeekOption {
  label: string; // "Dec 15-21"
  startDay: string; // clamped to coverage
  endDay: string;
}

const MS_PER_DAY = 86_400_000;
const MONTH_LABEL = "December 2025";

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toIso(new Date(toDate(iso).getTime() + n * MS_PER_DAY));
}

export function dayDiff(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / MS_PER_DAY);
}

function clampDay(iso: string, lo: string, hi: string): string {
  if (iso < lo) return lo;
  if (iso > hi) return hi;
  return iso;
}

export function formatShort(iso: string): string {
  const d = toDate(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * x-axis tick label for a GLOBAL minute (0 at the SCENARIO's own
 * coverage.startDay midnight -- the same axis useTimeCursor() and every
 * DisruptionMarker.simMin already use, see lib/timeAggregation.ts's own
 * docstring for why bucketStartMin is never rebased to 0) at week/month
 * scale -- "Dec 15" for a day bucket (month view, always exactly
 * midnight), "Dec 15 14:00" for an hour bucket (week view). Day view
 * keeps its own existing "D0 HH:MM" convention (CostTimeseriesChart's
 * formatSimTime) unchanged -- this is only for the two NEW scales.
 */
export function formatWindowTick(coverageStartDay: string, minuteOfGlobalAxis: number): string {
  const dayOffset = Math.floor(minuteOfGlobalAxis / 1440);
  const minuteOfDay = ((minuteOfGlobalAxis % 1440) + 1440) % 1440;
  const iso = addDays(coverageStartDay, dayOffset);
  if (minuteOfDay === 0) return formatShort(iso);
  const h = Math.floor(minuteOfDay / 60);
  const m = Math.round(minuteOfDay % 60);
  return `${formatShort(iso)} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** meta.startDay/endDay if BOTH present, else a single-day coverage
 * pinned to meta.day -- see this module's own docstring. */
export function getCoverage(meta: ScenarioMeta): Coverage {
  if (meta.startDay && meta.endDay) return { startDay: meta.startDay, endDay: meta.endDay };
  return { startDay: meta.day, endDay: meta.day };
}

export function isMultiDay(coverage: Coverage): boolean {
  return coverage.startDay !== coverage.endDay;
}

/** Every ISO date the day picker may offer, in order. */
export function dayOptions(coverage: Coverage): string[] {
  const n = dayDiff(coverage.startDay, coverage.endDay) + 1;
  return Array.from({ length: n }, (_, i) => addDays(coverage.startDay, i));
}

/** minMinute for a coverage's own global axis is always 0 (0 at
 * coverage.startDay's midnight); this is the axis every 8b-era
 * scenario's CostTimeseries/DisruptionMarker already uses. */
export function dayToGlobalMin(coverage: Coverage, day: string): number {
  return dayDiff(coverage.startDay, day) * 1440;
}

/** DAY view: a 3-day window centered on `pickedDay` (picked-1, picked,
 * picked+1), clamped to the scenario's own coverage at either edge
 * (picking the very first or last covered day shows a 2-day window
 * rather than fabricating a day before/after the data -- see Task 8b's
 * own December-edge-case instruction: "clamped... whichever is honest
 * given the data range"). */
export function dayWindow(pickedDay: string, coverage: Coverage): ViewWindow {
  const wantedStart = addDays(pickedDay, -1);
  const wantedEnd = addDays(pickedDay, 1);
  const startDay = clampDay(wantedStart, coverage.startDay, coverage.endDay);
  const endDay = clampDay(wantedEnd, coverage.startDay, coverage.endDay);
  return {
    scale: "day",
    startMin: dayToGlobalMin(coverage, startDay),
    endMin: dayToGlobalMin(coverage, endDay) + 1440,
    startDay,
    endDay,
    label: startDay === endDay ? formatShort(startDay) : `${formatShort(startDay)} - ${formatShort(endDay)}`,
  };
}

const DECEMBER_WEEKS: { startDay: string; endDay: string }[] = [
  { startDay: "2025-12-01", endDay: "2025-12-07" },
  { startDay: "2025-12-08", endDay: "2025-12-14" },
  { startDay: "2025-12-15", endDay: "2025-12-21" },
  { startDay: "2025-12-22", endDay: "2025-12-28" },
  { startDay: "2025-12-29", endDay: "2025-12-31" },
];

/** December's fixed calendar weeks, filtered to only those overlapping
 * `coverage`, each clamped to the coverage's own bounds -- "only weeks
 * overlapping that range are selectable" (Task 8b's own coverage-
 * constraint requirement). */
export function weekOptions(coverage: Coverage): WeekOption[] {
  return DECEMBER_WEEKS.filter((w) => w.startDay <= coverage.endDay && w.endDay >= coverage.startDay).map((w) => {
    const startDay = clampDay(w.startDay, coverage.startDay, coverage.endDay);
    const endDay = clampDay(w.endDay, coverage.startDay, coverage.endDay);
    // The LABEL reflects the CLAMPED range, not the canonical calendar
    // week -- a week option that's only partially covered must say so
    // (e.g. "Dec 22 - Dec 22" when coverage ends there), never promise
    // more than what picking it will actually show.
    return { label: `${formatShort(startDay)} - ${formatShort(endDay)}`, startDay, endDay };
  });
}

export function weekWindow(option: WeekOption, coverage: Coverage): ViewWindow {
  return {
    scale: "week",
    startMin: dayToGlobalMin(coverage, option.startDay),
    endMin: dayToGlobalMin(coverage, option.endDay) + 1440,
    startDay: option.startDay,
    endDay: option.endDay,
    label: option.label,
  };
}

/** MONTH view: the scenario's FULL coverage, no sub-selection. Labelled
 * "December 2025" only when the coverage genuinely IS all of December;
 * otherwise the actual covered span, honestly -- never claims coverage
 * the data doesn't have. */
export function monthWindow(coverage: Coverage): ViewWindow {
  const isFullDecember = coverage.startDay === "2025-12-01" && coverage.endDay === "2025-12-31";
  return {
    scale: "month",
    startMin: 0,
    endMin: (dayDiff(coverage.startDay, coverage.endDay) + 1) * 1440,
    startDay: coverage.startDay,
    endDay: coverage.endDay,
    label: isFullDecember ? MONTH_LABEL : `${formatShort(coverage.startDay)} - ${formatShort(coverage.endDay)}`,
  };
}

/** Week/month views need genuine multi-day data to be worth anything --
 * disabled for a single-day scenario (Task 8b's own regression case:
 * pre-8b scenarios, and every live chat-driven result, are always
 * single-day). */
export function isWeekMonthEnabled(coverage: Coverage): boolean {
  return isMultiDay(coverage);
}
