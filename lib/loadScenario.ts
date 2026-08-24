import type { CostTimeseries, DisruptionMarker, ImpactSummary, CarrierLedgerRow, ScenarioMeta, ScenarioData, AirportMeta, AirportDaily } from "./types";

/**
 * Fetches one scenario's JSON files from public/scenarios/<slug>/ and
 * assembles them into a single typed ScenarioData. Runs entirely in the
 * browser (plain fetch against static files),  this app has no server at
 * runtime (next.config.ts sets output: "export"), so there is no API
 * route to call instead.
 *
 * Each file is fetched independently and in parallel (Promise.all) rather
 * than bundled into one big JSON, so a later surface (e.g. the map) can
 * fetch just the pieces it needs without pulling in the whole scenario.
 *
 * Task 8c: airports.json is fetched the SAME required way as the other
 * five files -- every scenario exported after this task exists has it
 * (a 404 here would be a real export-pipeline bug, not an expected
 * absence). airport-daily.json is genuinely OPTIONAL (single-day
 * scenarios never have it, by design -- see lib/types.ts's own
 * AirportDaily docstring), so it's fetched separately with a
 * fetchJsonOptional that treats 404 as "undefined," never an error.
 */
export async function loadScenario(slug: string): Promise<ScenarioData> {
  const base = `/scenarios/${slug}`;

  const [meta, costTimeseries, disruptionMarkers, impactSummary, ledgerByCarrier, airports, airportDaily] = await Promise.all([
    fetchJson<ScenarioMeta>(`${base}/meta.json`),
    fetchJson<CostTimeseries>(`${base}/cost-timeseries.json`),
    fetchJson<DisruptionMarker[]>(`${base}/disruption-markers.json`),
    fetchJson<ImpactSummary>(`${base}/impact-summary.json`),
    fetchJson<CarrierLedgerRow[]>(`${base}/ledger-by-carrier.json`),
    fetchJsonOptional<AirportMeta[]>(`${base}/airports.json`, []),
    fetchJsonOptional<AirportDaily | undefined>(`${base}/airport-daily.json`, undefined),
  ]);

  return { meta, costTimeseries, disruptionMarkers, impactSummary, ledgerByCarrier, airports, airportDaily };
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Like fetchJson, but a 404 resolves to `fallback` instead of throwing
 * -- for fields that are genuinely optional per-scenario (see this
 * module's own docstring). Any OTHER failure (network error, 500) still
 * throws -- only a clean 404 is treated as "doesn't exist for this
 * scenario," never a real fetch failure swallowed silently. */
async function fetchJsonOptional<T>(path: string, fallback: T): Promise<T> {
  const res = await fetch(path);
  if (res.status === 404) return fallback;
  if (!res.ok) {
    throw new Error(`failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
