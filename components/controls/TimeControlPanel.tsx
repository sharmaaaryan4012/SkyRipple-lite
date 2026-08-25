"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { DateClockReadout } from "./DateClockReadout";
import { ScenarioScopePanel } from "./ScenarioScopePanel";
import { TimelineScrubber } from "./TimelineScrubber";
import { PlaybackControls } from "./PlaybackControls";
import { InspectorModeToggle } from "./InspectorModeToggle";
import { DataProvenanceLine } from "./DataProvenanceLine";
import { AboutModal } from "@/components/ui/AboutModal";
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
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <Link href="/" className="font-display text-lg font-semibold text-aubergine hover:text-gold transition-colors">
          SkyRipple<span className="font-light text-muted ml-1 text-base">lite</span>
        </Link>
        <button 
          onClick={() => setAboutOpen(true)}
          className="text-xs font-medium text-muted hover:text-aubergine hover:bg-elevated px-2 py-1 rounded transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          About
        </button>
      </div>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
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
