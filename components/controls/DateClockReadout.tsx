"use client";

import { useTimeCursor } from "@/lib/timeCursor";
import { formatSimClock } from "@/lib/format";

/** Parses "2025-12-15" as UTC midnight (not local time -- avoids the
 * date silently shifting a day depending on the viewer's timezone).
 * Exported for ScenarioScopePanel.tsx, which merges in the "scenario
 * date" chip this component used to render itself. */
export function parseScenarioDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * The live D0/D1 + HH:MM readout, moving with the cursor. The static
 * "scenario date" chip that used to live directly beneath this moved
 * into ScenarioScopePanel.tsx (see TimeControlPanel.tsx), which merges it
 * with the day/week/month scope controls so date + granularity read as
 * ONE decision instead of two separate cards.
 */
export function DateClockReadout({ day }: { day: string }) {
  const { currentMinute } = useTimeCursor();

  const dayOffset = Math.floor(currentMinute / 1440);

  const baseDate = parseScenarioDay(day);
  const displayDate = new Date(baseDate);
  displayDate.setUTCDate(displayDate.getUTCDate() + dayOffset);

  return (
    <div>
      <div className="font-mono tabular-nums text-2xl text-aubergine font-medium">{formatSimClock(currentMinute)}</div>
      <p className="text-xs text-muted mt-1">{formatCalendarDate(displayDate)}</p>
    </div>
  );
}
