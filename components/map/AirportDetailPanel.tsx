"use client";

import { useState } from "react";
import { formatCount, formatSimClock, formatUsd } from "@/lib/format";
import { SEVERITY_COLORS } from "@/lib/severity";
import { RangeValue } from "@/components/ui/RangeValue";
import { useInspectorMode } from "@/lib/inspectorMode";
import type { AirportMeta, AirportDailyStats, DisruptionMarker } from "@/lib/types";
import type { AirportFlightRow, AirportPanelStats } from "@/lib/airportAggregation";

const DEFAULT_SHOWN_FLIGHTS = 15;

/**
 * Task 8c: the airport click-detail panel, structurally IDENTICAL to
 * MapDetailPanel.tsx (same slide-in-from-right/340px/bg-surface shell,
 * same section-header convention `font-mono text-xs uppercase
 * tracking-widest text-aubergine-soft mb-2`, same close-button markup)
 * so the two panels read as ONE consistent system, never shown at the
 * same time (USMap.tsx's focusedLegId/focusedAirportIata are mutually
 * exclusive by construction).
 *
 * Every number here is either straight from AirportMeta (identity) or
 * from `stats`/`perDayRows` -- both computed by the caller via
 * lib/airportAggregation.ts from already-loaded scenario data, reusing
 * the SAME ledger-grouped-by-airport cost figures the reconciliation
 * check (checkpoint 4) verifies sum to the scenario's own total. Nothing
 * here is computed independently or re-derived.
 */
export function AirportDetailPanel({
  airport,
  stats,
  disruptions,
  perDayRows,
  departures,
  arrivals,
  flightsDetailDay,
  onSelectFlight,
  onClose,
}: {
  airport: AirportMeta;
  stats: AirportPanelStats;
  disruptions: DisruptionMarker[];
  /** Multi-day scenarios only -- one row per day in the current view
   * window, in order. undefined for a single-day scenario (no per-day
   * breakdown section renders at all). */
  perDayRows?: { day: string; stats: AirportDailyStats }[];
  /** Individual flights departing/arriving at this airport, straight off
   * the already-loaded flights array (see lib/airportAggregation.ts's
   * airportFlights). undefined for a multi-day scenario UNLESS Inspector
   * Mode is on (see USMap.tsx's own focusedAirportFlights) -- flights.json
   * never covers a genuine multi-day range (see that module's own
   * docstring), so outside Inspector Mode there's no honest per-flight
   * list to show there. */
  departures?: AirportFlightRow[];
  arrivals?: AirportFlightRow[];
  /** Set (to the one real day flights.json covers) only when `departures`/
   * `arrivals` are being shown for a MULTI-DAY scenario via the Inspector
   * Mode exception above -- renders the "this is one day's data, not the
   * whole range" caveat. undefined for a single-day scenario, where the
   * list already covers the only day that exists (no caveat needed). */
  flightsDetailDay?: string;
  /** Clicking a flight row jumps into that flight's own focus mode
   * (USMap.tsx's setFocusedLegId), closing this airport panel -- the
   * same "last click wins" rule every other focus transition on this
   * map already follows. */
  onSelectFlight?: (legId: string) => void;
  onClose: () => void;
}) {
  const depPct = stats.flightsScheduledDeparting > 0 ? Math.round((stats.flightsDelayedDeparting / stats.flightsScheduledDeparting) * 100) : 0;
  const arrPct = stats.flightsScheduledArriving > 0 ? Math.round((stats.flightsDelayedArriving / stats.flightsScheduledArriving) * 100) : 0;
  const [showAllDep, setShowAllDep] = useState(false);
  const [showAllArr, setShowAllArr] = useState(false);
  // Inspector Mode (Task 8f): every departure/arrival at this airport,
  // not just the default-capped 15 -- a developer inspecting an airport
  // wants the full list up front, not an extra click per airport.
  const { enabled: inspectorMode } = useInspectorMode();

  type AirportTab = "overview" | "departures" | "arrivals";
  const [tab, setTab] = useState<AirportTab>("overview");
  // Departures/Arrivals tabs only exist when there's real per-flight data
  // to show them -- mirrors MapDetailPanel's own "tabs that need data
  // simply don't render" rule (see that component's showTabs). Falls
  // back to "overview" if the CURRENTLY selected tab's data disappears
  // out from under it (e.g. Inspector Mode gets toggled off while a
  // Departures tab is open).
  const hasFlightTabs = !!(departures || arrivals);
  const activeTab: AirportTab = hasFlightTabs ? tab : "overview";

  return (
    <div className="absolute top-0 right-0 h-full w-[340px] bg-surface border-l border-border overflow-y-auto state-transition" data-testid="airport-detail-panel">
      <div className="flex items-start justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="font-display text-lg font-semibold text-aubergine">{airport.iata}</p>
          <p className="text-xs text-muted mt-0.5">{airport.name}</p>
          {/* cityName already carries ", ST" (aviation.db's own
              convention, e.g. "Chicago, IL") -- see AirportHoverBox.tsx's
              own comment on the same field. */}
          <p className="font-mono text-xs text-muted mt-0.5">{airport.cityName}</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-aubergine state-transition text-lg leading-none px-1" aria-label="Close">
          &times;
        </button>
      </div>

      {hasFlightTabs && (
        <div className="flex border-b border-border" role="tablist" aria-label="Airport detail tabs">
          {(
            [
              ["overview", "Overview"],
              ["departures", `Departures${departures ? ` (${departures.length})` : ""}`],
              ["arrivals", `Arrivals${arrivals ? ` (${arrivals.length})` : ""}`],
            ] as [AirportTab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={activeTab === t}
              data-testid={`airport-tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 font-mono text-[11px] uppercase tracking-widest px-2 py-2 state-transition ${
                activeTab === t ? "bg-aubergine text-page" : "bg-surface text-aubergine-soft hover:text-aubergine"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "departures" && departures ? (
        <FlightList
          title="Departures"
          rows={departures}
          timeLabel="Dep"
          showAll={showAllDep}
          forceShowAll={inspectorMode}
          onToggleShowAll={() => setShowAllDep((v) => !v)}
          onSelectFlight={onSelectFlight}
        />
      ) : activeTab === "arrivals" && arrivals ? (
        <FlightList
          title="Arrivals"
          rows={arrivals}
          timeLabel="Arr"
          showAll={showAllArr}
          forceShowAll={inspectorMode}
          onToggleShowAll={() => setShowAllArr((v) => !v)}
          onSelectFlight={onSelectFlight}
        />
      ) : (
        <>
          <div className="px-4 py-3 border-b border-border">
            <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Disruption status</p>
            {disruptions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {disruptions.map((d) => (
                  <div key={d.id}>
                    <p className="text-xs text-red-soft font-medium">{d.label}</p>
                    <p className="font-mono text-[11px] text-muted mt-0.5">
                      marginal cost {formatUsd(d.marginalCost.typical)} (range {formatUsd(d.marginalCost.low)}&ndash;{formatUsd(d.marginalCost.high)})
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No disruption injected at this airport.</p>
            )}
          </div>

          <div className="px-4 py-3 border-b border-border">
            <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Cost overrun</p>
            <RangeValue low={stats.costUsd.low} typical={stats.costUsd.typical} high={stats.costUsd.high} tone="red" size="base" />
            <p className="text-[11px] text-muted mt-1.5">Scenario cost at this airport minus expected-normal baseline cost, same attribution the ledger uses.</p>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Flights delayed</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-mono tabular-nums text-xl text-aubergine font-medium">
                  {formatCount(stats.flightsDelayedDeparting)} <span className="text-sm text-muted">/ {formatCount(stats.flightsScheduledDeparting)}</span>
                </p>
                <p className="text-xs text-muted mt-0.5">departing ({depPct}%)</p>
              </div>
              <div>
                <p className="font-mono tabular-nums text-xl text-aubergine font-medium">
                  {formatCount(stats.flightsDelayedArriving)} <span className="text-sm text-muted">/ {formatCount(stats.flightsScheduledArriving)}</span>
                </p>
                <p className="text-xs text-muted mt-0.5">arriving ({arrPct}%)</p>
              </div>
            </div>
          </div>

          <div className={`px-4 py-3 ${(perDayRows && perDayRows.length > 0) ? "border-b border-border" : ""}`}>
            <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Passengers affected</p>
            <p className="font-mono tabular-nums text-xl text-aubergine font-medium">{formatCount(stats.passengersAffected)}</p>
            <p className="text-xs text-muted mt-0.5">itineraries touched by a delay, cancellation, or misconnect at this airport</p>
          </div>

          {perDayRows && perDayRows.length > 0 && (
            <div className="px-4 py-3" data-testid="airport-per-day-breakdown">
              <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Per-day breakdown</p>
              <table className="w-full font-mono tabular-nums text-xs">
                <thead>
                  <tr className="text-muted text-left">
                    <th className="font-normal pb-1">Day</th>
                    <th className="font-normal pb-1 text-right">Cost</th>
                    <th className="font-normal pb-1 text-right">Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {perDayRows.map((row) => (
                    <tr key={row.day} data-testid={`airport-day-row-${row.day}`}>
                      <td className="text-aubergine py-0.5">{row.day.slice(5)}</td>
                      <td className="text-aubergine py-0.5 text-right" data-testid={`airport-day-cost-${row.day}`}>
                        {formatUsd(row.stats.costTypical)}
                      </td>
                      <td className="text-aubergine py-0.5 text-right">{formatCount(row.stats.delayMin)}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One flight-list section (Departures or Arrivals) -- capped to
 * DEFAULT_SHOWN_FLIGHTS with a "Show all N" expand, the SAME convention
 * CostTimeseriesChart's own carrier-line toggle already uses, so a
 * hub airport's several hundred flights don't force endless scrolling
 * by default. Each row is clickable when `onSelectFlight` is given --
 * jumps straight into that flight's own MapDetailPanel. */
function FlightList({
  title,
  rows,
  timeLabel,
  showAll,
  forceShowAll,
  onToggleShowAll,
  onSelectFlight,
}: {
  title: string;
  rows: AirportFlightRow[];
  timeLabel: string;
  showAll: boolean;
  /** Inspector Mode: shows every row regardless of `showAll`, and hides
   * the manual toggle -- there's nothing left to expand. */
  forceShowAll?: boolean;
  onToggleShowAll: () => void;
  onSelectFlight?: (legId: string) => void;
}) {
  const effectiveShowAll = forceShowAll || showAll;
  const shown = effectiveShowAll ? rows : rows.slice(0, DEFAULT_SHOWN_FLIGHTS);
  return (
    <div className="px-4 py-3" data-testid={`airport-flights-${title.toLowerCase()}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft">
          {title} <span className="text-muted normal-case tracking-normal">({rows.length})</span>
        </p>
        {!forceShowAll && rows.length > DEFAULT_SHOWN_FLIGHTS && (
          <button onClick={onToggleShowAll} className="font-mono text-[11px] text-aubergine-soft hover:text-aubergine state-transition">
            {showAll ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">None scheduled.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {shown.map((r) => {
            const Row = onSelectFlight ? "button" : "div";
            return (
              <Row
                key={r.legId}
                onClick={onSelectFlight ? () => onSelectFlight(r.legId) : undefined}
                data-testid={`airport-flight-row-${r.legId}`}
                className={`flex items-center gap-2 text-xs py-1 px-1.5 -mx-1.5 rounded text-left ${onSelectFlight ? "hover:bg-elevated state-transition cursor-pointer" : ""}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[r.severity] }} />
                <span className="font-mono text-aubergine w-16 shrink-0 truncate">{r.flightNumber ?? r.legId}</span>
                <span className="font-mono text-muted w-10 shrink-0">{r.otherIata}</span>
                <span className="font-mono tabular-nums text-muted w-20 shrink-0">
                  {timeLabel} {r.scheduledMin != null ? formatSimClock(r.scheduledMin) : ", "}
                </span>
                <span className="font-mono tabular-nums text-aubergine ml-auto shrink-0">
                  {r.cancelled ? "Cancelled" : r.delayMin != null && r.delayMin > 0 ? `+${Math.round(r.delayMin)}m` : "On-time"}
                </span>
              </Row>
            );
          })}
        </div>
      )}
    </div>
  );
}
