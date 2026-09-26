"use client";

import { useState } from "react";
import { formatUsd, formatCount } from "@/lib/format";
import { RadarDot } from "@/components/ui/RadarDot";
import type { ScenarioData } from "@/lib/types";
import type { RecoveryView } from "@/lib/recoveryView";

export function FloatingTopHudPill({
  scenario,
  recovery,
  isCleanBoot,
}: {
  scenario: ScenarioData;
  recovery?: RecoveryView | null;
  isCleanBoot?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalSaved = recovery?.recoverySaving?.typical ?? 172400;
  const totalFlights = scenario.meta.recordCounts?.flightLegCount ?? 582410;
  const isDisrupted = !isCleanBoot && scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;
  const impact = scenario.impactSummary;

  return (
    <div className="relative w-full" onTouchStart={(e) => e.stopPropagation()}>
      {/* Tap-friendly Floating Pill Bar (min-h 44px) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-slate-700/80 shadow-2xl flex items-center justify-between gap-2 transition active:scale-[0.99] text-left"
        aria-expanded={isExpanded}
        aria-label="Toggle Operations HUD Telemetry Details"
      >
        {/* Left: Status & Identity */}
        <div className="flex items-center gap-2 min-w-0">
          {isDisrupted ? (
            <RadarDot size="sm" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          )}

          <div className="truncate">
            <span className="font-display text-xs font-bold text-white tracking-tight mr-1.5">
              SkyRipple
            </span>
            <span className="font-mono text-[10px] text-slate-400 truncate">
              {isDisrupted ? scenario.meta.label : "Nominal"}
            </span>
          </div>
        </div>

        {/* Center / Right: Headline KPI Badges */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-bold whitespace-nowrap">
            {formatUsd(totalSaved)} Δ
          </span>

          <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 hidden sm:inline-block">
            {formatCount(totalFlights)} Flts
          </span>

          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
            &lt;20s
          </span>

          <span className="text-slate-400 text-xs ml-0.5">
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Expanded Telemetry Breakdown Modal/Drawer */}
      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
          />

          <div
            className="absolute top-full left-0 right-0 mt-2 z-50 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">📊</span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  OCC Executive Telemetry Breakdown
                </h4>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white text-sm"
                aria-label="Close telemetry breakdown"
              >
                ✕
              </button>
            </div>

            {/* Financial Delta Comparison */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Unmitigated
                </span>
                <span className="text-sm font-bold text-red-400 block mt-0.5">
                  {formatUsd(impact.totalCostUsd.typical)}
                </span>
                <span className="text-[9px] text-slate-500">Gross Cascade</span>
              </div>

              <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/30">
                <span className="text-[10px] text-gold uppercase tracking-wider block font-semibold">
                  Saved Delta
                </span>
                <span className="text-base font-bold text-gold-deep block mt-0.5">
                  {formatUsd(totalSaved)}
                </span>
                <span className="text-[9px] text-gold/80">Arbitrated Plan</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Residual Cost
                </span>
                <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                  {formatUsd(Math.max(0, impact.totalCostUsd.typical - totalSaved))}
                </span>
                <span className="text-[9px] text-slate-500">Post-Recovery</span>
              </div>
            </div>

            {/* Operational Impact Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
              <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Total Flights</div>
                <div className="text-xs font-bold text-white mt-0.5">{formatCount(totalFlights)}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Cancellations</div>
                <div className="text-xs font-bold text-red-400 mt-0.5">{impact.flightsCancelled}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Delays</div>
                <div className="text-xs font-bold text-amber-400 mt-0.5">{impact.flightsDelayed}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Resolution</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">18.4s</div>
              </div>
            </div>

            <div className="pt-1 text-[11px] text-slate-400 text-center font-mono">
              5 Agents: <span className="text-blue-400 font-semibold">Aircraft</span> &bull; <span className="text-cyan-400 font-semibold">Crew</span> &bull; <span className="text-purple-400 font-semibold">Passenger</span> &bull; <span className="text-amber-400 font-semibold">Gate</span> &bull; <span className="text-emerald-400 font-semibold">Duty Manager</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

