import type { AirportMeta, BackendDisruptionRequest, CarrierLedgerRow, CostTimeseries, DisruptionMarker, FlightLeg, ImpactSummary, Range, ScenarioMeta, SimulationData } from "./types";

/**
 * Phase 7 Task 5c: the client for the LOCAL FastAPI backend (api/main.py,
 * Task 5a/5b). Base URL is configurable, never hardcoded,  see
 * NEXT_PUBLIC_API_BASE_URL in .env.local (this project runs locally only,
 * no deployment, per Task 5a/5b's own architecture note). Defaults to
 * localhost:8000, the documented `uvicorn api.main:app --port 8000` port.
 *
 * Every function here returns the backend's response shape as close to
 * verbatim as possible (it's already camelCase,  see
 * scripts/scenario_reshape.py,  so no reshaping is needed, unlike a REST
 * API with a different wire contract). The one seam function,
 * `toSimulationData`, exists only to peel the nested `flights.flights`
 * array out into the `SimulationData` shape SimulationProvider/lib/types.ts
 * already define, matching what loadFlights()+loadScenario() assemble for
 * a precomputed scenario.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class BackendUnreachableError extends Error {
  constructor(cause: unknown) {
    super("Couldn't reach the simulation engine,  is the local backend running? (uvicorn api.main:app --port 8000)");
    this.name = "BackendUnreachableError";
    this.cause = cause;
  }
}

/** A structured error the backend returned deliberately (400/503),  as
 * opposed to BackendUnreachableError (couldn't even connect) or a raw
 * unexpected exception. Callers pattern-match on `status` to decide how
 * to phrase the honest reply. */
export class BackendApiError extends Error {
  status: number;
  detail: Record<string, unknown>;
  constructor(status: number, detail: Record<string, unknown>) {
    super(typeof detail.message === "string" ? detail.message : `backend error ${status}`);
    this.name = "BackendApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (err) {
    // fetch() throws (TypeError) on network failure / connection refused --
    // this is the "backend isn't running" case the loading UX must show
    // clearly rather than as a generic crash.
    throw new BackendUnreachableError(err);
  }
  if (!res.ok) {
    let detail: Record<string, unknown> = {};
    try {
      const body = await res.json();
      detail = (body?.detail as Record<string, unknown>) ?? body ?? {};
    } catch {
      // body wasn't JSON -- leave detail empty, status still carries the signal
    }
    throw new BackendApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------
// /api/health, /api/scenarios
// ---------------------------------------------------------------------
export interface HealthResponse {
  status: string;
  worldLoaded: boolean;
  worldLoadSeconds: number | null;
  dayBaselinesWarm: string[];
  nlAvailable: boolean;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export function fetchScenarios(): Promise<{ scenarios: ScenarioMeta[] }> {
  return request<{ scenarios: ScenarioMeta[] }>("/api/scenarios");
}

// ---------------------------------------------------------------------
// /api/simulate, /api/parse, /api/parse-and-simulate
// ---------------------------------------------------------------------
interface RawSimulateResult {
  meta: ScenarioMeta;
  costTimeseries: CostTimeseries;
  disruptionMarkers: DisruptionMarker[];
  impactSummary: ImpactSummary;
  ledgerByCarrier: CarrierLedgerRow[];
  airports: AirportMeta[];
  flights: { severityThresholdsMin: { minor: number; moderate: number; severe: number }; flights: FlightLeg[] };
  timingMs?: Record<string, number>;
}

/** Peels a raw backend simulate-shaped result into the SimulationData
 * shape this app already renders (see lib/types.ts),  the one seam
 * between the backend's wire shape and what SimulationProvider hands its
 * children, mirroring what loadFlights()+loadScenario() assemble for a
 * precomputed scenario. */
function toSimulationData(raw: RawSimulateResult): SimulationData {
  return {
    flights: raw.flights.flights,
    scenario: {
      meta: raw.meta,
      costTimeseries: raw.costTimeseries,
      disruptionMarkers: raw.disruptionMarkers,
      impactSummary: raw.impactSummary,
      ledgerByCarrier: raw.ledgerByCarrier,
      airports: raw.airports,
    },
  };
}

export interface ParseIntent {
  kind: string;
  target: Record<string, string | number | null>;
  params: Record<string, number>;
  assumedDefaults: string[];
}

export interface ParseOnlyResponse {
  supported: boolean;
  usedFallback: boolean;
  interpretation: string;
  intents: ParseIntent[];
}

export function parseOnly(text: string, day?: string): Promise<ParseOnlyResponse> {
  return request<ParseOnlyResponse>("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(day ? { text, day } : { text }),
  });
}

/** Discriminated result of /api/parse-and-simulate: either a live
 * simulation (with its `data` ready to activate) or an honest miss (no
 * simulation ran). Structured 400s (bad-but-parseable target) and 503
 * (no GEMINI_API_KEY) surface as thrown BackendApiError instead,  see
 * ChatDock.tsx for how each of the three is turned into an honest reply. */
export type ParseAndSimulateResult =
  | { supported: true; usedFallback: boolean; interpretation: string; parsedIntents: ParseIntent[]; data: SimulationData }
  | { supported: false; usedFallback: boolean; interpretation: string };

export async function parseAndSimulate(text: string, day?: string, slug?: string, scopeDays: number = 1): Promise<ParseAndSimulateResult> {
  const raw = await request<RawSimulateResult & { supported: boolean; usedFallback: boolean; interpretation: string; parsedIntents?: ParseIntent[] }>(
    "/api/parse-and-simulate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, ...(day ? { day } : {}), ...(slug ? { slug } : {}), scope_days: scopeDays }),
    }
  );
  if (!raw.supported) {
    return { supported: false, usedFallback: raw.usedFallback, interpretation: raw.interpretation };
  }
  return { supported: true, usedFallback: raw.usedFallback, interpretation: raw.interpretation, parsedIntents: raw.parsedIntents ?? [], data: toSimulationData(raw) };
}

// ---------------------------------------------------------------------
// /api/ask (Task 8e)
// ---------------------------------------------------------------------

/** Compact description of whatever's CURRENTLY loaded on the frontend --
 * enough for Gemini to resolve names/dates and route intelligently, NOT
 * the full flight-level data (that never leaves the browser). Built
 * fresh per request by lib/qaSnapshot.ts's buildSnapshot(); field names
 * are snake_case to match api/qa_router.py's ScenarioSnapshot wire
 * contract exactly, the same deliberate exception BackendDisruptionTarget
 * already uses for the same reason (see lib/types.ts's own note there). */
export interface AskSnapshot {
  scenario_id: string;
  label: string;
  day: string;
  start_day: string | null;
  end_day: string | null;
  disruption_summary: string;
  carrier_codes: string[];
  disrupted_airports: string[];
  has_recovery: boolean;
}

export type AskClassification = "disruption" | "question" | "ambiguous" | "tier_c" | "unknown";

export interface AskResponse {
  classification: AskClassification;
  /** The FINAL message for ambiguous/tier_c/unknown routes (Gemini's own
   * clarifying question, or a fixed code-authored decline/honest-miss
   * string -- see api/qa_router.py). Empty for "disruption" (the existing
   * parseAndSimulate path builds its own) and "question" (lib/qaQuery.ts
   * builds the interpretation+answer together, using real carrier/airport
   * names this endpoint deliberately doesn't have). */
  interpretation: string;
  queryKind: string | null;
  params: Record<string, string>;
}

export function askChat(text: string, snapshot: AskSnapshot): Promise<AskResponse> {
  return request<AskResponse>("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, snapshot }),
  });
}

// ---------------------------------------------------------------------
// /api/recovery
// ---------------------------------------------------------------------
export interface RecoveryStartResponse {
  jobId: string;
  estimatedDurationSec: number;
}

export function startRecovery(day: string, disruptions: BackendDisruptionRequest[], scopeDays: number = 1): Promise<RecoveryStartResponse> {
  return request<RecoveryStartResponse>("/api/recovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day, disruptions, scope_days: scopeDays }),
  });
}

/** One arbitration-winning action the OCC actually applied -- see
 * api/recovery_job.py's _action_to_dict / models/runtime/recovery_action.py.
 * `affectedIds` is action_type-dependent (e.g. SWAP_TAILS: [legId,
 * newTailNumber]) -- rendered generically, not reinterpreted per type. */
export interface RecoveryAction {
  actionId: string;
  actorRole: string;
  actionType: string;
  affectedIds: string[];
  timestampMin: number;
  rationale: string;
  costEstimate: number | null;
}

export interface RecoveryResult extends RawSimulateResult {
  recoverySaving: Range;
  actionsTaken: number;
  conflictsDetected: number;
  recoveryActions: RecoveryAction[];
}

export interface RecoveryStatusResponse {
  jobId: string;
  state: "queued" | "running" | "done" | "error";
  progress: number;
  message: string;
  result: RecoveryResult | null;
  error: string | null;
}

export function pollRecoveryStatus(jobId: string): Promise<RecoveryStatusResponse> {
  return request<RecoveryStatusResponse>(`/api/recovery/${jobId}`);
}

/** Same peeling as toSimulationData, plus the recovery-only fields,  kept
 * separate (not reused by parse-and-simulate) because RecoveryResult has
 * extra fields SimulationData doesn't. Exported for the panel that stashes
 * the done result (components/dashboard/RecoveryPanel.tsx). */
export function recoveryResultToSimulationData(result: RecoveryResult): SimulationData {
  return toSimulationData(result);
}
