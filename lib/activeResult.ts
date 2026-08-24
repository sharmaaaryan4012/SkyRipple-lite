import type { BackendDisruptionRequest, SimulationData } from "./types";

/**
 * The seam Task 5c adds: what's currently active is either a PRECOMPUTED
 * scenario (identified by slug, data fetched from public/scenarios/<slug>/
 *,  see SimulationProvider.tsx) or a LIVE result (already-resolved
 * SimulationData sitting in memory, straight from a /api/simulate or
 * /api/parse-and-simulate response body,  no fetch at all). Every
 * consumer below SimulationProvider (map/dashboard/timeline) only ever
 * sees the resolved `SimulationData`, never this type,  this is strictly
 * an input to SimulationProvider, not a rendering shape, which is what
 * keeps those consumers origin-agnostic (the task's own "seam
 * discipline" requirement).
 *
 * Task B follow-up (Fix 1, clean-slate boot): "precomputed" now
 * exclusively means the app's own clean-baseline BOOT load,  the chat's
 * old precomputed-scenario showcase chips (the only other thing that
 * ever set this kind) were removed in an earlier fix (see
 * ChatDock.tsx's own docstring), and SimulationProvider.tsx transforms
 * whatever it fetches through lib/bootState.ts's buildCleanBootState()
 * before it's ever shown,  so a "precomputed" ActiveResult always
 * renders as "normal day, nothing injected," never a pre-cascaded
 * disruption.
 *
 * `disruptions` travels alongside both variants because /api/recovery
 * needs to re-POST the exact structured disruption(s) that produced the
 * active scenario -- for a live result these are exactly what the chat
 * already sent (or what the backend's parser resolved them to). For the
 * boot/precomputed case it's always `null` now -- the clean boot state
 * has, honestly, no disruption to recover from yet (see
 * ControlRoomApp.tsx's initial state); RecoveryPanel's disabled state
 * already handles `null` gracefully.
 */
export type ActiveResult =
  | { kind: "precomputed"; scenarioId: string; disruptions: BackendDisruptionRequest[] | null }
  | { kind: "live"; requestId: number; data: SimulationData; disruptions: BackendDisruptionRequest[] };

let liveRequestCounter = 0;

/** Mints a fresh `live` ActiveResult with a unique requestId, so
 * SimulationProvider's fetch-effect can tell "a new live result just
 * arrived" apart from "this render just happens to run again" even when
 * two live results share the same scenarioId (e.g. both came back as
 * meta.scenarioId: "live" -- the backend's own default slug). */
export function makeLiveActiveResult(data: SimulationData, disruptions: BackendDisruptionRequest[]): ActiveResult {
  liveRequestCounter += 1;
  return { kind: "live", requestId: liveRequestCounter, data, disruptions };
}
