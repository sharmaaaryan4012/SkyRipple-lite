import { formatCount } from "@/lib/format";
import type { ScenarioMeta } from "@/lib/types";

/**
 * Inspector Mode (Task 8f): the always-visible, NEVER-gated data-
 * provenance line -- unlike the Rotation/Crew tabs, this does NOT check
 * useInspectorMode() at all, per this task's own explicit requirement.
 * Reads `meta.recordCounts`, a live COUNT(*) computed at export/request
 * time (see scripts/scenario_reshape.py's load_reference_record_counts),
 * never a hardcoded frontend number. Renders nothing for a scenario
 * exported before this field existed -- absence means "don't show a
 * provenance line," never "show zero."
 */
export function DataProvenanceLine({ meta }: { meta: ScenarioMeta }) {
  if (!meta.recordCounts) return null;
  const { flightLegCount, airportCount } = meta.recordCounts;

  return (
    <p className="text-[10px] text-muted px-1 leading-snug">
      Built from {formatCount(flightLegCount)} real BTS flight legs across {formatCount(airportCount)} airports.
    </p>
  );
}
