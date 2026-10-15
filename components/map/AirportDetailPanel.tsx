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
    <div
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] w-full rounded-t-3xl border-t border-slate-700/80 shadow-[0_-16px_48px_rgba(0,0,0,0.95)] bg-slate-900/98 backdrop-blur-2xl flex flex-col overflow-hidden lg:absolute lg:inset-x-auto lg:bottom-auto lg:top-0 lg:right-0 lg:h-full lg:w-[380px] lg:rounded-none lg:border-t-0 lg:border-l lg:border-slate-800 lg:z-30 lg:max-h-full state-transition select-none"
      data-testid="airport-detail-panel"
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Mobile Touch Drag Pill */}
      <div className="lg:hidden pt-2.5 pb-1 flex justify-center shrink-0">
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full" />
      </div>

      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div>
          <p className="font-mono text-lg font-bold text-white tracking-tight">{airport.iata}</p>
          <p className="text-xs text-slate-400 mt-0.5">{airport.name}</p>
          <p className="font-mono text-xs text-blue-400 font-semibold mt-0.5">{airport.cityName}</p>
        </div>
        <button
          onClick={onClose}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      {hasFlightTabs && (
        <div className="flex border-b border-slate-800 bg-slate-950/80 shrink-0 p-1.5 gap-1.5" role="tablist" aria-label="Airport detail tabs">
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
              className={`flex-1 font-mono text-xs uppercase tracking-wider py-2 rounded-lg transition min-h-[40px] flex items-center justify-center font-bold ${
                activeTab === t
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">Disruption status</p>
              {disruptions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {disruptions.map((d) => (
                    <div key={d.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                      <p className="text-xs text-red-400 font-semibold">{d.label}</p>
                      <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                        marginal cost {formatUsd(d.marginalCost.typical)} (range {formatUsd(d.marginalCost.low)}&ndash;{formatUsd(d.marginalCost.high)})
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No disruption injected at this airport.</p>
              )}
            </div>

            <div className="px-4 py-3 border-b border-slate-800">
              <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">Cost overrun</p>
              <RangeValue low={stats.costUsd.low} typical={stats.costUsd.typical} high={stats.costUsd.high} tone="neutral" size="base" />
              <p className="text-[11px] text-slate-400 mt-1.5">Scenario cost at this airport minus expected-normal baseline cost, same attribution the ledger uses.</p>
            </div>

            <div className="px-4 py-3 border-b border-slate-800">
              <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">Flights delayed</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <p className="font-mono tabular-nums text-xl text-white font-bold">
                    {formatCount(stats.flightsDelayedDeparting)} <span className="text-sm text-slate-400 font-normal">/ {formatCount(stats.flightsScheduledDeparting)}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">departing ({depPct}%)</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <p className="font-mono tabular-nums text-xl text-white font-bold">
                    {formatCount(stats.flightsDelayedArriving)} <span className="text-sm text-slate-400 font-normal">/ {formatCount(stats.flightsScheduledArriving)}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">arriving ({arrPct}%)</p>
                </div>
              </div>
            </div>

            <div className={`px-4 py-3 ${(perDayRows && perDayRows.length > 0) ? "border-b border-slate-800" : ""}`}>
              <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">Passengers affected</p>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <p className="font-mono tabular-nums text-xl text-white font-bold">{formatCount(stats.passengersAffected)}</p>
                <p className="text-xs text-slate-400 mt-0.5">itineraries touched by a delay, cancellation, or misconnect at this airport</p>
              </div>
            </div>

            {perDayRows && perDayRows.length > 0 && (
              <div className="px-4 py-3" data-testid="airport-per-day-breakdown">
                <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">Per-day breakdown</p>
                <table className="w-full font-mono tabular-nums text-xs">
                  <thead>
                    <tr className="text-slate-400 text-left border-b border-slate-800">
                      <th className="font-normal pb-1.5">Day</th>
                      <th className="font-normal pb-1.5 text-right">Cost</th>
                      <th className="font-normal pb-1.5 text-right">Delay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {perDayRows.map((row) => (
                      <tr key={row.day} data-testid={`airport-day-row-${row.day}`}>
                        <td className="text-slate-200 py-1.5">{row.day.slice(5)}</td>
                        <td className="text-slate-200 py-1.5 text-right" data-testid={`airport-day-cost-${row.day}`}>
                          {formatUsd(row.stats.costTypical)}
                        </td>
                        <td className="text-slate-200 py-1.5 text-right">{formatCount(row.stats.delayMin)}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
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
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
          {title} <span className="text-slate-500 normal-case tracking-normal">({rows.length})</span>
        </p>
        {!forceShowAll && rows.length > DEFAULT_SHOWN_FLIGHTS && (
          <button onClick={onToggleShowAll} className="font-mono text-[11px] text-blue-400 hover:text-blue-300 transition">
            {showAll ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">None scheduled.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {shown.map((r) => {
            const Row = onSelectFlight ? "button" : "div";
            return (
              <Row
                key={r.legId}
                onClick={onSelectFlight ? () => onSelectFlight(r.legId) : undefined}
                data-testid={`airport-flight-row-${r.legId}`}
                className={`flex items-center gap-2 text-xs py-2 px-2.5 rounded-lg text-left ${onSelectFlight ? "hover:bg-slate-800/80 active:bg-slate-800 transition cursor-pointer" : ""}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[r.severity] }} />
                <span className="font-mono font-bold text-white w-16 shrink-0 truncate">{r.flightNumber ?? r.legId}</span>
                <span className="font-mono text-slate-400 w-10 shrink-0">{r.otherIata}</span>
                <span className="font-mono tabular-nums text-slate-400 w-20 shrink-0">
                  {timeLabel} {r.scheduledMin != null ? formatSimClock(r.scheduledMin) : "—"}
                </span>
                <span className="font-mono tabular-nums text-white ml-auto shrink-0 font-medium">
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
