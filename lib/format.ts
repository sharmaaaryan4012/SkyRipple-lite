/** Shared number formatting so every dollar figure and minute count in the
 * app renders identically (same thousands separators, same decimal rules). */

export function formatUsd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
}

export function formatMinutes(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} min`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** "D0 08:00",  the shared simulated-clock convention (day-offset +
 * HH:MM within that day), lifted out of DateClockReadout.tsx so the map's
 * hover box / detail panel (Task B) can render the SAME convention for a
 * flight's departure/arrival minute without re-deriving the day-offset
 * math in a second place. `min` is minutes since the scenario day's own
 * midnight (D0 00:00), exactly like TimeCursor's own currentMinute. */
export function formatSimClock(min: number): string {
  const dayOffset = Math.floor(min / 1440);
  const minuteOfDay = Math.floor(min) % 1440;
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `D${dayOffset} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "SWAP_TAILS" -> "Swap tails" -- a RecoveryAction's action_type, for
 * the before/after recovery view's action list (dashboard/RecoveryReveal.tsx)
 * and the map click-panel's per-flight recovery detail (map/MapDetailPanel.tsx). */
export function humanizeActionType(actionType: string): string {
  return actionType
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
