"use client";

import { useEffect, useState } from "react";
import { ControlRoomShell } from "@/components/layout/ControlRoomShell";
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { RecoveryPanel } from "@/components/dashboard/RecoveryPanel";
import { MapPanel, type MapView } from "@/components/map/MapPanel";
import { TimeControlPanel } from "@/components/controls/TimeControlPanel";
import { ChatDock } from "@/components/chat/ChatDock";
import { SimulationProvider } from "./SimulationProvider";
import { InspectorModeProvider } from "@/lib/inspectorMode";
import { fetchHealth, recoveryResultToSimulationData } from "@/lib/backendClient";
import { makeLiveActiveResult, makePrecomputedActiveResult, type ActiveResult } from "@/lib/activeResult";
import { buildRecoveryView, type RecoveryView } from "@/lib/recoveryView";
import type { BackendDisruptionRequest, SimulationData } from "@/lib/types";

/**
 * Composes the whole control room. Task 5c: `scenarioId` state became
 * `active: ActiveResult` (see lib/activeResult.ts),  the app's active
 * result is now either a precomputed slug or a live result already
 * sitting in memory from a chat submission. `nlAvailable` is fetched
 * ONCE on mount (GET /api/health),  independent of SimulationProvider's
 * own per-scenario load, since it describes the BACKEND's state, not
 * any one scenario's data.
 *
 * Fix 1 (Task B follow-up, clean-slate boot) removed this component's
 * own GET /api/scenarios fetch + `showcaseScenarios` state (there's no
 * backend to list scenarios from in the Lite build). `activatePrecomputed`
 * below is back, though: ChatDock's starter chips (see its own docstring)
 * each name a fixed precomputed export slug already baked into the
 * static site, so swapping `active` to point at one needs no fetch of
 * its own -- it just hands SimulationProvider a new scenarioId and lets
 * the SAME load path the boot already uses run again, in place. This is
 * deliberately NOT a URL navigation (an earlier version routed starter
 * clicks through `router.push('/simulation?scenario=...')`, which
 * remounted this whole component from scratch via app/simulation/page.tsx
 * -- losing chat history and reading as a full page reload to the user).
 *
 * The app's initial `active` below still uses `bootDataSourceScenarioId`
 * to know WHICH precomputed export to fetch data FROM, but
 * SimulationProvider.tsx transforms whatever it fetches into a clean
 * baseline presentation (lib/bootState.ts) before anything ever renders
 * it,  so this is a DATA SOURCE, not "the scenario the app boots into."
 * `disruptions: null` here is deliberate and honest: the boot state has
 * no injected disruption to recover from (RecoveryPanel's disabled
 * state already handles `null` gracefully),  it must NOT reuse
 * ord-runway-closure's own disruption params, which would let a user
 * "recover" from a disruption that was never actually run. A starter-chip
 * activation also sets `disruptions: null` for the same honest reason --
 * see lib/activeResult.ts's own docstring on `raw` for how it differs
 * from the boot load.
 *
 * SimulationProvider owns the data load + the TimeCursorProvider; this
 * component just decides what each ControlRoomShell slot renders. Chat
 * and the recovery panel (like TimeControlPanel and MapPanel) only render
 * once `data` exists.
 */
export function ControlRoomApp({
  bootDataSourceScenarioId,
  skipCleanBoot = false,
}: {
  bootDataSourceScenarioId: string;
  /** Task 8b verification affordance -- see SimulationProvider.tsx's own
   * docstring. Default false; only ever set from app/page.tsx's own
   * (test-only) URL query param. */
  skipCleanBoot?: boolean;
}) {
  const [active, setActive] = useState<ActiveResult>({
    kind: "precomputed",
    scenarioId: bootDataSourceScenarioId,
    disruptions: null,
    raw: skipCleanBoot,
  });
  const [nlAvailable, setNlAvailable] = useState<boolean | null>(null);
  // The finale: the before/after recovery view's derived data (see
  // lib/recoveryView.ts) -- computed ONCE here (not inside RecoveryPanel)
  // because MapPanel, Dashboard, AND RecoveryPanel all need the SAME
  // RecoveryView. `mapView` is the map's own "Disrupted / Recovered"
  // toggle -- lives here (not inside MapPanel) so it can be reset
  // alongside `recovery` whenever the active scenario changes below.
  const [recovery, setRecovery] = useState<RecoveryView | null>(null);
  const [mapView, setMapView] = useState<MapView>("disrupted");

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((h) => {
        if (!cancelled) setNlAvailable(h.nlAvailable);
      })
      .catch(() => {
        if (!cancelled) setNlAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function activateLive(data: SimulationData, disruptions: BackendDisruptionRequest[]) {
    setActive(makeLiveActiveResult(data, disruptions));
  }

  function activatePrecomputed(scenarioId: string) {
    setActive(makePrecomputedActiveResult(scenarioId));
  }

  const activeKey = active.kind === "precomputed" ? `precomputed:${active.scenarioId}` : `live:${active.requestId}`;

  // A recovery result belongs to ONE specific active scenario -- injecting
  // a NEW disruption (or returning to the clean boot) must not leave a
  // stale gold reveal/toggle sitting around from whatever was recovered
  // before. RecoveryPanel already remounts fresh via `key={activeKey}`
  // below; this clears the PARENT's own copy of the same result.
  useEffect(() => {
    setRecovery(null);
    setMapView("disrupted");
  }, [activeKey]);

  return (
    <InspectorModeProvider>
    <SimulationProvider active={active}>
      {(data, error) => (
        <ControlRoomShell
          controls={
            error ? (
              <PlaceholderPanel label="Controls" note={`Failed to load: ${error}`} />
            ) : data ? (
              <TimeControlPanel scenario={data.scenario} />
            ) : (
              <PlaceholderPanel label="Controls" note="Loading simulated time range…" />
            )
          }
          map={
            error ? (
              <PlaceholderPanel label="Map" note={`Failed to load: ${error}`} />
            ) : data ? (
              // The chat dock now floats OVER the map (see ControlRoomShell.tsx's
              // own docstring on why the `chat` grid area is gone) -- composed
              // here, not inside MapPanel itself, so MapPanel stays a pure map
              // component and ChatDock stays a pure chat component; this wrapper
              // is the one place that knows they now share a stacking context.
              <div className="relative h-full">
                <MapPanel
                  flights={data.flights}
                  disruptionMarkers={data.scenario.disruptionMarkers}
                  recovery={recovery}
                  mapView={mapView}
                  onMapViewChange={setMapView}
                  airports={data.scenario.airports}
                  impactSummary={data.scenario.impactSummary}
                  airportDaily={data.scenario.airportDaily}
                  flightsDetailDay={data.scenario.meta.flightsDetailDay}
                />
                <ChatDock scenario={data.scenario} flights={data.flights} recovery={recovery} nlAvailable={nlAvailable} onActivateLive={activateLive} onActivatePrecomputed={activatePrecomputed} />
              </div>
            ) : (
              <PlaceholderPanel label="Map" note="Loading flight positions…" />
            )
          }
          ledger={
            error ? (
              <PlaceholderPanel label="Ledger" note={`Failed to load: ${error}`} />
            ) : data ? (
              <div className="flex flex-col gap-3">
                <Dashboard scenario={data.scenario} flights={data.flights} recovery={recovery} />
                <RecoveryPanel
                  key={activeKey}
                  day={data.scenario.meta.day}
                  disruptions={active.disruptions}
                  view={recovery}
                  onDone={(result) => setRecovery(buildRecoveryView(result, recoveryResultToSimulationData(result), data.scenario.impactSummary))}
                />
              </div>
            ) : (
              <PlaceholderPanel label="Ledger" note="Loading scenario…" />
            )
          }
        />
      )}
    </SimulationProvider>
    </InspectorModeProvider>
  );
}
