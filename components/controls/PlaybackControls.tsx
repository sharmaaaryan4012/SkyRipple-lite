"use client";

import { useTimeCursor } from "@/lib/timeCursor";
import { useViewWindow } from "@/lib/viewWindowContext";
import { markersInWindow } from "@/lib/timeAggregation";
import type { DisruptionMarker } from "@/lib/types";
import { useMemo } from "react";

const SPEEDS = [1, 2, 4] as const;

export function PlaybackControls({ disruptionMarkers: rawMarkers }: { disruptionMarkers: DisruptionMarker[] }) {
  const { isPlaying, toggle, speedMultiplier, setSpeedMultiplier, setMinute, minMinute, maxMinute } = useTimeCursor();
  const { multiDay } = useViewWindow();

  const disruptionMarkers = useMemo(
    () => (multiDay ? markersInWindow(rawMarkers, minMinute, maxMinute) : rawMarkers),
    [rawMarkers, multiDay, minMinute, maxMinute]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="w-7 h-7 flex items-center justify-center rounded border border-border text-aubergine hover:bg-elevated state-transition shrink-0"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="flex items-center border border-border rounded overflow-hidden">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeedMultiplier(speed)}
              className={`font-mono tabular-nums text-xs px-2 py-1 state-transition ${
                speedMultiplier === speed ? "bg-elevated text-aubergine" : "text-muted hover:text-aubergine"
              }`}
            >
              {speed}&times;
            </button>
          ))}
        </div>
      </div>

      {disruptionMarkers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {disruptionMarkers.map((m) => (
            <button
              key={m.id}
              onClick={() => setMinute(m.simMin)}
              title={m.label}
              className="flex items-center gap-1.5 font-mono text-xs text-red-soft border border-border rounded px-2 py-1.5 hover:bg-elevated state-transition text-left"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red shrink-0" />
              <span className="truncate">Jump to disruption</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M1 0.5L9.5 5L1 9.5V0.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <rect x="1" y="0.5" width="3" height="9" />
      <rect x="6" y="0.5" width="3" height="9" />
    </svg>
  );
}
