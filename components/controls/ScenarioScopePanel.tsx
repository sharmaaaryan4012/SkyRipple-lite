"use client";

import { useViewWindow } from "@/lib/viewWindowContext";
import { formatShort, dayDiff, type ViewScale } from "@/lib/viewScale";
import { parseScenarioDay, formatCalendarDate } from "./DateClockReadout";

const SCALES: ViewScale[] = ["day", "week", "month"];

/**
 * "SCENARIO SCOPE" -- the day/week/month granularity toggle + its
 * adaptive date/range picker, relocated here (out of the cost-chart
 * card) so date + granularity read as ONE decision made in the controls
 * rail, directly below "Simulated time" -- not a control that happens to
 * live next to the one chart it affects. Also absorbs the old static
 * "scenario date" chip (see DateClockReadout.tsx's own docstring): for a
 * single-day scenario this renders EXACTLY that chip, byte-identical,
 * and nothing else -- the "never offer a selection the data doesn't
 * support" rule applied at its strictest, same as the toggle's own prior
 * "renders nothing for single-day" behavior, just now expressed as "the
 * merged card falls back to the plain chip" instead of "the toggle
 * disappears and the chip lives elsewhere."
 *
 * The SIMULATED TIME readout above already updates itself on every scope
 * change with NO extra wiring here: TimeCursorBridge (SimulationProvider.tsx)
 * remounts TimeCursorProvider whenever the resolved window's own
 * startMin/endMin change, and TimeCursorProvider's cursor always
 * initializes to the window's own start -- so picking a new day/week/
 * month, or a new specific day/week within it, already jumps the clock
 * to the start of that scope by construction.
 */
export function ScenarioScopePanel({ day }: { day: string }) {
  const { multiDay, scale, setScale, pickedDay, setPickedDay, dayOptions, pickedWeek, setPickedWeek, weekOptions, window } = useViewWindow();

  if (!multiDay) {
    return (
      <div className="flex items-center justify-between gap-2 bg-elevated border border-border rounded px-2.5 py-1.5">
        <span className="text-sm text-aubergine">{formatCalendarDate(parseScenarioDay(day))}</span>
        <span className="text-[10px] text-muted uppercase tracking-wide shrink-0">only date loaded</span>
      </div>
    );
  }

  // Status text honestly reflects what's ACTUALLY selected -- a single
  // day at DAY scale (even though the chart pads a day on either side for
  // context), a real N-day span at WEEK/MONTH scale -- never implying more
  // or less than the current scope covers.
  const dayCount = dayDiff(window.startDay, window.endDay) + 1;
  const statusTag = scale === "day" ? "single day view" : `${dayCount} days selected`;
  const dateValue = scale === "day" ? formatCalendarDate(parseScenarioDay(pickedDay)) : window.label;

  return (
    <div className="flex flex-col gap-2" data-testid="view-scale-toggle">
      <div className="flex border border-border rounded overflow-hidden" role="tablist" aria-label="View scale">
        {SCALES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={scale === s}
            data-testid={`view-scale-${s}`}
            onClick={() => setScale(s)}
            className={`flex-1 font-mono text-xs uppercase tracking-widest px-2 py-1.5 state-transition ${s !== "day" ? "border-l border-border" : ""} ${
              scale === s ? "bg-aubergine text-page" : "bg-surface text-aubergine-soft hover:text-aubergine"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {scale === "day" && (
        <select
          value={pickedDay}
          onChange={(e) => setPickedDay(e.target.value)}
          aria-label="Pick a day"
          data-testid="day-picker"
          className="w-full font-mono tabular-nums text-xs border border-border rounded px-2 py-1.5 bg-surface text-aubergine state-transition"
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>
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
          className="w-full font-mono tabular-nums text-xs border border-border rounded px-2 py-1.5 bg-surface text-aubergine state-transition"
        >
          {weekOptions.map((w) => (
            <option key={w.label} value={w.label}>
              {w.label}
            </option>
          ))}
        </select>
      )}

      {scale === "month" && (
        <span className="font-mono text-xs text-aubergine-soft px-2 py-1.5" data-testid="month-label">
          {window.label}
        </span>
      )}

      <div className="flex items-center justify-between gap-2 bg-elevated border border-border rounded px-2.5 py-1.5 mt-1">
        <span className="text-sm text-aubergine">{dateValue}</span>
        <span className="text-[10px] text-muted uppercase tracking-wide shrink-0">{statusTag}</span>
      </div>
    </div>
  );
}
