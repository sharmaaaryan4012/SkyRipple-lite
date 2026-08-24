import type { BackendDisruptionRequest } from "./types";

/**
 * Task 5c: this registry's only remaining job is mapping a PRECOMPUTED
 * scenario's slug to the structured {kind, target, params} disruption(s)
 * that produced it,  needed so the "Compute Recovery" button can re-POST
 * the same disruption to /api/recovery for a showcase scenario (a LIVE
 * result already carries this directly, since the chat just sent/received
 * it,  see lib/activeResult.ts). The showcase CHIP LIST itself now comes
 * from the backend (GET /api/scenarios,  see lib/backendClient.ts and
 * ChatDock.tsx), not from this file; a scenario the backend lists but that
 * has no entry here still loads and renders fine, it just can't offer
 * recovery (an honest gap, not a crash,  see RecoveryPanel.tsx).
 *
 * Task 4's client-side keyword matcher (lib/intentMatcher.ts) is gone: the
 * chat now calls the real backend (/api/parse-and-simulate) instead of
 * scoring free text against a fixed cue list.
 *
 * `intent` mirrors the backend's own injection API vocabulary exactly
 * (engine/disruption.py's DisruptionKind + _TARGET_KIND_FOR_DISRUPTION +
 * _REQUIRED_PARAMS) so it converts to a BackendDisruptionRequest with no
 * guessing,  see toBackendDisruptionRequest below.
 */
export type DisruptionKind = "delay_flight" | "cancel_flight" | "ground_aircraft" | "close_runway" | "reduce_airport_capacity" | "weather_event";

export type TargetKind = "leg_id" | "tail_number" | "airport_iata" | "carrier_code";

export interface DisruptionIntent {
  kind: DisruptionKind;
  targetKind: TargetKind;
  targetId: string; // e.g. "ORD" -- matches engine/disruption.py's resolve_target() id form for this targetKind
  params: Record<string, number>; // shape matches _REQUIRED_PARAMS[kind] on the backend
}

export interface ScenarioRegistryEntry {
  scenarioId: string; // matches the backend's meta.scenarioId (GET /api/scenarios)
  intent: DisruptionIntent;
}

export const SCENARIO_REGISTRY: ScenarioRegistryEntry[] = [
  {
    scenarioId: "ord-runway-closure",
    intent: {
      kind: "close_runway",
      targetKind: "airport_iata",
      targetId: "ORD",
      params: { window_start_min: 480, window_end_min: 600, capacity_reduction_pct: 60 },
    },
  },
];

export function findRegistryEntry(scenarioId: string): ScenarioRegistryEntry | undefined {
  return SCENARIO_REGISTRY.find((s) => s.scenarioId === scenarioId);
}

export function toBackendDisruptionRequest(intent: DisruptionIntent): BackendDisruptionRequest {
  return { kind: intent.kind, target: { [intent.targetKind]: intent.targetId }, params: intent.params };
}

/** The structured disruption(s) that produced a precomputed scenario, in
 * the exact shape /api/recovery expects,  or null if this scenarioId
 * isn't in the registry (recovery isn't offered for it; see
 * RecoveryPanel.tsx's disabled state). */
export function disruptionsForScenario(scenarioId: string): BackendDisruptionRequest[] | null {
  const entry = findRegistryEntry(scenarioId);
  return entry ? [toBackendDisruptionRequest(entry.intent)] : null;
}
