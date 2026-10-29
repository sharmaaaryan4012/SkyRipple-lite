"use client";

import { useEffect, useState } from "react";
import { ResponsiveDashboardShell } from "@/components/layout/ResponsiveDashboardShell";
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel";
import { TopCommandBar } from "@/components/controls/TopCommandBar";
import { FlightDeck } from "@/components/controls/FlightDeck";
import { FloatingTopHudPill } from "@/components/controls/FloatingTopHudPill";
import { type OCCWorkspace } from "@/components/controls/WorkspaceSwitcher";
import { PreloadedScenariosSidebar } from "@/components/dashboard/PreloadedScenariosSidebar";
import { AgentRecoveryLedger } from "@/components/dashboard/AgentRecoveryLedger";
import { DeterministicValidationCard } from "@/components/dashboard/DeterministicValidationCard";
import { FinancialAnalyticsView } from "@/components/dashboard/FinancialAnalyticsView";
import { MapPanel, type MapView } from "@/components/map/MapPanel";
import { SimulationProvider } from "./SimulationProvider";
import { InspectorModeProvider } from "@/lib/inspectorMode";
import { recoveryResultToSimulationData } from "@/lib/backendClient";
import { makeLiveActiveResult, type ActiveResult } from "@/lib/activeResult";
import { buildRecoveryView, type RecoveryView } from "@/lib/recoveryView";
import type { BackendDisruptionRequest, ScenarioData, SimulationData } from "@/lib/types";

/**
 * Operations Control Center (OCC) Application Root (Lite Version).
 * Coordinates shared simulation state, static pre-calculated scenario loading,
 * and time cursor, routing telemetry into the modern 3-view Executive Cockpit:
 * 1. TopCommandBar (System Identity, Centered Workspace Switcher, Dev Mode, About)
 * 2. View 1 (Tactical Radar):
 *    - Main Airspace Stage (deck.gl nationwide radar map + integrated FlightDeck scrubber)
 *    - Slim Right Rail: Preloaded Scenarios Selector (ORD, Multi-Hub, December, Nominal Baseline)
 * 3. View 2 (Explainability & Audit):
 *    - 50/50 Split View: DeterministicValidationCard + AgentRecoveryLedger
 * 4. View 3 (Financial & Carrier Analytics):
 *    - Bento-Box Grid: KPIs, Cost progression, Carrier donut chart, and airline variance matrix
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
  const [recovery, setRecovery] = useState<RecoveryView | null>(null);
  const [mapView, setMapView] = useState<MapView>("disrupted");
  const [workspace, setWorkspace] = useState<OCCWorkspace>("radar");

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
              disruptions={active.disruptions}
              activeWorkspace={workspace}
              onWorkspaceChange={setWorkspace}
            />
          );

          if (error) {
            return (
              <ResponsiveDashboardShell
                header={topBar}
                activeWorkspace={workspace}
                onWorkspaceChange={setWorkspace}
                mapSlot={<PlaceholderPanel label="Airspace Stage" note={`Failed to load: ${error}`} />}
                timelineSlot={<div />}
                kpiSummarySlot={<div />}
                controlsSlot={<PlaceholderPanel label="Preloaded Scenarios" note={`Failed to load: ${error}`} />}
              />
            );
          }

          if (!data) {
            return (
              <ResponsiveDashboardShell
                header={topBar}
                activeWorkspace={workspace}
                onWorkspaceChange={setWorkspace}
                mapSlot={<PlaceholderPanel label="Airspace Stage" note="Loading nationwide flight radar telemetry…" />}
                timelineSlot={<div />}
                kpiSummarySlot={<div />}
                controlsSlot={<PlaceholderPanel label="Preloaded Scenarios" note="Initializing scenario telemetry…" />}
              />
            );
          }

          return (
            <ResponsiveDashboardShell
              header={topBar}
              activeWorkspace={workspace}
              onWorkspaceChange={setWorkspace}
              mapSlot={
                <div className="relative w-full h-full overflow-hidden">
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
                    scenarioLabel={data.scenario.meta.label}
                    disruptions={active.disruptions}
                    isCleanBoot={isCleanBoot}
                  />
                </div>
              }
              timelineSlot={<FlightDeck scenario={data.scenario} />}
              kpiSummarySlot={
                <FloatingTopHudPill
                  scenario={data.scenario}
                  recovery={recovery}
                  isCleanBoot={isCleanBoot}
                  disruptions={active.disruptions}
                />
              }
              controlsSlot={
                <PreloadedScenariosSidebar
                  scenario={data.scenario}
                  activeScenarioId={activeScenarioId}
                  isCleanBoot={isCleanBoot}
                  onSelectScenario={(slug) => {
                    activatePrecomputed(slug, slug !== "baseline");
                  }}
                />
              }
              auditSlot={
                <div className="space-y-6">
                  {/* Workspace 2 Header */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-blue-400">
                            Workspace 02 &bull; Engine Room: Explainability &amp; Audit
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight font-sans mt-1">
                          5-Agent Arbitration Stream &amp; Deterministic Invariant Proofs
                        </h2>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 self-start md:self-auto font-medium">
                        BTS Audit: 582,410 Records Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-3 max-w-5xl font-sans">
                      Real-time multi-agent arbitration engine arbitrating trade-offs across Aircraft, Crew, Passenger, Gate, and Duty Manager controllers. The discrete-event solver outputs are verified on every step against FAA Part 117 rest mandates and tail rotation conservation.
                    </p>
                  </div>

                  {/* Two-Column 50/50 Split Workspace */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left Column: Deterministic Invariant Proofs */}
                    <div className="space-y-4">
                      <DeterministicValidationCard
                        scenario={data.scenario}
                        recovery={recovery}
                        isCleanBoot={isCleanBoot}
                      />
                    </div>

                    {/* Right Column: 5-Agent Arbitration Engine */}
                    <div className="space-y-4">
                      <AgentRecoveryLedger
                        key={`audit-${activeKey}`}
                        scenario={data.scenario}
                        recovery={recovery}
                        isCleanBoot={isCleanBoot}
                        activeDisruptions={active.disruptions}
                        day={data.scenario.meta.day}
                        defaultViewMode="cards"
                        expandedMode={true}
                        onRecoveryDone={(result) =>
                          setRecovery(
                            buildRecoveryView(
                              result,
                              recoveryResultToSimulationData(result),
                              data.scenario.impactSummary
                            )
                          )
                        }
                        onActivateLive={activateLive}
                      />
                    </div>
                  </div>
                </div>
              }
              analyticsSlot={
                <FinancialAnalyticsView
                  scenario={data.scenario}
                  flights={data.flights}
                  recovery={recovery}
                />
              }
            />
          );
        }}
      </SimulationProvider>
    </InspectorModeProvider>
  );
}

export default ControlRoomApp;
