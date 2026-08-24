"use client";

import { Panel } from "@/components/ui/Panel";
import { CostTimeseriesChart } from "./CostTimeseriesChart";
import { RecoverySavingsChart } from "./RecoverySavingsChart";
import { ImpactSummaryCards } from "./ImpactSummaryCards";
import { CarrierBreakdownTable } from "./CarrierBreakdownTable";
import { ExportPanel } from "./ExportPanel";
import { useViewWindow } from "@/lib/viewWindowContext";
import type { RecoveryView } from "@/lib/recoveryView";
import type { FlightLeg, ScenarioData } from "@/lib/types";

/**
 * The full ledger/dashboard column: pure presentation now. Task 5c
 * removed this component's own independent loadScenario(scenarioId)
 * fetch,  it duplicated SimulationProvider's own load (both would fire
 * for the same scenario) and, worse, a LIVE result has no scenarioId to
 * re-fetch by (its data only ever exists in memory,  see
 * lib/activeResult.ts). `scenario` now comes straight from
 * SimulationProvider's already-loaded data, exactly like MapPanel and
 * TimeControlPanel already receive their data as props instead of
 * fetching it themselves.
 *
 * `recovery` (the before/after finale) is optional/null until a
 * "Compute recovery" run has finished,  the grand-total gold savings
 * overlay is a SEPARATE Panel block, added after the existing per-carrier
 * chart rather than folded into it (a gold band per carrier, up to 14 of
 * them, would be unreadable,  see RecoverySavingsChart.tsx's own
 * docstring), so this stays additive, not a layout rebuild.
 */
export function Dashboard({ scenario, flights, recovery }: { scenario: ScenarioData; flights: FlightLeg[]; recovery?: RecoveryView | null }) {
  // The day/week/month toggle itself now lives in the controls rail (see
  // components/controls/ScenarioScopePanel.tsx) -- this chart card only
  // ECHOES the currently selected scope in its own title, rather than
  // offering the control that sets it, so scope reads as one decision
  // made in one place. (Verified before this move: the toggle re-slices
  // this ALREADY-LOADED costTimeseries entirely client-side --
  // lib/viewWindowContext.tsx has zero fetch/network calls of its own --
  // it never re-runs the simulation, so relocating it changes nothing
  // about what data this chart renders.)
  const { multiDay, scale, window } = useViewWindow();
  const chartTitle = multiDay ? `${window.label} (${scale}), by carrier` : "Cost over the day, by carrier";

  return (
    <div className="flex flex-col gap-4">
      <Panel eyebrow={scenario.meta.day} title={scenario.meta.label}>
        <p className="text-xs text-muted">{scenario.meta.disruptionSummary}</p>
      </Panel>

      <ImpactSummaryCards summary={scenario.impactSummary} />

      <Panel eyebrow="Cumulative cost" title={chartTitle} testId="cost-chart-panel">
        <CostTimeseriesChart data={scenario.costTimeseries} markers={scenario.disruptionMarkers} />
      </Panel>

      {recovery && (
        <Panel eyebrow="Recovery savings" title="No-recovery vs. recovered cost">
          <RecoverySavingsChart recoveredCostTimeseries={recovery.data.scenario.costTimeseries} revealed />
        </Panel>
      )}

      <Panel eyebrow="Per carrier" title="Cost above normal, by carrier">
        <CarrierBreakdownTable rows={scenario.ledgerByCarrier} />
      </Panel>

      <Panel eyebrow="Export" title="Download the current view">
        <ExportPanel scenario={scenario} flights={flights} />
      </Panel>
    </div>
  );
}
