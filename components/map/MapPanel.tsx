"use client";

import { useMemo } from "react";
import { USMap } from "./USMap";
import type { RecoveryAction } from "@/lib/backendClient";
import type { RecoveryView } from "@/lib/recoveryView";
import type { FlightLeg, DisruptionMarker, AirportMeta, ImpactSummary, AirportDaily } from "@/lib/types";

export type MapView = "disrupted" | "recovered";

/**
 * The `map` grid area's content,  pure presentation now. Data loading
 * (flights + scenario) and the TimeCursorProvider both moved up to
 * components/SimulationProvider.tsx / ControlRoomApp.tsx as of Task 3,
 * so the SAME cursor drives both this panel and the new controls-rail
 * timeline. Task 2's own floating TimeScrubber (which used to render
 * here, at the bottom of the map) is gone, fully superseded by the
 * richer controls-rail control.
 *
 * The before/after recovery view adds the "Disrupted / Recovered"
 * toggle: `recovery` is null until a "Compute recovery" run has
 * finished (see ControlRoomApp.tsx), so the toggle simply doesn't
 * render before then. Flipping it swaps which flight SET reaches
 * USMap,  `flights` (the active, no-recovery cascade) vs
 * `recovery.data.flights` (each leg's OWN `.scenario` side already IS
 * the recovered state, see lib/recoveryView.ts),  no other map code
 * changes; USMap always just renders whatever flights array it's given.
 */
export function MapPanel({
  flights,
  disruptionMarkers,
  recovery,
  mapView,
  onMapViewChange,
  airports,
  impactSummary,
  airportDaily,
  flightsDetailDay,
}: {
  flights: FlightLeg[];
  disruptionMarkers: DisruptionMarker[];
  recovery?: RecoveryView | null;
  mapView?: MapView;
  onMapViewChange?: (view: MapView) => void;
  /** Task 8c: every airport with scenario traffic, plus its cost/delay
   * variance and (multi-day only) per-day breakdown -- all straight
   * from ScenarioData, unaffected by the disrupted/recovered map-view
   * toggle (the airport layer always reflects the DISRUPTED scenario's
   * own stats regardless of `mapView`, since there is no separate
   * recovered-side per-airport export -- a documented scope limit, not
   * a bug: recovery's own before/after view already lives in the
   * dashboard's gold overlay). */
  airports: AirportMeta[];
  impactSummary: ImpactSummary;
  airportDaily?: AirportDaily;
  /** Inspector Mode / multi-day flights.json gap -- see ScenarioMeta's
   * own docstring. Passed straight through to USMap so it can decide
   * whether a multi-day scenario's focused airport honestly HAS
   * per-flight detail for the day currently in view. */
  flightsDetailDay?: string;
}) {
  const showingRecovered = mapView === "recovered" && !!recovery;
  const activeFlights = showingRecovered ? recovery!.data.flights : flights;

  // Stretch goal: which action (if any) touched a given flight, so
  // clicking it in "Recovered" mode can show what the OCC actually did
  // there -- affectedIds[0] is a legId for every action_type anchored to
  // a specific flight (SWAP_TAILS, ACCEPT_DELAY; see
  // agents/aircraft_controller.py's build_action) -- action types
  // anchored to an itinerary/crew id instead (PROACTIVE_REBOOK,
  // CALL_RESERVE, etc.) simply never match here, which is correct: they
  // didn't act ON this flight specifically.
  const actionByLegId = useMemo(() => {
    if (!recovery) return undefined;
    const map = new Map<string, RecoveryAction>();
    for (const a of recovery.recoveryActions) {
      const legId = a.affectedIds[0];
      if (legId && !map.has(legId)) map.set(legId, a);
    }
    return map;
  }, [recovery]);

  return (
    // bg-map-canvas, not bg-surface: the map is the design system's one
    // dark surface (v2 reference),  the deck.gl canvas fills this div
    // edge-to-edge, but the wrapper's own background still peeks through
    // at the rounded corners (overflow-hidden clips the square canvas to
    // a rounded rect), so it needs to match the dark map, not the rest
    // of the now-light chrome.
    <div className="relative h-full bg-map-canvas border border-border rounded-md overflow-hidden">
      <USMap
        flights={activeFlights}
        disruptionMarkers={disruptionMarkers}
        improvedLegIds={showingRecovered ? recovery!.improvedLegIds : undefined}
        actionByLegId={showingRecovered ? actionByLegId : undefined}
        airports={airports}
        impactSummary={impactSummary}
        airportDaily={airportDaily}
        flightsDetailDay={flightsDetailDay}
      />
      {recovery && onMapViewChange && (
        <div className="absolute top-3 left-3 z-10 flex bg-elevated border border-border rounded-md p-0.5 font-mono text-xs">
          {(["disrupted", "recovered"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onMapViewChange(v)}
              className={`px-2.5 py-1 rounded state-transition ${
                mapView === v ? "bg-aubergine text-page" : "text-aubergine-soft hover:text-aubergine"
              }`}
            >
              {v === "disrupted" ? "Disrupted" : "Recovered"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
