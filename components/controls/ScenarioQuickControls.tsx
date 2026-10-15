"use client";

import { useInspectorMode } from "@/lib/inspectorMode";
import type { ScenarioData } from "@/lib/types";

interface ScenarioQuickControlsProps {
  scenario: ScenarioData;
  activeScenarioId: string;
  isCleanBoot: boolean;
  onSelectScenario: (scenarioId: string) => void;
}

const SCENARIOS = [
  {
    id: "ord-runway-closure",
    label: "ORD Runway Closure",
    tag: "Benchmark",
    tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    desc: "Chicago O'Hare (ORD) • 60% runway capacity reduction from 08:00 to 10:00 CST",
    impact: "$181K Gross Cascade • Single Hub",
  },
  {
    id: "multi-disruption-cascade",
    label: "Multi-Hub Cascade",
    tag: "Compound",
    tagColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    desc: "Concurrent ORD + DEN runway closures compounded by United Airlines fleet hold",
    impact: "3 Concurrent Incidents • Cross-Hub",
  },
  {
    id: "baseline",
    label: "Nominal Operations",
    tag: "Baseline",
    tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    desc: "Normal published schedule operations • $0 cost variance across 340 airports",
    impact: "Steady-State Airspace • 0 Disruptions",
  },
];

export function ScenarioQuickControls({
  scenario,
  activeScenarioId,
  isCleanBoot,
  onSelectScenario,
}: ScenarioQuickControlsProps) {
  const isDisrupted = !isCleanBoot && scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;
  const { enabled: inspectorMode, setEnabled: setInspectorMode } = useInspectorMode();

  return (
    <div className="p-3.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 space-y-3 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isDisrupted ? "bg-red-400 animate-pulse" : "bg-emerald-400"
            }`}
          />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Operational Scenarios
          </h4>
        </div>

        <span className="text-[10px] font-mono text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
          {isDisrupted ? `${scenario.disruptionMarkers.length} Active Events` : "Nominal"}
        </span>
      </div>

      {/* 3 Scenarios Listed Vertically for Full Readability */}
      <div className="flex flex-col gap-2">
        {SCENARIOS.map((sc) => {
          const isActive =
            (sc.id === "baseline" && isCleanBoot) ||
            (activeScenarioId === sc.id && !isCleanBoot);

          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => onSelectScenario(sc.id)}
              className={`p-3 rounded-lg border text-left transition-all relative flex flex-col gap-1.5 ${
                isActive
                  ? "bg-slate-800/95 border-blue-500 shadow-lg ring-1 ring-blue-500/50"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" : "bg-slate-600"
                    }`}
                  />
                  <span className="text-xs font-bold text-white font-mono tracking-tight truncate">
                    {sc.label}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${sc.tagColor}`}
                >
                  {sc.tag}
                </span>
              </div>

              {/* Full Description - Completely Readable */}
              <p className="text-[11px] text-slate-300 leading-snug">
                {sc.desc}
              </p>

              <div className="text-[10px] font-mono text-slate-400 pt-0.5 border-t border-slate-800/60 flex items-center justify-between">
                <span>{sc.impact}</span>
                {isActive && (
                  <span className="text-blue-400 font-semibold">Active Loaded</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Developer Inspector Mode Card */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${inspectorMode ? "bg-amber-400" : "bg-slate-600"}`} />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Dev Mode Inspector
              </span>
              {inspectorMode && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Expose raw GPS coordinates, flight telemetry, and unthrottled airport rosters.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={inspectorMode}
            onClick={() => setInspectorMode(!inspectorMode)}
            data-testid="inspector-mode-toggle"
            aria-label="Toggle Developer Inspector Mode"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              inspectorMode ? "bg-amber-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                inspectorMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
