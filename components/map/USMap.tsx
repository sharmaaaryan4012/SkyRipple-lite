"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, IconLayer, LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { DeckGLRef } from "@deck.gl/react";
import { US_STATES_GEOJSON } from "@/lib/usStatesGeoJson";
import { SEVERITY_COLORS_RGB } from "@/lib/severity";
import { useTimeCursor } from "@/lib/timeCursor";
import { useViewWindow } from "@/lib/viewWindowContext";
import { dayOptions } from "@/lib/viewScale";
import { bearingDeg, PLANE_ICON_SIZE, PLANE_ICON_URL } from "@/lib/planeIcon";
import { singleDayAirportStats, multiDayAirportStats, airportDailyRows, airportFlights, isAirportAffected, type AirportPanelStats } from "@/lib/airportAggregation";
import { MapHoverBox } from "./MapHoverBox";
import { MapDetailPanel } from "./MapDetailPanel";
import { AirportHoverBox } from "./AirportHoverBox";
import { AirportDetailPanel } from "./AirportDetailPanel";
import { useInspectorMode } from "@/lib/inspectorMode";
import type { RecoveryAction } from "@/lib/backendClient";
import type { FlightLeg, DisruptionMarker, AirportMeta, ImpactSummary, AirportDaily } from "@/lib/types";

const INITIAL_VIEW_STATE = {
  longitude: -96,
  latitude: 38.8,
  zoom: 3.6,
  pitch: 0, // Task B: planes-as-icons don't need ArcLayer's depth pitch -- flat is the FlightRadar convention, and it keeps icon billboards legible
  bearing: 0,
};

// Design-token colors as [r,g,b] (deck.gl doesn't take CSS strings).
// Theme v2: the map is the reference's own explicitly-named "only dark
// surface" (--map-canvas) -- it does NOT follow the rest of the app's
// switch to a white/off-white chrome. MAP_CANVAS_RGB is that dedicated
// dark background (distinct from the now-light `surface` token used
// everywhere else); BORDER_RGB is a mid-purple visible AGAINST that dark
// canvas (v2's `aubergine-soft`, not the new light-theme hairline
// `border`, which would be nearly invisible on a dark map).
const MAP_CANVAS_RGB: [number, number, number] = [42, 14, 49]; // --map-canvas
const BORDER_RGB: [number, number, number] = [106, 59, 114]; // --aubergine-soft, for contrast against the dark map
const RED_RGB: [number, number, number] = [193, 18, 31]; // --red
// The before/after recovery view's debut of gold (--gold) -- ONLY used
// when `improvedLegIds` marks a flight as having gotten better under
// recovery (see MapPanel.tsx/lib/recoveryView.ts). Every other map color
// on this file predates this and stays on the red/severity palette.
const GOLD_RGB: [number, number, number] = [199, 154, 63];

// Task B: planes-as-icons replaces the old always-on ArcLayer field, so
// the per-severity alpha tuning is now about ICON opacity (still against
// the same measured ~2,900-simultaneous-in-air peak). On-time planes
// stay faint background texture; delayed ones surface visually.
const SEVERITY_ALPHA: Record<string, number> = {
  on_time: 130,
  minor: 190,
  moderate: 225,
  severe: 255,
  cancelled: 200,
  unresolved: 150,
};
const DIMMED_ALPHA = 18; // non-focused planes once something is focus-clicked
const HIGHLIGHT_ALPHA = 255;

// A STABLE object reference (not a fresh literal per accessor call) --
// every plane uses the identical icon, so returning the SAME reference
// lets deck.gl recognize "nothing changed" across re-renders instead of
// re-evaluating/re-packing on every frame for ~2,900 instances.
const PLANE_ICON = { url: PLANE_ICON_URL, width: PLANE_ICON_SIZE, height: PLANE_ICON_SIZE, anchorX: PLANE_ICON_SIZE / 2, anchorY: PLANE_ICON_SIZE / 2, mask: true };

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

interface InAirFlight extends FlightLeg {
  progress: number;
  curLon: number;
  curLat: number;
  bearing: number;
}

/** requestAnimationFrame-driven sine pulse in [0,1], independent of the
 * sim-time cursor,  the disruption marker should keep pulsing even while
 * playback is paused, the same way the dashboard's marker always pulses
 * regardless of any other app state. */
function usePulse(periodMs: number): number {
  const [phase, setPhase] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    function tick(ts: number) {
      setPhase((ts % periodMs) / periodMs);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [periodMs]);
  return phase;
}

/**
 * Task B: the FlightRadar model. Planes render as SEVERITY-COLORED ICONS
 * at their current interpolated position (Task 2's position-along-route
 * logic, reused unchanged from the old ArcLayer version,  only the
 * layer type and what happens on hover/click changed). No route line
 * draws by default; clicking a plane enters FOCUS MODE (its route
 * draws, every other plane dims, a rich detail panel opens),  see
 * `focusedLegId` below. Hovering (independent of focus) shows a light
 * identity+route+times tooltip only; the deep passenger/cost detail
 * moved from "always visible on hover" (the old design) to "click only"
 * (MapDetailPanel), matching this task's own quick-read-vs-deep-dive
 * split.
 */
export function USMap({
  flights,
  disruptionMarkers,
  improvedLegIds,
  actionByLegId,
  airports,
  impactSummary,
  airportDaily,
  flightsDetailDay,
}: {
  flights: FlightLeg[];
  disruptionMarkers: DisruptionMarker[];
  /** The before/after recovery view's "Recovered" toggle state passes
   * the set of legIds whose recovered severity beat their no-recovery
   * severity -- those icons tint gold instead of their severity color
   * (see colorFor below). Omitted/empty in every other map state. */
  improvedLegIds?: Set<string>;
  /** legId -> the RecoveryAction that touched it (if any) -- passed
   * through to MapDetailPanel so clicking a flight the OCC acted on
   * shows what it did and why, only in "Recovered" mode. */
  actionByLegId?: Map<string, RecoveryAction>;
  /** Task 8c: every airport with scenario traffic. */
  airports: AirportMeta[];
  impactSummary: ImpactSummary;
  /** Multi-day scenarios only -- see lib/types.ts's own docstring. */
  airportDaily?: AirportDaily;
  /** Inspector Mode / multi-day flights.json gap -- see
   * ScenarioMeta.flightsDetailDay's own docstring. */
  flightsDetailDay?: string;
}) {
  const { currentMinute } = useTimeCursor();
  const { multiDay, window: viewWindow } = useViewWindow();
  const { enabled: inspectorMode } = useInspectorMode();
  const [hovered, setHovered] = useState<{ x: number; y: number; flight: InAirFlight } | null>(null);
  const [focusedLegId, setFocusedLegId] = useState<string | null>(null);
  const [hoveredAirport, setHoveredAirport] = useState<{ x: number; y: number; airport: AirportMeta } | null>(null);
  const [focusedAirportIata, setFocusedAirportIata] = useState<string | null>(null);
  const pulsePhase = usePulse(2200);
  const deckRef = useRef<DeckGLRef>(null);

  // Task 8c: the current view window's own days (Task 8b) -- multi-day
  // airport stats are summed over exactly these, matching "download/show
  // what you're currently looking at" everywhere else in this app.
  const viewDays = useMemo(() => (multiDay ? dayOptions({ startDay: viewWindow.startDay, endDay: viewWindow.endDay }) : []), [multiDay, viewWindow]);

  const airportsWithCoords = useMemo(() => airports.filter((a) => a.lat != null && a.lon != null), [airports]);

  const airportStatsByIata = useMemo(() => {
    const map = new Map<string, AirportPanelStats>();
    for (const a of airportsWithCoords) {
      map.set(a.iata, multiDay ? multiDayAirportStats(airportDaily ?? {}, a.iata, viewDays) : singleDayAirportStats(flights, a.iata, impactSummary));
    }
    return map;
  }, [airportsWithCoords, multiDay, airportDaily, viewDays, flights, impactSummary]);

  const affectedIatas = useMemo(() => {
    const set = new Set<string>();
    for (const a of airportsWithCoords) {
      if (isAirportAffected(a.iata, disruptionMarkers)) set.add(a.iata);
    }
    return set;
  }, [airportsWithCoords, disruptionMarkers]);

  // Only flights actually airborne AT the current cursor minute -- "before
  // it departs or after it arrives, it's not in the air" (Task 2's own
  // spec, unchanged by Task B). Cancelled and unresolved (never-departed)
  // legs never qualify, since neither has usable sim times.
  const inAirFlights: InAirFlight[] = useMemo(() => {
    const result: InAirFlight[] = [];
    for (const f of flights) {
      const s = f.scenario;
      if (s.cancelled || s.simDepMin == null || s.simArrMin == null) continue;
      if (currentMinute < s.simDepMin || currentMinute > s.simArrMin) continue;
      const span = Math.max(1, s.simArrMin - s.simDepMin);
      const progress = clamp01((currentMinute - s.simDepMin) / span);
      result.push({
        ...f,
        progress,
        // Linear lat/lon interpolation (not true great-circle) -- a
        // deliberate simplification: at continental-US scale/zoom this
        // reads indistinguishably from a great-circle path (see
        // lib/planeIcon.ts's bearingDeg, which uses the SAME
        // simplification for the icon's heading).
        curLon: f.originLon + (f.destLon - f.originLon) * progress,
        curLat: f.originLat + (f.destLat - f.originLat) * progress,
        bearing: bearingDeg(f.originLon, f.originLat, f.destLon, f.destLat),
      });
    }
    return result;
  }, [flights, currentMinute]);

  // The focused flight's full record, looked up from the COMPLETE
  // `flights` list (not inAirFlights) -- so focus-mode (route + panel)
  // survives the flight leaving the "currently in air" set (e.g. it
  // lands while focused, or the cursor is scrubbed outside its window).
  // Only the ICON itself needs the flight to be in-air; the route line
  // and the panel's data are independent of that -- satisfying "focus-
  // mode should survive a paused cursor."
  const focusedFlight = useMemo(() => (focusedLegId ? (flights.find((f) => f.legId === focusedLegId) ?? null) : null), [flights, focusedLegId]);

  // Task 8c: analogous lookup for the focused AIRPORT -- mutually
  // exclusive with focusedFlight by construction (see the onClick
  // handler below: setting one clears the other, "last click wins").
  const focusedAirport = useMemo(
    () => (focusedAirportIata ? (airportsWithCoords.find((a) => a.iata === focusedAirportIata) ?? null) : null),
    [airportsWithCoords, focusedAirportIata]
  );
  const focusedAirportDisruptions = useMemo(
    () => (focusedAirportIata ? disruptionMarkers.filter((m) => m.airportIata === focusedAirportIata) : []),
    [disruptionMarkers, focusedAirportIata]
  );
  const focusedAirportStats = focusedAirportIata ? airportStatsByIata.get(focusedAirportIata) : undefined;
  const focusedAirportPerDayRows = useMemo(
    () => (focusedAirportIata && multiDay ? airportDailyRows(airportDaily ?? {}, focusedAirportIata, viewDays) : undefined),
    [focusedAirportIata, multiDay, airportDaily, viewDays]
  );
  // Now that the architecture fix dynamically fetches the flight leg
  // data for the exact day currently in view, we no longer need the
  // `flightsDetailDay` inspector-mode caveat. The `flights` array is
  // always an honest representation of the currently-viewed day, whether
  // single-day or multi-day.
  const focusedAirportFlights = useMemo(
    () => (focusedAirportIata ? airportFlights(flights, focusedAirportIata) : null),
    [focusedAirportIata, flights]
  );

  // A debug hook exposing the ACTUAL computed state (not a
  // reimplementation) for ground-truth verification -- see this task's
  // own screenshot-based checks, which query window.__mapDebug directly
  // rather than eyeballing the WebGL canvas. Non-production only.
  //
  // Multiple separate effects (different dependency arrays) write to
  // this SAME object, so each MERGES onto whatever's already there
  // rather than replacing it wholesale -- an earlier version had each
  // effect overwrite window.__mapDebug outright, which meant a minute
  // change silently wiped out another effect's fields until it happened
  // to re-run. Caught by an earlier task's own hover-verification script
  // failing in a way that pointed straight at it.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __mapDebug?: Record<string, unknown> };
    w.__mapDebug = {
      ...w.__mapDebug,
      currentMinute,
      inAirLegIds: inAirFlights.map((f) => f.legId),
      inAirCount: inAirFlights.length,
      severityCounts: inAirFlights.reduce<Record<string, number>>((acc, f) => {
        acc[f.scenario.severity] = (acc[f.scenario.severity] ?? 0) + 1;
        return acc;
      }, {}),
      // Task B: exposes each in-air flight's computed icon position +
      // bearing directly, so verification can assert against the REAL
      // rendered instance data rather than recomputing it independently.
      inAirByLegId: Object.fromEntries(inAirFlights.map((f) => [f.legId, { curLon: f.curLon, curLat: f.curLat, bearing: f.bearing, severity: f.scenario.severity }])),
    };
  }, [currentMinute, inAirFlights]);

  const hoveredLegId = hovered?.flight.legId ?? null;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __mapDebug?: Record<string, unknown> };
    w.__mapDebug = {
      ...w.__mapDebug,
      hoveredLegId,
      // Ground-truth verification needs to hover/click a SPECIFIC known
      // flight's icon, which means converting its lon/lat to a screen
      // pixel the same way deck.gl itself does (perspective included) --
      // exposing the live viewport's own project() is exact; a hand-
      // rolled Mercator formula would have to reimplement deck.gl's own
      // camera math and could silently drift out of sync with it.
      project: (lon: number, lat: number) => deckRef.current?.deck?.getViewports()[0]?.project([lon, lat]),
    };
  }, [hoveredLegId]);

  // Task B: focus-mode state + the route-layer's own emptiness, exposed
  // for the "no always-on routes" / "click draws a route" assertions.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __mapDebug?: Record<string, unknown> };
    w.__mapDebug = {
      ...w.__mapDebug,
      focusedLegId,
      routeLayerLegIds: focusedFlight ? [focusedFlight.legId] : [],
    };
  }, [focusedLegId, focusedFlight]);

  // Task 8c: airport layer ground-truth, same "expose the real computed
  // state" discipline as the plane debug hooks above.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __mapDebug?: Record<string, unknown> };
    w.__mapDebug = {
      ...w.__mapDebug,
      airportCount: airportsWithCoords.length,
      affectedAirportIatas: Array.from(affectedIatas),
      hoveredAirportIata: hoveredAirport?.airport.iata ?? null,
      focusedAirportIata,
      // The REAL computed stats map, keyed by IATA -- verification reads
      // this directly rather than recomputing aggregation independently
      // (same "assert against the actual computed state" discipline the
      // plane debug hooks already use).
      airportStatsByIata: Object.fromEntries(airportStatsByIata),
      airportPositions: Object.fromEntries(airportsWithCoords.map((a) => [a.iata, { lon: a.lon, lat: a.lat }])),
      projectAirport: (lon: number, lat: number) => deckRef.current?.deck?.getViewports()[0]?.project([lon, lat]),
    };
  }, [airportsWithCoords, affectedIatas, hoveredAirport, focusedAirportIata, airportStatsByIata]);

  const statesLayer = new GeoJsonLayer({
    id: "us-states",
    data: US_STATES_GEOJSON,
    filled: true,
    getFillColor: [...MAP_CANVAS_RGB, 255],
    stroked: true,
    getLineColor: [...BORDER_RGB, 255],
    lineWidthMinPixels: 1,
    pickable: false,
  });

  const planesLayer = new IconLayer<InAirFlight>({
    id: "planes",
    data: inAirFlights,
    pickable: true,
    getPosition: (d) => [d.curLon, d.curLat],
    getIcon: () => PLANE_ICON,
    getAngle: (d) => -d.bearing, // icon points "up" (north) at angle 0 -- see lib/planeIcon.ts's own convention note
    getColor: (d) => colorFor(d, focusedLegId, improvedLegIds, focusedAirportIata !== null),
    getSize: (d) => (d.legId === focusedLegId ? 26 : d.legId === hoveredLegId ? 22 : 15),
    sizeUnits: "pixels",
    sizeMinPixels: 8,
    sizeMaxPixels: 32,
    updateTriggers: {
      getColor: [focusedLegId, improvedLegIds, focusedAirportIata],
      getSize: [focusedLegId, hoveredLegId],
      getAngle: [],
    },
    transitions: {
      getPosition: 140,
      getColor: 200,
    },
    onHover: (info: PickingInfo<InAirFlight>) => {
      if (info.object) setHovered({ x: info.x, y: info.y, flight: info.object });
      else setHovered(null);
    },
  });

  // Fix 3 (Task B follow-up): the FULL origin->destination route of
  // whichever flight is FOCUSED (clicked) -- NOT drawn by default
  // (Task B's "no always-on vectors" requirement), and NOT tied to
  // hover anymore (that's now the light tooltip only). Deliberately a
  // separate layer from planesLayer's own accessors so the route always
  // shows the complete origin->dest span regardless of how far the
  // flight has actually progressed.
  //
  // STRAIGHT LineLayer, not ArcLayer: the plane icon's own position
  // (inAirFlights, above) is a LINEAR lon/lat interpolation between
  // origin and dest (Task 2's own simplification, reused unchanged) --
  // a straight line in map space. ArcLayer draws a BOWED curve (its
  // getHeight lifts the midpoint), which never passes through that
  // linear position except at the two endpoints -- the plane visibly
  // sits off the drawn route everywhere in between. ArcLayer's curve
  // existed to visually separate MANY overlapping routes on the old
  // always-on-vectors map (pre-Task-B); in focus-mode exactly ONE route
  // ever draws at a time, so there's nothing left to separate and the
  // curve only breaks alignment. LineLayer draws the same flat segment
  // the plane actually flies.
  const routeLayer = focusedFlight
    ? new LineLayer<FlightLeg>({
        id: "flight-route",
        data: [focusedFlight],
        getSourcePosition: (d) => [d.originLon, d.originLat],
        getTargetPosition: (d) => [d.destLon, d.destLat],
        getColor: (d) => [...SEVERITY_COLORS_RGB[d.scenario.severity], HIGHLIGHT_ALPHA],
        getWidth: 3,
        widthMinPixels: 2,
      })
    : null;

  // Task 8c: UNAFFECTED airports -- quiet, structural background (a
  // muted low-alpha fill in --aubergine-soft, the design system's own
  // "structural accent" token), rendered UNDER the flight field so they
  // never compete with it, per this task's own "don't over-highlight"
  // instruction. Dims further when EITHER kind of focus mode is active
  // (a plane focused de-emphasizes the whole airport layer too; an
  // airport focused dims every OTHER airport, same idea planesLayer's
  // own dimming already uses).
  const unaffectedAirports = useMemo(() => airportsWithCoords.filter((a) => !affectedIatas.has(a.iata)), [airportsWithCoords, affectedIatas]);
  const anyFocusActive = focusedLegId !== null || focusedAirportIata !== null;

  const unaffectedAirportsLayer = new ScatterplotLayer<AirportMeta>({
    id: "airports-unaffected",
    data: unaffectedAirports,
    pickable: true,
    getPosition: (d) => [d.lon as number, d.lat as number],
    getRadius: (d) => (d.iata === focusedAirportIata ? 9000 : d.iata === hoveredAirport?.airport.iata ? 7500 : 5500),
    radiusUnits: "meters",
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    getFillColor: (d) => {
      const dimmed = anyFocusActive && d.iata !== focusedAirportIata;
      return [...BORDER_RGB, dimmed ? 30 : 90];
    },
    stroked: true,
    getLineColor: (d) => {
      const dimmed = anyFocusActive && d.iata !== focusedAirportIata;
      return [...BORDER_RGB, dimmed ? 60 : 170];
    },
    lineWidthMinPixels: 1,
    updateTriggers: {
      getFillColor: [focusedAirportIata, anyFocusActive],
      getLineColor: [focusedAirportIata, anyFocusActive],
      getRadius: [focusedAirportIata, hoveredAirport],
    },
    onHover: (info: PickingInfo<AirportMeta>) => {
      if (info.object) setHoveredAirport({ x: info.x, y: info.y, airport: info.object });
      else setHoveredAirport((h) => (h && unaffectedAirports.some((a) => a.iata === h.airport.iata) ? null : h));
    },
  });

  // AFFECTED airports -- an actual disruption injected there (see
  // lib/airportAggregation.ts's isAirportAffected; NOT spillover, which
  // used to also qualify and lit up dozens of airports at once in a
  // cascading multi-day scenario). The pulsing-ring + solid-core
  // treatment is exactly the one this map already used for injected
  // disruptions before Task 8c generalized (then re-narrowed) this set.
  // The core is pickable (hover/click), matching every other airport;
  // the pulse ring is decorative only.
  const affectedAirports = useMemo(() => airportsWithCoords.filter((a) => affectedIatas.has(a.iata)), [airportsWithCoords, affectedIatas]);
  const affectedAirportLayers = affectedAirports.flatMap((a) => {
    const dimmed = anyFocusActive && a.iata !== focusedAirportIata;
    const pulseAlpha = dimmed ? 20 : Math.round(90 * (1 - pulsePhase));
    const coreAlpha = dimmed ? 90 : 255;
    return [
      new ScatterplotLayer({
        id: `airport-pulse-${a.iata}`,
        data: [a],
        getPosition: () => [a.lon as number, a.lat as number],
        getRadius: 18000 + pulsePhase * 34000,
        getFillColor: [...RED_RGB, pulseAlpha],
        radiusUnits: "meters",
        stroked: false,
      }),
      new ScatterplotLayer<AirportMeta>({
        id: `airport-core-${a.iata}`,
        data: [a],
        pickable: true,
        getPosition: (d) => [d.lon as number, d.lat as number],
        getRadius: a.iata === focusedAirportIata ? 12000 : 9000,
        radiusUnits: "meters",
        getFillColor: [...RED_RGB, coreAlpha],
        stroked: true,
        getLineColor: [...MAP_CANVAS_RGB, 255],
        lineWidthMinPixels: 1.5,
        onHover: (info: PickingInfo<AirportMeta>) => {
          if (info.object) setHoveredAirport({ x: info.x, y: info.y, airport: info.object });
          else setHoveredAirport((h) => (h?.airport.iata === a.iata ? null : h));
        },
      }),
    ];
  });

  const hoveredAirportDisruptions = hoveredAirport ? disruptionMarkers.filter((m) => m.airportIata === hoveredAirport.airport.iata) : [];

  return (
    <div className="relative w-full h-full">
      <DeckGL
        ref={deckRef}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={[statesLayer, unaffectedAirportsLayer, planesLayer, routeLayer, ...affectedAirportLayers]}
        style={{ position: "absolute", inset: "0" }}
        onClick={(info: PickingInfo<InAirFlight | AirportMeta>) => {
          const obj = info.object as (InAirFlight & { iata?: undefined }) | (AirportMeta & { legId?: undefined }) | undefined;
          if (!obj) {
            setFocusedLegId(null);
            setFocusedAirportIata(null);
            return;
          }
          if ("iata" in obj && obj.iata) {
            // Airport clicked -- last-click-wins: clears any plane focus.
            setFocusedAirportIata(obj.iata);
            setFocusedLegId(null);
          } else if ("legId" in obj && obj.legId) {
            // Plane clicked -- clears any airport focus.
            setFocusedLegId(obj.legId);
            setFocusedAirportIata(null);
          }
        }}
      />
      {/* Suppressed for the flight currently focused (its own panel
          already shows everything the hover box would, more fully) --
          hover still works normally for every OTHER plane while focus
          mode is open. */}
      {hovered && hovered.flight.legId !== focusedLegId && <MapHoverBox x={hovered.x} y={hovered.y} flight={hovered.flight} />}
      {hoveredAirport && hoveredAirport.airport.iata !== focusedAirportIata && (
        <AirportHoverBox x={hoveredAirport.x} y={hoveredAirport.y} airport={hoveredAirport.airport} disruptions={hoveredAirportDisruptions} />
      )}
      {focusedFlight && (
        <MapDetailPanel
          flight={focusedFlight}
          flights={flights}
          onClose={() => setFocusedLegId(null)}
          onSelectFlight={(legId) => setFocusedLegId(legId)}
          recoveryAction={actionByLegId?.get(focusedFlight.legId) ?? null}
        />
      )}
      {focusedAirport && focusedAirportStats && (
        <AirportDetailPanel
          airport={focusedAirport}
          stats={focusedAirportStats}
          disruptions={focusedAirportDisruptions}
          perDayRows={focusedAirportPerDayRows}
          departures={focusedAirportFlights?.departures}
          arrivals={focusedAirportFlights?.arrivals}
          flightsDetailDay={multiDay ? flightsDetailDay : undefined}
          onSelectFlight={(legId) => {
            setFocusedLegId(legId);
            setFocusedAirportIata(null);
          }}
          onClose={() => setFocusedAirportIata(null)}
        />
      )}
    </div>
  );
}

function colorFor(d: InAirFlight, focusedLegId: string | null, improvedLegIds: Set<string> | undefined, airportFocusActive: boolean): [number, number, number, number] {
  // Gold marks "recovery made this better," severity still marks
  // whatever's LEFT to be unhappy about -- an improved flight that's
  // still delayed (e.g. severe -> moderate) reads as gold, not as
  // "solved," matching the task's own "keep severity legible" rule.
  const base = improvedLegIds?.has(d.legId) ? GOLD_RGB : SEVERITY_COLORS_RGB[d.scenario.severity];
  if (airportFocusActive) return [...base, DIMMED_ALPHA]; // Task 8c: an airport focused de-emphasizes the WHOLE flight field, not just one plane
  const alpha = focusedLegId === null ? SEVERITY_ALPHA[d.scenario.severity] : d.legId === focusedLegId ? HIGHLIGHT_ALPHA : DIMMED_ALPHA;
  return [...base, alpha];
}
