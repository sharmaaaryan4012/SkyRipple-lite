"use client";

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
    meta: "Chicago O'Hare • 60% Capacity Reduction",
    tag: "Benchmark",
  },
  {
    id: "multi-disruption-cascade",
    label: "Multi-Hub Cascade",
    meta: "ORD + DEN Closures • Fleet Grounding",
    tag: "Multi-Hub",
  },
  {
    id: "baseline",
    label: "Nominal Operations",
    meta: "Published Schedule • $0 Cost Variance",
    tag: "Baseline",
  },
];

export function ScenarioQuickControls({
  scenario,
  activeScenarioId,
  isCleanBoot,
  onSelectScenario,
}: ScenarioQuickControlsProps) {
  const isDisrupted = !isCleanBoot && scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;

  return (
    <div className="p-3 rounded-lg bg-surface border border-border space-y-2.5 select-none">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isDisrupted ? "bg-[#EF4444] animate-pulse" : "bg-emerald-400"
            }`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted font-semibold">
            Operational Scenarios
          </span>
        </div>

        <span className="text-[10px] font-mono text-muted bg-elevated px-2 py-0.5 rounded border border-border">
          {isDisrupted ? `${scenario.disruptionMarkers.length} Active Events` : "Nominal"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {SCENARIOS.map((sc) => {
          const isActive =
            (sc.id === "baseline" && isCleanBoot) ||
            (activeScenarioId === sc.id && !isCleanBoot);

          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              className={`p-2.5 rounded-md border text-left transition-all flex flex-col justify-between min-h-[58px] ${
                isActive
                  ? "bg-elevated border-gold shadow-sm ring-1 ring-gold/40"
                  : "bg-surface border-border hover:border-muted hover:bg-elevated/50"
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-xs font-semibold text-white tracking-tight truncate">
                  {sc.label}
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                    isActive
                      ? "bg-gold/15 text-gold border-gold/30 font-medium"
                      : "bg-elevated text-muted border-border"
                  }`}
                >
                  {sc.tag}
                </span>
              </div>
              <p className="text-[10px] text-muted truncate mt-1">
                {sc.meta}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
