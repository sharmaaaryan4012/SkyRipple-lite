"use client";

import { Panel } from "@/components/ui/Panel";
import { RangeValue } from "@/components/ui/RangeValue";
import { MonoStat } from "@/components/ui/MonoStat";
import { CostTimeseriesChart } from "./CostTimeseriesChart";
import { RecoverySavingsChart } from "./RecoverySavingsChart";
import { CarrierDonutChart } from "./CarrierDonutChart";
import { CarrierBreakdownTable } from "./CarrierBreakdownTable";
import { ExportPanel } from "./ExportPanel";
import { DataProvenanceLine } from "@/components/controls/DataProvenanceLine";
import { formatCount, formatMinutes } from "@/lib/format";
import { useViewWindow } from "@/lib/viewWindowContext";
import type { RecoveryView } from "@/lib/recoveryView";
import type { FlightLeg, ScenarioData } from "@/lib/types";

export interface FinancialAnalyticsViewProps {
  scenario: ScenarioData;
  flights: FlightLeg[];
  recovery?: RecoveryView | null;
}

/**
 * Workspace 02: Financial & Carrier Analytics.
 * Bento-box CSS Grid (grid-cols-12):
 * - Top Row: 4 compact KPI cards (Cost Above Normal, Delay Mins, Cancellations, Pax Misconnected) spanning 3 cols each
 * - Middle Row: CostTimeseriesChart (8 cols) + CarrierDonutChart (4 cols) with interactive hover tooltips
 * - Bottom Row: CarrierBreakdownTable (12 cols) + Data Export & Provenance
 */
export function FinancialAnalyticsView({
  scenario,
  flights,
  recovery,
}: FinancialAnalyticsViewProps) {
  const { multiDay, scale, window } = useViewWindow();
  const summary = scenario.impactSummary;
  const chartTitle = multiDay
    ? `${window.label} (${scale}) · Carrier Cost Progression`
    : "Cumulative Delay Cost Progression by Carrier (24h Horizon)";

  return (
    <div className="space-y-5 select-none pb-8">
      {/* =========================================================
          ROW 1: BENTO TOP ROW - 4 COMPACT KPI CARDS (3 COLS EACH)
         ========================================================= */}
      <div className="grid grid-cols-12 gap-4">
        {/* KPI 1: Cost Above Normal (3 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel eyebrow="Cost Above Normal">
            <RangeValue
              low={summary.totalCostUsd.low}
              typical={summary.totalCostUsd.typical}
              high={summary.totalCostUsd.high}
              tone="neutral"
              size="lg"
            />
          </Panel>
        </div>

        {/* KPI 2: Total Delay Minutes (3 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel eyebrow="System Delay">
            <MonoStat
              label="total delay-minutes added"
              value={formatMinutes(summary.totalDelayMin)}
            />
          </Panel>
        </div>

        {/* KPI 3: Flight Cancellations (3 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel eyebrow="Cancellations">
            <MonoStat
              label="flights cancelled by disruption"
              value={formatCount(summary.flightsCancelled)}
            />
          </Panel>
        </div>

        {/* KPI 4: Passenger Misconnections (3 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Panel eyebrow="Passengers Impacted">
            <MonoStat
              label="passengers misconnected"
              value={formatCount(summary.passengersMisconnected)}
            />
          </Panel>
        </div>
      </div>

      {/* =========================================================
          ROW 2: BENTO MIDDLE ROW - 8 COLS CHART + 4 COLS DONUT
         ========================================================= */}
      <div className="grid grid-cols-12 gap-4">
        {/* CostTimeseriesChart (8 cols) */}
        <div className="col-span-12 lg:col-span-8">
          <Panel eyebrow="Cumulative Impact" title={chartTitle} testId="cost-chart-panel">
            <div className="pt-2">
              <CostTimeseriesChart
                data={scenario.costTimeseries}
                markers={scenario.disruptionMarkers}
              />
            </div>
          </Panel>
        </div>

        {/* Carrier Breakdown Donut / Pie Chart (4 cols) */}
        <div className="col-span-12 lg:col-span-4">
          <Panel eyebrow="Airline Exposure" title="Carrier Cost Distribution">
            <div className="pt-1">
              <CarrierDonutChart rows={scenario.ledgerByCarrier} />
            </div>
          </Panel>
        </div>
      </div>

      {/* Recovery Savings Chart (Revealed when recovery active) */}
      {recovery && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Panel
              eyebrow="OCC Autonomous 5-Agent Mitigation"
              title="Unmitigated Cascade vs. Recovered Operations (Saved Gap)"
            >
              <div className="pt-2">
                <RecoverySavingsChart
                  recoveredCostTimeseries={recovery.data.scenario.costTimeseries}
                  revealed
                />
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* =========================================================
          ROW 3: BENTO BOTTOM ROW - FULL CARRIER TABLE (12 COLS)
         ========================================================= */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <Panel eyebrow="Exposure Matrix" title="Carrier Variance Breakdown (Cost &amp; Delay Minutes)">
            <div className="pt-2">
              <CarrierBreakdownTable rows={scenario.ledgerByCarrier} />
            </div>
          </Panel>
        </div>
      </div>

      {/* Data Export & Audit Governance */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <Panel eyebrow="Data Governance &amp; Export" title="Download Operational Ledger Data">
            <ExportPanel scenario={scenario} flights={flights} />
            <div className="mt-4 pt-3 border-t border-slate-800">
              <DataProvenanceLine meta={scenario.meta} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default FinancialAnalyticsView;

