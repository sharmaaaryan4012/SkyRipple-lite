import type { ScenarioData } from "./types";
import { formatUsd, formatMinutes } from "./format";

/**
 * The short, real-data summary the assistant posts whenever a scenario
 * becomes active. Every number here comes from impactSummary /
 * disruptionMarkers,  nothing estimated or invented.
 */
export function buildScenarioSummary(scenario: ScenarioData): string {
  const impact = scenario.impactSummary;
  const marker = scenario.disruptionMarkers[0];
  const disruptionText = marker ? marker.label : scenario.meta.disruptionSummary;
  return `${scenario.meta.label},  ${disruptionText}. ~${formatUsd(impact.totalCostUsd.typical)} above a normal day, ${formatMinutes(
    impact.totalDelayMin
  )} of delay across the system. Scrub the timeline or jump to the disruption to watch it cascade.`;
}
