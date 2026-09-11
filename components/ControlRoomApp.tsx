"use client";

import { useEffect, useState } from "react";
import { ControlRoomShell } from "@/components/layout/ControlRoomShell";
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel";
import { TopCommandBar } from "@/components/controls/TopCommandBar";
import { FlightDeck } from "@/components/controls/FlightDeck";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { RecoveryPanel } from "@/components/dashboard/RecoveryPanel";
import { MapPanel, type MapView } from "@/components/map/MapPanel";
import { ChatDock } from "@/components/chat/ChatDock";
import { SimulationProvider } from "./SimulationProvider";
import { InspectorModeProvider } from "@/lib/inspectorMode";
import { fetchHealth, recoveryResultToSimulationData } from "@/lib/backendClient";
import { makeLiveActiveResult, type ActiveResult } from "@/lib/activeResult";
import { buildRecoveryView, type RecoveryView } from "@/lib/recoveryView";
import type { BackendDisruptionRequest, ScenarioData, SimulationData } from "@/lib/types";

/**
 * Operations Control Center (OCC) Application Root.
 * Coordinates shared simulation state, multi-scenario switching, time cursor,
 * and passes resolved telemetry to the 3 OCC cockpit regions:
 * 1. TopCommandBar (System Identity, Scenario Switcher, Status Telemetry)
 * 2. Main Stage (Airspace Map Canvas + Integrated Flight Deck)
 * 3. Impact Ledger (Scorecard, Cost Timeseries, AI Recovery, Carrier Exposure)
 */
export function ControlRoomApp({
  bootDataSourceScenarioId,
  skipCleanBoot = false,
}: {
  bootDataSourceScenarioId: string;
  skipCleanBoot?: boolean;
}) {
  const [active, setActive] = useState<ActiveResult>({
    kind: "precomputed",
    scenarioId: bootDataSourceScenarioId,
    disruptions: null,
    raw: skipCleanBoot,
  });
  const [nlAvailable, setNlAvailable] = useState<boolean | null>(null);
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

  function activatePrecomputed(scenarioId: string, isRaw?: boolean) {
    if (scenarioId === "baseline") {
      setActive({
        kind: "precomputed",
        scenarioId: bootDataSourceScenarioId,
        disruptions: null,
        raw: false,
      });
      return;
    }
    setActive({
      kind: "precomputed",
      scenarioId,
      disruptions: null,
      raw: isRaw ?? true,
    });
  }

  const activeKey =
    active.kind === "precomputed"
      ? `precomputed:${active.scenarioId}:${active.raw}`
      : `live:${active.requestId}`;

  useEffect(() => {
    setRecovery(null);
    setMapView("disrupted");
  }, [activeKey]);

  const activeScenarioId = active.kind === "precomputed" ? active.scenarioId : "live";
  const isCleanBoot = active.kind === "precomputed" && !active.raw;

  const fallbackScenario: ScenarioData = {
    meta: {
      scenarioId: activeScenarioId,
      label: "Initializing Airspace...",
      day: "2025-12-15",
      disruptionSummary: "Connecting to nationwide air traffic radar telemetry...",
      generatedAt: "",
      sourceRunId: "",
    },
    costTimeseries: { bucketMinutes: 60, bucketStartMin: [], carriers: {} },
    disruptionMarkers: [],
    impactSummary: {
      asOfMin: 0,
      totalCostUsd: { low: 0, typical: 0, high: 0 },
      totalDelayMin: 0,
      flightsDelayed: 0,
      flightsCancelled: 0,
      flightsDiverted: 0,
      passengersMisconnected: 0,
      crewIllegalities: 0,
      byCarrier: {},
      byAirport: {},
    },
    ledgerByCarrier: [],
    airports: [],
  };

  return (
    <InspectorModeProvider>
      <SimulationProvider active={active}>
        {(data, error) => {
          const topBar = (
            <TopCommandBar
              scenario={data ? data.scenario : fallbackScenario}
              isCleanBoot={isCleanBoot}
            />
          );

          if (error) {
            return (
              <ControlRoomShell
                header={topBar}
                stage={<PlaceholderPanel label="Airspace Stage" note={`Failed to load: ${error}`} />}
                ledger={<PlaceholderPanel label="Impact Ledger" note={`Failed to load: ${error}`} />}
              />
            );
          }

          if (!data) {
            return (
              <ControlRoomShell
                header={topBar}
                stage={<PlaceholderPanel label="Airspace Stage" note="Loading nationwide flight radar telemetry…" />}
                ledger={<PlaceholderPanel label="Impact Ledger" note="Loading scenario financial data…" />}
              />
            );
          }

          return (
            <ControlRoomShell
              header={topBar}
              stage={
                <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-hidden">
                  {/* Airspace Map Canvas with Floating Briefing */}
                  <div className="flex-1 relative min-h-0 overflow-hidden rounded-md border border-border bg-map-canvas">
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
                    <ChatDock
                      scenario={data.scenario}
                      flights={data.flights}
                      recovery={recovery}
                      nlAvailable={nlAvailable}
                      onActivateLive={activateLive}
                      onActivatePrecomputed={(slug) => activatePrecomputed(slug, true)}
                    />
                  </div>

                  {/* Integrated Full-Width Flight Deck Bar */}
                  <FlightDeck scenario={data.scenario} />
                </div>
              }
              ledger={
                <div className="flex flex-col gap-3">
                  <Dashboard scenario={data.scenario} flights={data.flights} recovery={recovery} />
                  <RecoveryPanel
                    key={activeKey}
                    day={data.scenario.meta.day}
                    disruptions={active.disruptions}
                    view={recovery}
                    onDone={(result) =>
                      setRecovery(
                        buildRecoveryView(
                          result,
                          recoveryResultToSimulationData(result),
                          data.scenario.impactSummary
                        )
                      )
                    }
                  />
                </div>
              }
            />
          );
        }}
      </SimulationProvider>
    </InspectorModeProvider>
  );
}
