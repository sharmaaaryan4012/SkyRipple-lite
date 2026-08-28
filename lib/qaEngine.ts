import type { ScenarioData } from "./types";
import { formatUsd, formatMinutes } from "./format";

/**
 * The short, real-data summary the assistant posts whenever a scenario
 * becomes active. Every number here comes from impactSummary /
 * disruptionMarkers,  nothing estimated or invented.
 */
export function buildScenarioSummary(scenario: ScenarioData): string {
  const impact = scenario.impactSummary;
  const markers = scenario.disruptionMarkers;
  // A scenario with several injected disruptions (e.g. the
  // "Multi-Disruption Cascade" starter) lists every one of them --
  // showing only markers[0] would silently drop the rest of what the
  // chip is actually demonstrating.
  const disruptionText = markers.length > 0 ? markers.map((m) => m.label).join("; ") : scenario.meta.disruptionSummary;
  return `${scenario.meta.label},  ${disruptionText}. ~${formatUsd(impact.totalCostUsd.typical)} above a normal day, ${formatMinutes(
    impact.totalDelayMin
  )} of delay across the system. Scrub the timeline or jump to the disruption to watch it cascade.`;
}
