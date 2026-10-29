"use client";

import React from "react";
import { useInspectorMode } from "@/lib/inspectorMode";
import type { ScenarioData } from "@/lib/types";

export interface PreloadedScenariosSidebarProps {
  scenario: ScenarioData;
  activeScenarioId: string;
  isCleanBoot: boolean;
  onSelectScenario: (scenarioId: string) => void;
}

export interface PreloadedScenarioConfig {
  id: string;
  title: string;
  shortLabel: string;
  tag: string;
  tagColor: string;
  desc: string;
  savings: string;
  rawCost: string;
  badge: string;
  latency: string;
  metrics: string[];
}

export const PRELOADED_SCENARIOS: PreloadedScenarioConfig[] = [
  {
    id: "ord-runway-closure",
    title: "Chicago O'Hare (ORD) Runway Closure",
    shortLabel: "ORD Runway Reduced",
    tag: "Single Hub",
    tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    desc: "Chicago O'Hare (ORD) • 60% runway capacity reduction from 08:00 to 10:00 CST",
    savings: "+$145K Recovered",
    rawCost: "$181,375 Gross",
    badge: "Benchmark",
    latency: "18.4s Deterministic",
    metrics: ["48 Pax Protected", "14 Kept Flights", "100% Tail Conservation"],
  },
  {
    id: "multi-disruption-cascade",
    title: "Multi-Hub Cascade (ORD + DEN)",
    shortLabel: "Multi-Hub Cascade",
    tag: "Cross-Hub",
    tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    desc: "Concurrent ORD + DEN runway closures compounded by United Airlines fleet hold",
    savings: "+$386.4K Recovered",
    rawCost: "$520,000 Gross",
    badge: "Compound",
    latency: "19.8s Multi-Hub",
    metrics: ["312 Pax Protected", "22 Rescued Flights", "FAR Part 117 Enforced"],
  },
  {
    id: "baseline",
    title: "Nominal Operations (Baseline)",
    shortLabel: "Nominal Baseline",
    tag: "Baseline",
    tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    desc: "Normal published schedule operations • $0 cost variance across 340 airports",
    savings: "$0 Δ (Nominal Airspace)",
    rawCost: "$0 Variance",
    badge: "Nominal Baseline",
    latency: "Steady-State",
    metrics: ["582,410 Legs", "0 Misconnections", "0 Part 117 Breaches"],
  },
];

export function PreloadedScenariosSidebar({
  scenario,
  activeScenarioId,
  isCleanBoot,
  onSelectScenario,
}: PreloadedScenariosSidebarProps) {
  const isDisrupted = !isCleanBoot && scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;
  const { enabled: inspectorMode, setEnabled: setInspectorMode } = useInspectorMode();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3.5 shadow-xl select-none text-slate-300">
      {/* =========================================================
          1. HEADER & AIRSPACE TELEMETRY STATUS
         ========================================================= */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isDisrupted ? "bg-rose-400 animate-pulse" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            }`}
          />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              Preloaded Scenarios
            </h3>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              High-Fidelity Replays &bull; Static JSON Telemetry
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 font-medium ${
            isDisrupted
              ? "bg-rose-950/60 text-rose-300 border-rose-800/60 font-semibold"
              : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60 font-semibold"
          }`}
        >
          {isDisrupted ? `${scenario.disruptionMarkers.length} Active Events` : "Airspace Nominal"}
        </span>
      </div>

      {/* =========================================================
          2. QUICK FILTER CHIPS (1-Click Switcher)
         ========================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {PRELOADED_SCENARIOS.map((sc) => {
          const isActive =
            (sc.id === "baseline" && isCleanBoot) ||
            (activeScenarioId === sc.id && !isCleanBoot);

          return (
            <button
              key={`chip-${sc.id}`}
              type="button"
              onClick={() => onSelectScenario(sc.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all whitespace-nowrap active:scale-[0.98] ${
                isActive
                  ? "bg-blue-600 text-white font-bold shadow-md border border-blue-400/50"
                  : "bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {sc.shortLabel}
            </button>
          );
        })}
      </div>

      {/* =========================================================
          3. VERTICALLY SCROLLABLE LIST OF SCENARIO CARDS
         ========================================================= */}
      <div className="flex flex-col gap-2.5 max-h-[calc(100vh-290px)] overflow-y-auto pr-1">
        {PRELOADED_SCENARIOS.map((sc) => {
          const isActive =
            (sc.id === "baseline" && isCleanBoot) ||
            (activeScenarioId === sc.id && !isCleanBoot);

          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => onSelectScenario(sc.id)}
              className={`p-3 rounded-lg border text-left transition-all duration-150 relative flex flex-col gap-2 cursor-pointer group ${
                isActive
                  ? "bg-slate-800/95 border-blue-500 shadow-xl ring-1 ring-blue-500/50"
                  : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                      isActive
                        ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]"
                        : "bg-slate-600 group-hover:bg-slate-400"
                    }`}
                  />
                  <h4 className="text-xs font-bold text-white font-mono tracking-tight leading-snug">
                    {sc.title}
                  </h4>
                </div>

                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 font-medium ${sc.tagColor}`}
                >
                  {sc.badge}
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-300 leading-snug font-sans">
                {sc.desc}
              </p>

              {/* Metrics Pill Grid */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-slate-400">
                {sc.metrics.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-300"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Financial Savings & Active State Footer */}
              <div className="text-[10px] font-mono pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={isActive ? "text-amber-400 font-bold" : "text-slate-300 font-semibold"}>
                    {sc.savings}
                  </span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="text-slate-500">{sc.latency}</span>
                </div>

                {isActive ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60 shadow-sm">
                    Active Loaded
                  </span>
                ) : (
                  <span className="text-slate-500 text-[10px] group-hover:text-slate-300 transition-colors">
                    Click to load &rarr;
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          4. DOCKED DEV MODE INSPECTOR CARD
         ========================================================= */}
      <div className="pt-2 border-t border-slate-800">
        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  inspectorMode ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "bg-slate-600"
                }`}
              />
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                Dev Mode Inspector
              </span>
              {inspectorMode && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ON
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
              Exposes unthrottled airport rosters &amp; raw GPS telemetry.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={inspectorMode}
            onClick={() => setInspectorMode(!inspectorMode)}
            data-testid="inspector-mode-toggle"
            aria-label="Toggle Developer Inspector Mode"
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              inspectorMode ? "bg-amber-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                inspectorMode ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreloadedScenariosSidebar;
