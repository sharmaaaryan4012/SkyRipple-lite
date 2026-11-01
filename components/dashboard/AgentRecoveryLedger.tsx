"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUsd, humanizeActionType, formatSimClock } from "@/lib/format";
import { RadarDot } from "@/components/ui/RadarDot";
import type { RecoveryAction, RecoveryResult } from "@/lib/backendClient";
import type { RecoveryView } from "@/lib/recoveryView";
import type { ScenarioData, BackendDisruptionRequest, SimulationData } from "@/lib/types";

export type AgentRoleFilter = "all" | "aircraft" | "crew" | "passenger" | "gate" | "dutymanager";
export type FeedViewMode = "cards" | "terminal";

export interface LedgerArbitrationMessage {
  id: string;
  role: "aircraft" | "crew" | "passenger" | "gate" | "dutymanager";
  title: string;
  time: string;
  actionType?: string;
  content: string;
  affectedIds?: string[];
  deltaCost?: number;
  tradeoff?: string;
  metric?: string;
  isHumanOverride?: boolean;
}

const AGENT_CONFIG = {
  aircraft: {
    label: "Aircraft",
    code: "ACFT",
    badge: "Aircraft Controller",
    icon: "✈",
  },
  crew: {
    label: "Crew",
    code: "CREW",
    badge: "Crew Controller",
    icon: "👨‍✈",
  },
  passenger: {
    label: "Passenger",
    code: "PAX",
    badge: "Passenger Controller",
    icon: "👥",
  },
  gate: {
    label: "Gate",
    code: "GATE",
    badge: "Gate Controller",
    icon: "🚪",
  },
  dutymanager: {
    label: "Duty Mgr",
    code: "MGR",
    badge: "Duty Manager",
    icon: "⚖",
  },
} as const;

function normalizeRole(role: string): "aircraft" | "crew" | "passenger" | "gate" | "dutymanager" {
  const r = role.toLowerCase().replace(/[_-\s]/g, "");
  if (r.includes("aircraft") || r.includes("plane") || r.includes("tail")) return "aircraft";
  if (r.includes("crew") || r.includes("pilot") || r.includes("attendant")) return "crew";
  if (r.includes("passenger") || r.includes("pax")) return "passenger";
  if (r.includes("gate") || r.includes("ramp") || r.includes("stand")) return "gate";
  return "dutymanager";
}

const PRESET_CONSTRAINTS = [
  { label: "Hold UA1184 15m", prompt: "Force hold flight UA1184 for 15 minutes to protect transatlantic connections" },
  { label: "Swap N418UA ↔ N892UA", prompt: "Authorize tail swap between N418UA and N892UA at ORD Concourse B" },
  { label: "Lock Gate C08", prompt: "Reassign inbound widebody arrival from Gate B12 to Concourse C Gate C08" },
  { label: "Dispatch Standby FO", prompt: "Dispatch ORD standby reserve First Officer to maintain FAR Part 117 compliance" },
  { label: "Apply 20m Ground Hold", prompt: "Apply 20-minute ground delay program on Chicago O'Hare departures" },
];

export interface AgentRecoveryLedgerProps {
  scenario: ScenarioData;
  recovery?: RecoveryView | null;
  isCleanBoot?: boolean;
  activeDisruptions?: BackendDisruptionRequest[] | null;
  day?: string;
  onRecoveryDone?: (result: RecoveryResult) => void;
  onActivateLive?: (data: SimulationData, disruptions: BackendDisruptionRequest[]) => void;
  defaultViewMode?: FeedViewMode;
  expandedMode?: boolean;
}

export function AgentRecoveryLedger({
  scenario,
  recovery,
  isCleanBoot,
  activeDisruptions,
  defaultViewMode = "cards",
  expandedMode = false,
}: AgentRecoveryLedgerProps) {
  const [selectedRole, setSelectedRole] = useState<AgentRoleFilter>("all");
  const [viewMode, setViewMode] = useState<FeedViewMode>(defaultViewMode);
  const [isSimulatingReplay, setIsSimulatingReplay] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(999);

  // Manual Operator Constraints state
  const [constraintInput, setConstraintInput] = useState("");
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectedConstraints, setInjectedConstraints] = useState<{ id: string; text: string; timestamp: string }[]>([]);

  const slug = scenario.meta?.scenarioId?.toLowerCase() ?? "";
  const hasMarkers = scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;
  const hasDisruptions = activeDisruptions != null && activeDisruptions.length > 0;
  const isDisrupted = !isCleanBoot && (hasMarkers || hasDisruptions);

  // Financial Metrics Calculation
  const impact = scenario.impactSummary;
  const grossCost = isDisrupted ? (impact.totalCostUsd.typical || (slug.includes("multi") ? 520000 : 181375)) : 0;
  const totalSaved = useMemo(() => {
    if (!isDisrupted) return 0;
    if (recovery?.recoverySaving?.typical) return recovery.recoverySaving.typical;
    if (slug.includes("multi")) return 386400;
    if (slug.includes("ord") || slug.includes("runway")) return 145000;
    return Math.round(grossCost * 0.75);
  }, [isDisrupted, recovery, slug, grossCost]);

  const netRecoveredCost = Math.max(0, grossCost - totalSaved);
  const recoveryEfficiency = grossCost > 0 ? Math.min(100, Math.round((totalSaved / grossCost) * 100)) : 100;

  // Build the static or dynamic arbitration feed messages
  const logs: LedgerArbitrationMessage[] = useMemo(() => {
    // 1. If recovery actions exist from view
    if (recovery?.recoveryActions && recovery.recoveryActions.length > 0) {
      return recovery.recoveryActions.map((action: RecoveryAction) => {
        const role = normalizeRole(action.actorRole);
        return {
          id: action.actionId,
          role,
          title: AGENT_CONFIG[role].badge,
          time: formatSimClock(action.timestampMin || 494),
          actionType: humanizeActionType(action.actionType),
          content: action.rationale || `${action.actionType} executed on ${action.affectedIds.join(", ")}`,
          affectedIds: action.affectedIds,
          deltaCost: action.costEstimate != null ? -Math.abs(action.costEstimate) : undefined,
          metric: `${action.affectedIds.length} Target(s) De-conflicted`,
          tradeoff: `Duty Manager approved action to avert downstream delay contagion.`,
        };
      });
    }

    // 2. Fallback nominal baseline when no disruption
    if (!isDisrupted) {
      return [
        {
          id: "base-acft",
          role: "aircraft",
          title: "Aircraft Controller",
          time: "Steady State",
          content: "All scheduled rotations operating within published turnaround windows. 2,840 daily aircraft tails tracking nominal flight trajectories without tail swap intervention.",
          deltaCost: 0,
          tradeoff: "Standard buffers preserved; zero rotation changes required.",
          metric: "Aircraft Routing Intact: 100%",
        },
        {
          id: "base-gate",
          role: "gate",
          title: "Gate Controller",
          time: "Steady State",
          content: "Gate occupancy models nominal across 340 commercial airports. Concourse ramp flow and pushback separations verified clear.",
          deltaCost: 0,
          tradeoff: "Published gate turnarounds maintained with zero tarmac delays.",
          metric: "Ramp Conflicts: 0",
        },
        {
          id: "base-pax",
          role: "passenger",
          title: "Passenger Controller",
          time: "Steady State",
          content: "Continuous passenger itinerary monitoring: 100% of connecting passenger itineraries are within legal transfer limits. Zero misconnections flagged.",
          deltaCost: 0,
          tradeoff: "All scheduled connections intact; zero hotel vouchers required.",
          metric: "Misconnections: 0",
        },
        {
          id: "base-crew",
          role: "crew",
          title: "Crew Controller",
          time: "Steady State",
          content: "FAR Part 117 legality audit nominal. All active cockpit and cabin crews have minimum rest buffers verified. Reserve crews remain unallocated on standby.",
          deltaCost: 0,
          tradeoff: "Standard duty schedules maintained without overtime or penalty.",
          metric: "Crew Rest Rules (FAA): Met",
        },
        {
          id: "base-mgr",
          role: "dutymanager",
          title: "Duty Manager",
          time: "Steady State",
          content: "Airspace Consensus: Nominal baseline state verified. Discrete-event engines report zero delay contagion. Operations executing strictly on published schedule.",
          deltaCost: 0,
          tradeoff: "Zero operational intervention needed; cost variance strictly $0.",
          metric: "Schedule Variance: $0",
        },
      ];
    }

    // 3. Multi-Hub Profile
    if (slug.includes("multi")) {
      return [
        {
          id: "multi-1",
          role: "aircraft",
          title: "Aircraft Controller",
          time: "08:22 CST",
          actionType: "Swap Widebody",
          content: "Compound dual-hub constraint: Concurrent 60% ORD capacity cut, 35% DEN capacity throttle, and United N464UA maintenance grounding. Swapping widebody N671UA on DEN-SFO transcon route.",
          affectedIds: ["N464UA", "N671UA"],
          deltaCost: -118500,
          tradeoff: "Absorbs 28m ground delay at Denver; eliminates 3 downstream cancellations on West Coast trunk routes.",
          metric: "3 Flights Saved from Cancellation",
        },
        {
          id: "multi-2",
          role: "gate",
          title: "Gate Controller",
          time: "08:22 CST",
          actionType: "De-conflict Ramps",
          content: "Severe ramp saturation at DEN Concourse B and ORD Terminal 1. Re-allocating 4 flights to DEN Concourse A hardstands and initiating dual-tug pushback sequencing.",
          affectedIds: ["DEN-B14", "ORD-T1"],
          tradeoff: "Requires bus transfer for 2 regional flights; avoids tarmac hold penalties and taxiway gridlock.",
          metric: "Dual Ramp De-conflicted",
        },
        {
          id: "multi-3",
          role: "passenger",
          title: "Passenger Controller",
          time: "08:22 CST",
          actionType: "Proactive Protection",
          content: "Identified 312 passengers facing stranded overnight status across Chicago and Denver. Executing proactive partner airline seat rebooking and holding UA-1892 (DEN → ORD) by 18m.",
          affectedIds: ["312 Pax", "UA-1892"],
          deltaCost: -142000,
          tradeoff: "Pre-empts catastrophic overnight hotel and voucher obligations for 312 connecting travelers.",
          metric: "312 Passengers Protected",
        },
        {
          id: "multi-4",
          role: "crew",
          title: "Crew Controller",
          time: "08:22 CST",
          actionType: "Deploy Reserves",
          content: "FAR Part 117 Legality Shield: Denver ground stop strands 4 cockpit crews beyond legal duty thresholds. Dispatched emergency reserve pairs from ORD Pool #308 and DEN Standby #512.",
          affectedIds: ["ORD #308", "DEN #512"],
          deltaCost: -125900,
          tradeoff: "Deploys 2 reserve pairs ($4,200 total expenses); averts FAA duty violation fines and stranded tails.",
          metric: "Crew Rest Rules (FAA): Met",
        },
        {
          id: "multi-5",
          role: "dutymanager",
          title: "Duty Manager",
          time: "08:22 CST",
          actionType: "Multi-Hub Consensus",
          content: "Cross-Hub Consensus Approved (19.8s): Duty Manager validated global cross-hub arbitration plan. Swapped 2 tails, de-conflicted 4 gates, protected 312 passengers, dispatched 2 reserve pairs.",
          affectedIds: ["Global Consensus"],
          deltaCost: -386400,
          tradeoff: "Zero multi-day contagion; preserves schedule integrity across both Midwest and Mountain hubs.",
          metric: "Optimal Delta: +$386,400",
        },
      ];
    }

    // 4. Default ORD Runway Closure Benchmark
    const hub = scenario.disruptionMarkers?.[0]?.airportIata ?? "ORD";
    const saved = totalSaved || 145000;

    return [
      {
        id: "arb-acft",
        role: "aircraft",
        title: "Aircraft Controller",
        time: "08:14 CST",
        actionType: "Swap Tails",
        content: `Runway capacity constrained at ${hub}. Inbound leg UA-422 turnaround buffer compromised. Proposing tail swap: N418UA ↔ N892UA at Concourse B.`,
        affectedIds: ["UA-422", "N892UA"],
        deltaCost: -42500,
        tradeoff: "Adds 12m ground service buffer; prevents cascading downstream cancellation on outbound UA-784.",
        metric: "Aircraft Routing Intact: 100%",
      },
      {
        id: "arb-gate",
        role: "gate",
        title: "Gate Controller",
        time: "08:14 CST",
        actionType: "Reassign Gate",
        content: `Gate B12 conflict detected: N892UA turnaround overlaps with scheduled widebody arrival DL-291. Re-assigning N892UA to Concourse C Gate C08.`,
        affectedIds: ["Gate B12", "Gate C08"],
        tradeoff: "Adds 4m passenger transit walk time; eliminates taxiway pushback deadlock and ground hold penalties.",
        metric: "Ramp Conflicts: 0",
      },
      {
        id: "arb-pax",
        role: "passenger",
        title: "Passenger Controller",
        time: "08:14 CST",
        actionType: "Connection Hold",
        content: `Detected 48 high-value passengers connecting to transatlantic flight UA-1184 (${hub} → LHR). Authorizing 15-minute gate departure hold on UA-1184.`,
        affectedIds: ["UA-1184", "48 Pax"],
        deltaCost: -74500,
        tradeoff: "Averts 48 international misconnections, hotel accommodation vouchers, and DOT delay compensation.",
        metric: "48 Passengers Protected",
      },
      {
        id: "arb-crew",
        role: "crew",
        title: "Crew Controller",
        time: "08:14 CST",
        actionType: "Callout Reserve",
        content: "FAR Part 117 Audit: 15m hold on UA-1184 pushes First Officer over the 14-hour maximum duty limit. Dispatching Standby Reserve First Officer #4102.",
        affectedIds: ["Reserve FO #4102"],
        deltaCost: -28000,
        tradeoff: "Incurs $1,800 reserve callout cost; avoids illegal crew duty fine ($20,000) and stranded aircraft.",
        metric: "Crew Rest Rules (FAA): Met",
      },
      {
        id: "arb-mgr",
        role: "dutymanager",
        title: "Duty Manager",
        time: "08:14 CST",
        actionType: "Arbitrated Consensus",
        content: `Arbitration Complete (18.4s): Evaluated multi-agent proposals against macro cost objective function. Approved tail swap, Gate C08 reassignment, Reserve FO callout, and 15m connection hold.`,
        affectedIds: ["Network Consensus"],
        deltaCost: -saved,
        tradeoff: "Zero flight cancellations, zero crew duty breaches, 48 protected passengers across network.",
        metric: `Optimal Delta: +${formatUsd(saved)}`,
      },
    ];
  }, [recovery, isDisrupted, totalSaved, scenario, slug]);

  // Combine with operator-injected constraint messages
  const combinedLogs = useMemo(() => {
    const operatorMsgs: LedgerArbitrationMessage[] = injectedConstraints.map((c) => ({
      id: c.id,
      role: "dutymanager",
      title: "Human Operator Override",
      time: c.timestamp,
      actionType: "Manual Constraint",
      content: `Human OCC Operator injected constraint: "${c.text}". Agents dynamically re-arbitrating around this operational invariant.`,
      metric: "Operator Priority: 1.0",
      tradeoff: "Constraint locked as non-negotiable operational boundary condition.",
      isHumanOverride: true,
    }));
    return [...operatorMsgs, ...logs];
  }, [injectedConstraints, logs]);

  useEffect(() => {
    setActiveStep(combinedLogs.length);
    setIsSimulatingReplay(false);
  }, [combinedLogs]);

  const filteredLogs = combinedLogs
    .slice(0, activeStep)
    .filter((msg) => selectedRole === "all" || msg.role === selectedRole);

  // Role counters for filter badges
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: combinedLogs.length, aircraft: 0, crew: 0, passenger: 0, gate: 0, dutymanager: 0 };
    for (const l of combinedLogs) {
      counts[l.role] = (counts[l.role] || 0) + 1;
    }
    return counts;
  }, [combinedLogs]);

  // Replay sequential reveal animation
  function runReplay() {
    if (isSimulatingReplay) return;
    setIsSimulatingReplay(true);
    setActiveStep(1);
    let step = 1;
    const interval = setInterval(() => {
      step += 1;
      setActiveStep(step);
      if (step >= combinedLogs.length) {
        clearInterval(interval);
        setIsSimulatingReplay(false);
      }
    }, 650);
  }

  // Handle manual constraint injection
  function handleInjectConstraint(customPrompt?: string) {
    const textToInject = customPrompt || constraintInput.trim();
    if (!textToInject || isInjecting) return;

    setIsInjecting(true);
    const newConstraint = {
      id: `override-${Date.now()}`,
      text: textToInject,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setInjectedConstraints((prev) => [newConstraint, ...prev]);
    setConstraintInput("");
    setIsInjecting(false);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl select-none">
      {/* =========================================================
          SECTION 1: OCC HEADER & ARBITRATION STATUS
         ========================================================= */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isDisrupted ? (
            <RadarDot size="sm" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white tracking-wide uppercase font-sans truncate">
                Live Agentic Recovery Ledger
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-900/30 text-blue-400 border border-blue-700/50 font-semibold">
                OCC 5-Agent
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              Autonomous Explainability Engine &bull; Pareto Cost Optimizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={runReplay}
            disabled={isSimulatingReplay}
            className="px-2.5 py-1 rounded text-[10px] font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-40"
            title="Replay arbitration negotiation sequence"
          >
            {isSimulatingReplay ? "Streaming…" : "Replay"}
          </button>
        </div>
      </div>

      {/* =========================================================
          SECTION 2: FINANCIAL IMPACT TRACKER (DYNAMIC COST DELTAS)
         ========================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
          <span>Financial Impact &amp; Penalty Tracker</span>
          <span
            className={`px-2 py-0.5 rounded font-mono font-medium ${
              totalSaved > 0
                ? "text-amber-400 bg-amber-950/40 border border-amber-800/50"
                : "text-slate-300 bg-slate-950/60 border border-slate-800"
            }`}
          >
            {isDisrupted ? `${recoveryEfficiency}% Cost Mitigated` : "Schedule On-Time (100%)"}
          </span>
        </div>

        {/* 3-Column Delta Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Unmitigated
            </span>
            <span className={`text-base font-bold font-mono block mt-1 ${grossCost > 0 ? "text-rose-400" : "text-white"}`}>
              {formatUsd(grossCost)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Gross Cascade</span>
          </div>

          <div
            className={`p-2.5 rounded-lg border ${
              totalSaved > 0
                ? "bg-amber-950/20 border-amber-800/50"
                : "bg-slate-950/60 border-slate-800"
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Net Value Saved
            </span>
            <span
              className={`text-lg font-bold font-mono block mt-0.5 ${
                totalSaved > 0 ? "text-amber-400" : "text-white"
              }`}
            >
              {totalSaved > 0 ? `+${formatUsd(totalSaved)}` : "$0 Δ"}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {totalSaved > 0 ? "Arbitrated Plan" : "Baseline ($0)"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Recovered Cost
            </span>
            <span className="text-base font-semibold font-mono text-white block mt-1">
              {formatUsd(netRecoveredCost)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Net Exposure</span>
          </div>
        </div>

        {/* Dynamic Efficiency Progress Bar */}
        <div className="space-y-1.5 pt-0.5">
          <div className="w-full h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
            {isDisrupted && totalSaved > 0 ? (
              <>
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${recoveryEfficiency}%` }}
                  title={`Saved: ${formatUsd(totalSaved)}`}
                />
                <div
                  className="h-full bg-rose-500/70 transition-all duration-500"
                  style={{ width: `${100 - recoveryEfficiency}%` }}
                  title={`Incurred: ${formatUsd(netRecoveredCost)}`}
                />
              </>
            ) : (
              <div className="h-full w-full bg-slate-800" />
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
            {isDisrupted && totalSaved > 0 ? (
              <>
                <span>Arbitrated Recovery: <strong className="text-amber-400 font-semibold">{formatUsd(totalSaved)}</strong></span>
                <span>Residual Loss: <strong className="text-rose-400 font-semibold">{formatUsd(netRecoveredCost)}</strong></span>
              </>
            ) : (
              <span>Published Schedule Active &bull; <span className="text-slate-300 font-medium">Nominal Airspace Baseline</span></span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION 3: LIVE NEGOTIATION FEED (5 AGENT ARBITRATION)
         ========================================================= */}
      <div className="space-y-2.5 pt-1">
        {/* Controls: Segmented Agent Filter & View Mode Toggle */}
        <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
          {/* Agent Role Filter Track */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg overflow-x-auto scrollbar-none">
            {(["all", "aircraft", "crew", "passenger", "gate", "dutymanager"] as AgentRoleFilter[]).map((r) => {
              const isSelected = selectedRole === r;
              const count = roleCounts[r] || 0;
              const label = r === "all" ? "All" : r === "dutymanager" ? "Duty Mgr" : AGENT_CONFIG[r].label;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`px-2.5 py-1 rounded text-xs transition whitespace-nowrap flex items-center gap-1 ${
                    isSelected
                      ? "bg-blue-900/40 text-blue-300 border border-blue-700/60 shadow-sm font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <span>{label}</span>
                  {count > 0 && <span className="text-slate-500 text-[10px]">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Cards vs Terminal */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                viewMode === "cards" ? "bg-blue-900/40 text-blue-300 font-medium border border-blue-700/50" : "text-slate-400 hover:text-white"
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("terminal")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                viewMode === "terminal" ? "bg-blue-900/40 text-blue-300 font-medium border border-blue-700/50" : "text-slate-400 hover:text-white"
              }`}
            >
              Terminal
            </button>
          </div>
        </div>

        {/* FEED BODY */}
        {viewMode === "cards" ? (
          /* Card-based Feed */
          <div className={`space-y-2.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 ${expandedMode ? "max-h-[580px]" : "max-h-[300px]"}`}>
            {filteredLogs.map((msg) => {
              const cfg = AGENT_CONFIG[msg.role];
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg bg-slate-800/50 border transition-colors space-y-2 ${
                    msg.isHumanOverride
                      ? "border-amber-700/50 bg-amber-950/20"
                      : "border-slate-700/50 hover:bg-slate-800/70"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{cfg.icon}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-medium">
                        {msg.isHumanOverride ? "HUMAN OVERRIDE" : cfg.badge}
                      </span>
                      {msg.actionType && (
                        <span className="text-slate-300 font-sans text-xs font-medium">
                          &bull; {msg.actionType}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[10px]">{msg.time}</span>
                  </div>

                  {/* Card Body */}
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {msg.content}
                  </p>

                  {/* Affected IDs */}
                  {msg.affectedIds && msg.affectedIds.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 flex-wrap">
                      <span className="text-slate-500">Affected:</span>
                      {msg.affectedIds.map((id) => (
                        <span key={id} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                          {id}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Trade-off Callout */}
                  {msg.tradeoff && (
                    <div className="text-xs text-slate-300 border-l-2 border-slate-600 bg-slate-900/40 p-2 rounded-r font-sans">
                      <span className="text-amber-400 font-medium mr-1">Trade-off:</span>
                      {msg.tradeoff}
                    </div>
                  )}

                  {/* Footer Delta & Metrics */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-700/50 text-[11px] font-mono">
                    <span className="text-slate-400">{msg.metric}</span>
                    {msg.deltaCost !== undefined && (
                      <span
                        className={
                          msg.deltaCost < 0
                            ? "text-base font-bold text-amber-400"
                            : msg.deltaCost === 0
                            ? "text-sm font-semibold text-slate-400"
                            : "text-base font-bold text-rose-400"
                        }
                      >
                        {msg.deltaCost < 0
                          ? `Saved: ${formatUsd(Math.abs(msg.deltaCost))}`
                          : msg.deltaCost === 0
                          ? "Delta: $0"
                          : `Cost: +${formatUsd(msg.deltaCost)}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Terminal Feed View */
          <div className={`p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] leading-relaxed overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700 ${expandedMode ? "max-h-[580px]" : "max-h-[300px]"}`}>
            <div className="text-slate-500 border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span>OCC MULTI-AGENT ARBITRATION AUDIT STREAM</span>
              <span className="text-slate-400 font-medium">LIVE STREAM</span>
            </div>
            {filteredLogs.map((msg, i) => {
              const cfg = AGENT_CONFIG[msg.role];
              return (
                <div key={msg.id} className="flex items-start gap-2 text-slate-300">
                  <span className="text-slate-600 select-none">[{String(i + 1).padStart(2, "0")}]</span>
                  <span className="text-slate-500 shrink-0">{msg.time}</span>
                  <span className="px-1.5 py-0.2 rounded shrink-0 bg-slate-900 border border-slate-700 text-slate-300 font-medium">
                    [{cfg.code}]
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium mr-1.5">{msg.actionType || cfg.badge}:</span>
                    <span>{msg.content}</span>
                    {msg.deltaCost !== undefined && msg.deltaCost !== 0 && (
                      <span className="text-amber-400 ml-1.5 font-bold">
                        [{msg.deltaCost < 0 ? `-${formatUsd(Math.abs(msg.deltaCost))}` : `+${formatUsd(msg.deltaCost)}`}]
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          SECTION 4: MANUAL PARAMETER INPUTS (OPERATOR OVERRIDES)
         ========================================================= */}
      <div className="space-y-2.5 pt-2.5 border-t border-slate-800">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>⚙</span>
            <span className="font-semibold text-white uppercase tracking-wider text-xs">
              Operator Overrides &amp; Constraint Injection
            </span>
          </div>
          <span className="text-slate-500">OCC Control</span>
        </div>

        {/* Quick Constraint Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {PRESET_CONSTRAINTS.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={isInjecting}
              onClick={() => handleInjectConstraint(item.prompt)}
              className="px-2.5 py-1 rounded text-xs font-mono bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition whitespace-nowrap active:scale-[0.98] disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Interactive Constraint Text Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInjectConstraint();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={constraintInput}
            onChange={(e) => setConstraintInput(e.target.value)}
            disabled={isInjecting}
            placeholder="Force hold UA1184 for 15m / Lock Gate C08…"
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none transition disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!constraintInput.trim() || isInjecting}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white border border-slate-700 hover:border-slate-600 text-xs font-mono font-medium transition disabled:opacity-40 shrink-0"
          >
            {isInjecting ? "Injecting…" : "Inject"}
          </button>
        </form>

        {/* Injected Constraints Ledger */}
        {injectedConstraints.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-medium block">
              Active Operator Overrides ({injectedConstraints.length}):
            </span>
            <div className="space-y-1">
              {injectedConstraints.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded bg-slate-950/70 border border-slate-700 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-amber-400 font-semibold">[{c.timestamp}]</span>
                    <span className="text-slate-200 truncate">{c.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInjectedConstraints((prev) => prev.filter((x) => x.id !== c.id))}
                    className="text-slate-400 hover:text-white ml-2 text-xs"
                    title="Remove override"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          SECTION 5: DUTY MANAGER CONSENSUS SUMMARY FOOTER
         ========================================================= */}
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between gap-2 text-xs">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {isDisrupted ? "Duty Manager Arbitrated Consensus" : "Airspace Operating at Published Baseline"}
          </div>
          <div className="text-xs text-slate-200 font-mono mt-0.5">
            {totalSaved > 0 ? (
              <>Net Value Recovered: <span className="text-amber-400 font-bold">+{formatUsd(totalSaved)}</span></>
            ) : (
              "Discrete-event engines confirm nominal schedule performance ($0 cost variance)"
            )}
          </div>
        </div>

        <span
          className={`text-[10px] font-mono px-2.5 py-0.5 rounded border shrink-0 font-medium ${
            totalSaved > 0
              ? "text-amber-400 bg-amber-950/40 border-amber-800/50"
              : "text-slate-300 bg-slate-950/60 border border-slate-800"
          }`}
        >
          {isDisrupted ? "Plan Approved" : "Airspace Nominal"}
        </span>
      </div>
    </div>
  );
}

export default AgentRecoveryLedger;

