import type { RecoveryAction, RecoveryResult } from "./backendClient";
import type { ImpactSummary, Range, SeverityBucket, SimulationData } from "./types";

/**
 * The before/after recovery view's derived data model -- the ONE place
 * that turns a raw RecoveryResult (already-finished recordings: the
 * no-recovery cascade's `.baseline` side + the recovered `.scenario`
 * side on every flight/cost-series pair -- see api/engine_bridge.py's
 * _reshape_result call in api/recovery_job.py) into everything the view
 * renders. Every field here is either lifted straight from the result
 * or computed by ARITHMETIC over the two already-simulated sides --
 * nothing here re-simulates anything.
 */
export interface RecoveryView {
  data: SimulationData;
  recoverySaving: RecoveryResult["recoverySaving"];
  actionsTaken: number;
  conflictsDetected: number;
  recoveryActions: RecoveryAction[];
  /** legIds whose recovered severity is strictly better than its
   * no-recovery severity -- the map toggle's gold-tint set. */
  improvedLegIds: Set<string>;
  /** The no-recovery scenario's own absolute impact (what was already on
   * screen before "Compute recovery" was clicked) -- the "before" side
   * of every delta pair. */
  beforeImpact: ImpactSummary;
  /** beforeImpact + this result's own impactSummary (which is itself
   * `recovered - no_recovery`, since ImpactSummary is always an
   * `injected - baseline` diff by construction -- see
   * engine/disruption.py's compute_impact_diff) -- i.e. the recovered
   * scenario's absolute totals, computed by addition, never re-run. */
  afterImpact: ImpactSummary;
}

/** Worse -> better. `unresolved` has no natural place on the delay
 * gradient (it means "never resolved," not "how late") so it's treated
 * as roughly as bad as `severe` -- in practice a finished recovery run
 * essentially never leaves a leg unresolved. */
const SEVERITY_RANK: Record<SeverityBucket, number> = {
  cancelled: 0,
  severe: 1,
  unresolved: 1,
  moderate: 2,
  minor: 3,
  on_time: 4,
};

function addRange(a: Range, b: Range): Range {
  return { low: a.low + b.low, typical: a.typical + b.typical, high: a.high + b.high };
}

export function buildRecoveryView(result: RecoveryResult, recoveredData: SimulationData, beforeImpact: ImpactSummary): RecoveryView {
  const improvedLegIds = new Set<string>();
  for (const f of recoveredData.flights) {
    if (!f.baseline) continue; // no-recovery side missing (shouldn't happen -- same schedule underlies both), can't compare
    if (SEVERITY_RANK[f.scenario.severity] > SEVERITY_RANK[f.baseline.severity]) {
      improvedLegIds.add(f.legId);
    }
  }

  const delta = recoveredData.scenario.impactSummary;
  const afterImpact: ImpactSummary = {
    asOfMin: delta.asOfMin,
    totalCostUsd: addRange(beforeImpact.totalCostUsd, delta.totalCostUsd),
    totalDelayMin: beforeImpact.totalDelayMin + delta.totalDelayMin,
    flightsDelayed: beforeImpact.flightsDelayed + delta.flightsDelayed,
    flightsCancelled: beforeImpact.flightsCancelled + delta.flightsCancelled,
    flightsDiverted: beforeImpact.flightsDiverted + delta.flightsDiverted,
    passengersMisconnected: beforeImpact.passengersMisconnected + delta.passengersMisconnected,
    crewIllegalities: beforeImpact.crewIllegalities + delta.crewIllegalities,
    byCarrier: {},
  };

  return {
    data: recoveredData,
    recoverySaving: result.recoverySaving,
    actionsTaken: result.actionsTaken,
    conflictsDetected: result.conflictsDetected,
    recoveryActions: result.recoveryActions,
    improvedLegIds,
    beforeImpact,
    afterImpact,
  };
}
