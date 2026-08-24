import type { ScenarioData } from "./types";
import type { RecoveryView } from "./recoveryView";
import type { AskSnapshot } from "./backendClient";

/**
 * Task 8e: builds the COMPACT description of whatever's currently loaded
 * that /api/ask's Gemini call uses to resolve names/dates and route
 * intelligently -- see api/qa_router.py's own docstring for why this is
 * deliberately small (carrier codes + DISRUPTED airport IATAs + coverage
 * dates, not the full airport list or any flight-level data, which never
 * leaves the browser).
 */
export function buildSnapshot(scenario: ScenarioData, recovery: RecoveryView | null): AskSnapshot {
  const disruptedAirports = Array.from(new Set(scenario.disruptionMarkers.map((m) => m.airportIata).filter((iata): iata is string => iata != null)));
  return {
    scenario_id: scenario.meta.scenarioId,
    label: scenario.meta.label,
    day: scenario.meta.day,
    start_day: scenario.meta.startDay ?? null,
    end_day: scenario.meta.endDay ?? null,
    disruption_summary: scenario.meta.disruptionSummary,
    carrier_codes: scenario.ledgerByCarrier.map((r) => r.carrierCode),
    disrupted_airports: disruptedAirports,
    has_recovery: recovery !== null,
  };
}
