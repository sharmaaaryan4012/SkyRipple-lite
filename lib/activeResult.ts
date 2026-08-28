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
 * Task B follow-up (Fix 1, clean-slate boot): "precomputed" originally
 * meant exclusively the app's own clean-baseline BOOT load. The starter
 * chips in ChatDock (see its own docstring) now also produce a
 * "precomputed" result -- swapping WHICH precomputed export is active
 * in place, no navigation -- so `raw` distinguishes the two: the boot
 * load stays cleaned (`raw: false`, SimulationProvider.tsx runs it
 * through lib/bootState.ts's buildCleanBootState()) while a chip
 * activation wants the export's REAL, un-cleaned cascade (`raw: true`),
 * exactly like the `?raw=1` verification param already did for the boot
 * scenario.
 *
 * `disruptions` travels alongside both variants because /api/recovery
 * needs to re-POST the exact structured disruption(s) that produced the
 * active scenario -- for a live result these are exactly what the chat
 * already sent (or what the backend's parser resolved them to). For the
 * precomputed case it's always `null` -- no precomputed export has a
 * lib/scenarioRegistry.ts mapping back to structured disruption params
 * -- RecoveryPanel's disabled state already handles `null` gracefully
 * (moot in the Lite build anyway, where recovery is disabled outright).
 */
export type ActiveResult =
  | { kind: "precomputed"; scenarioId: string; disruptions: BackendDisruptionRequest[] | null; raw: boolean }
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

/** Mints a `precomputed` ActiveResult for a starter-chip activation --
 * always `raw: true` (the chip's whole point is showing the export's
 * real disruption cascade in place, not another clean boot). */
export function makePrecomputedActiveResult(scenarioId: string): ActiveResult {
  return { kind: "precomputed", scenarioId, disruptions: null, raw: true };
}
