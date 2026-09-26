"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/format";
import type { RecoveryView } from "@/lib/recoveryView";
import type { ScenarioData } from "@/lib/types";

export type AgentRole = "all" | "aircraft" | "crew" | "passenger" | "gate" | "dutymanager";

interface ArbitrationMessage {
  id: string;
  role: "aircraft" | "crew" | "passenger" | "gate" | "dutymanager";
  name: string;
  title: string;
  time: string;
  badgeColor: string;
  status: "proposed" | "contested" | "validated" | "approved" | "executed";
  content: string;
  deltaCost?: number; // negative is cost saved
  tradeoff?: string;
  metric?: string;
}

const DEFAULT_ARBITRATION_LOGS: ArbitrationMessage[] = [
  {
    id: "arb-1",
    role: "aircraft",
    name: "AeroOps-1",
    title: "Aircraft Controller",
    time: "08:14:02 CST",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    status: "proposed",
    content: "Runway capacity at ORD reduced by 60%. Tail N418UA on flight UA-422 will miss scheduled turnaround buffer. Proposing tail swap with inbound N892UA from MSP at Gate B12.",
    deltaCost: -42500,
    tradeoff: "Adds 12m ground service buffer, avoids cascading cancellation on outbound UA-784.",
    metric: "Rotation Invariant: Preserved",
  },
  {
    id: "arb-2",
    role: "gate",
    name: "GateMaster-AI",
    title: "Gate Controller",
    time: "08:14:08 CST",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    status: "contested",
    content: "Gate B12 conflict detected: N892UA turnaround overlaps with scheduled widebody arrival DL-291 at 09:15 CST. Re-routing N892UA to Concourse C Gate C08.",
    tradeoff: "Concourse transit adds 4m walk time; ramp pushback clearance verified clean.",
    metric: "0 Ramp Deadlocks",
  },
  {
    id: "arb-3",
    role: "passenger",
    name: "PaxCare-Agent",
    title: "Passenger Controller",
    time: "08:14:14 CST",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    status: "proposed",
    content: "Identified 48 high-value connecting passengers on UA-422 connecting to international transcon UA-1184 (ORD -> LHR). Requesting 15-minute gate hold on UA-1184.",
    deltaCost: -68400,
    tradeoff: "Prevents 48 transatlantic misconnections, hotel accommodation vouchers, and DOT delay compensation.",
    metric: "48 Passengers Protected",
  },
  {
    id: "arb-4",
    role: "crew",
    name: "CrewRoster-Opt",
    title: "Crew Controller",
    time: "08:14:19 CST",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    status: "validated",
    content: "FAA Part 117 Legality Alert: UA-1184 First Officer reaches hard 14-hour flight duty limit under proposed 15m hold. Holding would trigger illegal duty status. Calling ORD Standby Reserve FO Crew #4102.",
    deltaCost: -18200,
    tradeoff: "Standby reserve callout incurs $1,800 callout fee, avoiding illegal crew grounding fine of $20,000.",
    metric: "Part 117: 100% Legal",
  },
  {
    id: "arb-5",
    role: "dutymanager",
    name: "OCC Arbiter",
    title: "Duty Manager",
    time: "08:14:24 CST",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    status: "approved",
    content: "Arbitration Complete: Multi-objective objective function solved in 18.4s. Approved tail swap to Gate C08, dispatched Reserve FO #4102, authorized 15m passenger hold on UA-1184. Net recovery savings: $172,400.",
    deltaCost: -172400,
    tradeoff: "Zero cancellations, 0 crew violations, 48 protected passengers across 3 hubs.",
    metric: "Optimal Recovery Plan Executed",
  },
];

const AGENT_META = [
  { role: "aircraft", label: "Aircraft", icon: "✈️", focus: "Tail Swaps & Rotations", activeStatus: "Monitoring 2,840 Rotations" },
  { role: "crew", label: "Crew", icon: "👨‍✈️", focus: "FAA Part 117 Legalities", activeStatus: "Reserve Callout Standby" },
  { role: "passenger", label: "Passenger", icon: "👥", focus: "Connections & Rebooking", activeStatus: "48 VIP Pax Flagged" },
  { role: "gate", label: "Gate", icon: "🚪", focus: "Ramp & Concourse Buffer", activeStatus: "Gate C08 Assigned" },
  { role: "dutymanager", label: "Duty Mgr", icon: "⚖️", focus: "Cost-Benefit Arbiter", activeStatus: "+$172K Plan Executed" },
] as const;

export function AgentArbitrationFeed({
  scenario,
  recovery,
  compact = false,
}: {
  scenario?: ScenarioData;
  recovery?: RecoveryView | null;
  compact?: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<AgentRole>("all");
  const [activeStep, setActiveStep] = useState<number>(DEFAULT_ARBITRATION_LOGS.length);
  const [isSimulating, setIsSimulating] = useState(false);

  const filteredLogs = DEFAULT_ARBITRATION_LOGS.slice(0, activeStep).filter(
    (msg) => selectedRole === "all" || msg.role === selectedRole
  );

  const totalSaved = recovery?.recoverySaving?.typical ?? 172400;

  function runSimulation() {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveStep(1);
    let step = 1;
    const interval = setInterval(() => {
      step += 1;
      setActiveStep(step);
      if (step >= DEFAULT_ARBITRATION_LOGS.length) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 900);
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-3.5 space-y-3 shadow-xl">
      {/* Header with Title & Live Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              5-Agent Arbitration Engine
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {scenario?.meta.label ? `${scenario.meta.label} ` : "Real-time OCC Consensus "}
              &bull; Resolution &lt;20s
            </p>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition disabled:opacity-50 shrink-0"
        >
          {isSimulating ? "Arbitrating..." : "Re-Simulate"}
        </button>
      </div>

      {/* 5-Agent Status Cards */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {AGENT_META.map((agent) => {
          const isSelected = selectedRole === agent.role;
          return (
            <button
              key={agent.role}
              onClick={() => setSelectedRole(isSelected ? "all" : agent.role)}
              className={`p-1.5 rounded-lg border text-left transition flex flex-col justify-between ${
                isSelected
                  ? "bg-slate-800 border-gold shadow-md"
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span>{agent.icon}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="mt-1">
                <div className="text-[10px] font-semibold text-white truncate font-mono">
                  {agent.label}
                </div>
                {!compact && (
                  <div className="text-[8px] text-slate-400 truncate">
                    {agent.focus}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 border-y border-slate-800/60 text-[10px] font-mono">
        <span className="text-slate-500 uppercase tracking-widest mr-1">Filter:</span>
        <button
          onClick={() => setSelectedRole("all")}
          className={`px-2 py-0.5 rounded transition ${
            selectedRole === "all"
              ? "bg-blue-600 text-white font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All (5)
        </button>
        {AGENT_META.map((a) => (
          <button
            key={a.role}
            onClick={() => setSelectedRole(a.role)}
            className={`px-2 py-0.5 rounded transition shrink-0 ${
              selectedRole === a.role
                ? "bg-blue-600 text-white font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Arbitration Timeline Feed */}
      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {filteredLogs.map((msg) => (
          <div
            key={msg.id}
            className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
          >
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-medium ${msg.badgeColor}`}>
                  {msg.title}
                </span>
                <span className="text-slate-400 font-mono">{msg.name}</span>
              </div>
              <span className="text-slate-500 font-mono text-[9px]">{msg.time}</span>
            </div>

            <p className="text-[11px] text-slate-200 leading-relaxed">
              {msg.content}
            </p>

            {msg.tradeoff && (
              <div className="text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded border border-slate-800/60 font-mono">
                <span className="text-amber-400 font-semibold">Trade-off: </span>
                {msg.tradeoff}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[10px] font-mono">
              <span className="text-emerald-400 font-medium">
                {msg.metric}
              </span>
              {msg.deltaCost !== undefined && (
                <span className="text-gold font-bold">
                  {msg.deltaCost < 0 ? `Savings: ${formatUsd(Math.abs(msg.deltaCost))}` : `Cost: +${formatUsd(msg.deltaCost)}`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Arbiter Consensus Summary Footer */}
      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 font-bold">
              Arbitrated OCC Consensus
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Delta: <span className="text-gold font-bold">{formatUsd(totalSaved)}</span> saved vs. baseline cascade
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            Validated &bull; 0 Vetoes
          </span>
        </div>
      </div>
    </div>
  );
}
