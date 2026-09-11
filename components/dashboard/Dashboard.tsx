"use client";

import { Panel } from "@/components/ui/Panel";
import { CostTimeseriesChart } from "./CostTimeseriesChart";
import { RecoverySavingsChart } from "./RecoverySavingsChart";
import { ImpactSummaryCards } from "./ImpactSummaryCards";
import { CarrierBreakdownTable } from "./CarrierBreakdownTable";
import { ExportPanel } from "./ExportPanel";
import { DataProvenanceLine } from "@/components/controls/DataProvenanceLine";
import { useViewWindow } from "@/lib/viewWindowContext";
import type { RecoveryView } from "@/lib/recoveryView";
import type { FlightLeg, ScenarioData } from "@/lib/types";

/**
 * The Financial & Operational Impact Ledger column.
 * Organizes complex simulation telemetry into an executive 4-tier hierarchy:
 * 1. Scenario Context Header & Executive Summary
 * 2. High-Impact Headline KPI Scorecard (Damage Assessment)
 * 3. Cumulative Cost Progression Chart (Time-correlated)
 * 4. Autonomous Recovery & Mitigated Value (Solution Layer)
 * 5. Airline Carrier Contagion Distribution
 * 6. Ledger Export & Data Provenance
 */
export function Dashboard({
  scenario,
  flights,
  recovery,
}: {
  scenario: ScenarioData;
  flights: FlightLeg[];
  recovery?: RecoveryView | null;
}) {
  const { multiDay, scale, window } = useViewWindow();
  const chartTitle = multiDay ? `${window.label} (${scale}), by carrier` : "Cost over the day, by carrier";

  return (
    <div className="flex flex-col gap-3.5">
      {/* Tier 1: Context & Incident Hook */}
      <Panel eyebrow="Impact Assessment" title={scenario.meta.label}>
        <p className="text-xs text-muted leading-relaxed">{scenario.meta.disruptionSummary}</p>
      </Panel>

      {/* Tier 2: Headline KPI Scorecard */}
      <ImpactSummaryCards summary={scenario.impactSummary} />

      {/* Tier 3: Time-Correlated Cumulative Cost Curve */}
      <Panel eyebrow="Cumulative Impact" title={chartTitle} testId="cost-chart-panel">
        <CostTimeseriesChart data={scenario.costTimeseries} markers={scenario.disruptionMarkers} />
      </Panel>

      {/* Tier 4: Autonomous AI Recovery Savings (When active) */}
      {recovery && (
        <Panel eyebrow="OCC Recovery Mitigation" title="Unmitigated Cascade vs. Recovered Operations">
          <RecoverySavingsChart recoveredCostTimeseries={recovery.data.scenario.costTimeseries} revealed />
        </Panel>
      )}

      {/* Tier 5: Carrier Contagion Distribution Matrix */}
      <Panel eyebrow="Airline Exposure" title="Cost Above Normal by Carrier">
        <CarrierBreakdownTable rows={scenario.ledgerByCarrier} />
      </Panel>

      {/* Tier 6: Export & Provenance */}
      <Panel eyebrow="Data Export" title="Download View Data">
        <ExportPanel scenario={scenario} flights={flights} />
        <div className="mt-3 pt-2.5 border-t border-border/60">
          <DataProvenanceLine meta={scenario.meta} />
        </div>
      </Panel>
    </div>
  );
}
