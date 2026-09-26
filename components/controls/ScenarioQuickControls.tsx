"use client";

import { RadarDot } from "@/components/ui/RadarDot";
import type { ScenarioData } from "@/lib/types";

interface ScenarioQuickControlsProps {
  scenario: ScenarioData;
  activeScenarioId: string;
  isCleanBoot: boolean;
  onSelectScenario: (scenarioId: string) => void;
}

const BENCHMARK_SCENARIOS = [
  { id: "ord-runway-closure", label: "ORD Runway Closure", desc: "60% capacity cut, Chicago O'Hare", tag: "Benchmark" },
  { id: "multi-disruption-cascade", label: "Multi-Hub Cascade", desc: "ORD + DEN closure & UA fleet hold", tag: "Complex" },
  { id: "december-full", label: "December Month", desc: "582K flights, full-month national scope", tag: "Multi-Day" },
  { id: "baseline", label: "Nominal Baseline", desc: "Reset airspace to $0 cost variance", tag: "Clean Slate" },
];

export function ScenarioQuickControls({
  scenario,
  activeScenarioId,
  isCleanBoot,
  onSelectScenario,
}: ScenarioQuickControlsProps) {
  const isDisrupted = !isCleanBoot && scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;

  return (
    <div className="p-3.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {isDisrupted ? <RadarDot size="sm" /> : <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Airspace Scenarios &amp; Triggers
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              Deterministic Cascade Benchmark Injectors
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
          {isDisrupted ? `${scenario.disruptionMarkers.length} Incidents` : "Nominal"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BENCHMARK_SCENARIOS.map((sc) => {
          const isActive = (sc.id === "baseline" && isCleanBoot) || (activeScenarioId === sc.id && !isCleanBoot);
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              className={`p-2.5 rounded-lg border text-left transition relative flex flex-col justify-between ${
                isActive
                  ? "bg-slate-800 border-gold shadow-md"
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-semibold text-white font-mono">{sc.label}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {sc.tag}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{sc.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

