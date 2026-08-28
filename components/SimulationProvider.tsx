"use client";

import { useEffect, useState } from "react";
import { loadFlights } from "@/lib/loadFlights";
import { loadScenario } from "@/lib/loadScenario";
import { buildCleanBootState } from "@/lib/bootState";
import { TimeCursorProvider } from "@/lib/timeCursor";
import { ViewWindowProvider, useViewWindow } from "@/lib/viewWindowContext";

import { useTimeCursor } from "@/lib/timeCursor";

function DynamicFlightsLoader({ data, slug, children }: { data: SimulationData; slug: string; children: (data: SimulationData) => React.ReactNode }) {
  const { currentMinute } = useTimeCursor();
  const [cachedFlights, setCachedFlights] = useState<Record<string, import("@/lib/types").FlightLeg[]>>({});
  
  const isMultiDay = data.scenario.meta.startDay !== data.scenario.meta.endDay;
  const startDay = new Date(data.scenario.meta.startDay || "2025-12-01");
  const dayOffset = Math.floor(currentMinute / 1440);
  
  const currentDayDate = new Date(startDay);
  currentDayDate.setUTCDate(startDay.getUTCDate() + dayOffset);
  const currentDayStr = currentDayDate.toISOString().split("T")[0];

  useEffect(() => {
    if (!isMultiDay) return;
    if (cachedFlights[currentDayStr]) return;
    
    let cancelled = false;
    loadFlights(slug, currentDayStr).then((res) => {
      if (cancelled) return;
      if (res.flights && res.flights.length > 0) {
        setCachedFlights((prev) => ({ ...prev, [currentDayStr]: res.flights }));
      }
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [isMultiDay, currentDayStr, slug, cachedFlights]);

  const activeFlights = isMultiDay ? (cachedFlights[currentDayStr] || []) : data.flights;
  
  // Clone data and inject activeFlights
  const newData = { ...data, flights: activeFlights };
  
  return <>{children(newData)}</>;
}

import type { ActiveResult } from "@/lib/activeResult";
import type { SimulationData } from "@/lib/types";

export type { SimulationData } from "@/lib/types";

/**
 * Loads the ACTIVE result's data and mounts TimeCursorProvider around
 * whatever the caller renders from it,  this is the seam Task 2's own
 * docstring anticipated ("Task 3 can... move it up to wrap more of
 * ControlRoomShell... without USMap or any other consumer changing at
 * all"). It wraps BOTH the `controls` and `map` grid areas (see
 * ControlRoomApp.tsx), so TimeControlPanel and USMap share the exact
 * same cursor. USMap.tsx itself required zero changes for this,  it
 * only ever calls useTimeCursor(), never caring where the provider is
 * mounted.
 *
 * Task 5c: `scenarioId` became `active: ActiveResult`,  a PRECOMPUTED
 * scenario is fetched exactly as before (loadFlights+loadScenario
 * against public/scenarios/<slug>/), but a LIVE result is already fully
 * resolved SimulationData sitting in memory (a /api/simulate or
 * /api/parse-and-simulate response body the chat already has),  no
 * fetch runs for it at all, it's used directly. Either way, `children`
 * receives the SAME SimulationData shape, so every consumer below this
 * point (map/dashboard/timeline) needs to know nothing about which kind
 * produced it,  see lib/activeResult.ts's own docstring for the full
 * design rationale.
 *
 * The cursor's own [minMinute, maxMinute] domain is derived from
 * costTimeseries.bucketStartMin (the SAME 0..2880 window the dashboard
 * chart plots) rather than from flights' own min/max departure/arrival
 * times,  this unifies the timeline control's sparkline domain with the
 * map's scrub range exactly, and a few flights departing/arriving right
 * at the boundary not being "in-air" at minute 0 or 2880 is
 * inconsequential (nothing is airborne at the very start/end of the
 * window anyway).
 *
 * Render-prop children: `data` is null while loading (or on error, paired
 * with the `error` field) so the caller decides how each grid slot
 * displays a loading/error state -- SimulationProvider only owns the
 * DATA and the cursor, not the layout.
 */
export function SimulationProvider({
  active,
  children,
}: {
  active: ActiveResult;
  children: (data: SimulationData | null, error: string | null) => React.ReactNode;
}) {
  const [fetched, setFetched] = useState<SimulationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A stable string key that changes exactly when a NEW fetch/activation
  // should happen: a new precomputed slug (or the SAME slug requested with
  // a different `raw`), or a new live result (even one that happens to
  // share the same backend scenarioId,  e.g. two live requests both
  // defaulting to "live",  requestId disambiguates those; see
  // lib/activeResult.ts's makeLiveActiveResult).
  const activeKey = active.kind === "precomputed" ? `precomputed:${active.scenarioId}:${active.raw}` : `live:${active.requestId}`;

  useEffect(() => {
    if (active.kind === "live") {
      // Nothing to fetch -- `active.data` IS the data, already resolved.
      setFetched(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const scenarioId = active.scenarioId;
    const raw = active.raw;
    // Deliberately NOT `setFetched(null)` here: that would drop `data` to
    // null for the whole in-flight fetch, and ControlRoomApp renders every
    // grid slot's placeholder the instant `data` is null (see its own
    // render) -- unmounting MapPanel/ChatDock/RecoveryPanel and remounting
    // them fresh once the new data lands. For the FIRST load that's the
    // only option (there's nothing to show yet), but for a starter-chip
    // switch between two precomputed scenarios it meant ChatDock's whole
    // `messages` state (and everything else's local state) got wiped for
    // a "Loading…" flash on every click -- indistinguishable, to a user,
    // from the page having reloaded. Leaving the PREVIOUS scenario's data
    // in place until the new one resolves (stale-while-revalidate) keeps
    // the tree mounted throughout; only `error` resets up front, since a
    // fresh attempt should not keep showing a stale error either.
    setError(null);
    Promise.all([loadFlights(scenarioId), loadScenario(scenarioId)])
      .then(([flightsData, scenario]) => {
        if (cancelled) return;
        // `raw` (lib/activeResult.ts) decides the presentation: the app's
        // own boot load stays cleaned (buildCleanBootState -- "normal day,
        // nothing injected"), while a starter-chip activation shows the
        // export's real, pre-cascaded disruption as-is. See lib/bootState.ts.
        const merged: SimulationData = { flights: flightsData.flights, scenario };
        setFetched(raw ? merged : buildCleanBootState(merged));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeKey is the intentional dependency; active itself is a fresh object each render
  }, [activeKey]);

  const data = active.kind === "live" ? active.data : fetched;

  if (!data) {
    return <>{children(null, error)}</>;
  }

  const bucketStartMin = data.scenario.costTimeseries.bucketStartMin;
  const minMinute = bucketStartMin[0] ?? 0;
  const maxMinute = bucketStartMin[bucketStartMin.length - 1] ?? 1440;

  return (
    <ViewWindowProvider meta={data.scenario.meta} fullBounds={{ minMinute, maxMinute }}>
      <TimeCursorBridge active={active} data={data}>{(d) => children(d, null)}</TimeCursorBridge>
    </ViewWindowProvider>
  );
}

/**
 * Threads the CURRENT view window (day/week/month toggle, Task 8b) into
 * TimeCursorProvider's own minMinute/maxMinute -- remounted via `key`
 * whenever the window's own bounds change (a plain prop change would
 * NOT reset TimeCursorProvider's internal useState, which only reads
 * its minMinute prop once, on mount). For a single-day scenario
 * (ViewWindowProvider's own `multiDay: false` case), `window` is pinned
 * to `fullBounds` forever, so the key never changes and this is
 * BYTE-IDENTICAL to mounting TimeCursorProvider directly the way this
 * file did before Task 8b -- see ViewWindowProvider's own docstring for
 * why that regression guarantee holds.
 */
function TimeCursorBridge({ active, data, children }: { active: ActiveResult; data: SimulationData; children: (data: SimulationData) => React.ReactNode }) {
  const { window } = useViewWindow();
  return (
    <TimeCursorProvider key={`${window.startMin}-${window.endMin}`} minMinute={window.startMin} maxMinute={window.endMin}>
      {active.kind === "precomputed" ? (
         <DynamicFlightsLoader data={data} slug={active.scenarioId}>
           {(updatedData) => children(updatedData)}
         </DynamicFlightsLoader>
      ) : (
         children(data)
      )}
    </TimeCursorProvider>
  );
}
