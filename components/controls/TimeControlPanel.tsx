import { Panel } from "@/components/ui/Panel";
import { DateClockReadout } from "./DateClockReadout";
import { ScenarioScopePanel } from "./ScenarioScopePanel";
import { TimelineScrubber } from "./TimelineScrubber";
import { PlaybackControls } from "./PlaybackControls";
import { InspectorModeToggle } from "./InspectorModeToggle";
import { DataProvenanceLine } from "./DataProvenanceLine";
import type { ScenarioData } from "@/lib/types";

/**
 * The `controls` grid area's real content,  replaces Task 2's minimal
 * TimeScrubber (which lived floating over the map; that's gone now,
 * fully superseded by this). Every piece here drives the SAME
 * useTimeCursor() cursor USMap consumes (see lib/timeCursor.tsx and
 * components/SimulationProvider.tsx for how the provider now wraps this
 * panel too, not just the map).
 *
 * "Scenario scope" sits directly below "Simulated time" -- the day/week/
 * month granularity toggle + its date/range picker, merged with the old
 * static "scenario date" chip so date + granularity read as ONE decision
 * (see ScenarioScopePanel.tsx's own docstring for why it moved out of the
 * cost-chart card).
 */
export function TimeControlPanel({ scenario }: { scenario: ScenarioData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-display text-lg font-semibold text-aubergine px-1">SkyRipple<span className="font-light text-muted ml-1 text-base">lite</span></p>
      <Panel eyebrow="Simulated time">
        <DateClockReadout day={scenario.meta.day} />
      </Panel>

      <Panel eyebrow="Scenario scope">
        <ScenarioScopePanel day={scenario.meta.day} />
      </Panel>

      <Panel eyebrow="Timeline" title={scenario.meta.label}>
        <TimelineScrubber costTimeseries={scenario.costTimeseries} disruptionMarkers={scenario.disruptionMarkers} />
      </Panel>

      <Panel eyebrow="Playback">
        <PlaybackControls disruptionMarkers={scenario.disruptionMarkers} />
      </Panel>

      <Panel eyebrow="Developer">
        <InspectorModeToggle />
      </Panel>

      <DataProvenanceLine meta={scenario.meta} />
    </div>
  );
}
