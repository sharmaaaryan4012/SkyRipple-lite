import { Panel } from "@/components/ui/Panel";
import { RangeValue } from "@/components/ui/RangeValue";
import { MonoStat } from "@/components/ui/MonoStat";
import { formatCount, formatMinutes } from "@/lib/format";
import type { ImpactSummary } from "@/lib/types";

/**
 * Four headline numbers. Cost figures use the red family,  per the
 * design system, gold is reserved for RECOVERED value, which this task
 * doesn't compute yet (that's the later with/without-recovery
 * comparison); everything here is impact/cost, so it stays on the
 * red/neutral side.
 */
export function ImpactSummaryCards({ summary }: { summary: ImpactSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Panel eyebrow="Cost above normal">
        <RangeValue low={summary.totalCostUsd.low} typical={summary.totalCostUsd.typical} high={summary.totalCostUsd.high} tone="red" size="lg" />
      </Panel>
      <Panel eyebrow="Delay">
        <MonoStat label="total delay-minutes added" value={formatMinutes(summary.totalDelayMin)} />
      </Panel>
      <Panel eyebrow="Cancellations">
        <MonoStat label="flights cancelled by this disruption" value={formatCount(summary.flightsCancelled)} />
      </Panel>
      <Panel eyebrow="Passengers">
        <MonoStat label="passengers misconnected" value={formatCount(summary.passengersMisconnected)} />
      </Panel>
    </div>
  );
}
