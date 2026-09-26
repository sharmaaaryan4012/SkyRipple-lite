"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import type { RecoveryView } from "@/lib/recoveryView";
import type { ScenarioData } from "@/lib/types";

export type AgentRole = "all" | "aircraft" | "crew" | "passenger" | "gate" | "dutymanager";

export interface ArbitrationMessage {
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

interface ScenarioArbitrationProfile {
  title: string;
  subtitle: string;
  totalSaved: number;
  consensusLabel: string;
  consensusDetail: string;
  statusBadge: string;
  agentStatus: Record<string, string>;
  logs: ArbitrationMessage[];
}

const ORD_PROFILE: ScenarioArbitrationProfile = {
  title: "5-Agent Arbitration Engine",
  subtitle: "Chicago O'Hare (ORD) Runway Closure • Resolution <20s",
  totalSaved: 172400,
  consensusLabel: "Arbitrated OCC Consensus",
  consensusDetail: "Delta: $172,400 saved vs. ORD baseline cascade",
  statusBadge: "Validated • 0 Vetoes",
  agentStatus: {
    aircraft: "Swapped N418UA <-> N892UA",
    crew: "Called Standby FO #4102",
    passenger: "48 Transcon Pax Protected",
    gate: "Reassigned Gate C08",
    dutymanager: "+$172.4K Plan Executed",
  },
  logs: [
    {
      id: "ord-1",
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
      id: "ord-2",
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
      id: "ord-3",
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
      id: "ord-4",
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
      id: "ord-5",
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
  ],
};

const MULTI_HUB_PROFILE: ScenarioArbitrationProfile = {
  title: "5-Agent Arbitration Engine",
  subtitle: "Multi-Hub Cascade (ORD + DEN + UA Fleet) • Resolution <20s",
  totalSaved: 386400,
  consensusLabel: "Multi-Hub Coordinated Consensus",
  consensusDetail: "Delta: $386,400 saved across Chicago & Denver hubs",
  statusBadge: "3 Incidents Arbitrated",
  agentStatus: {
    aircraft: "Swapped DEN-SFO Widebody",
    crew: "Dispatched ORD #308 & DEN #512",
    passenger: "312 Connecting Pax Protected",
    gate: "Activated Remote Hardstands",
    dutymanager: "+$386.4K Plan Executed",
  },
  logs: [
    {
      id: "multi-1",
      role: "aircraft",
      name: "AeroOps-1",
      title: "Aircraft Controller",
      time: "08:22:15 CST",
      badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      status: "proposed",
      content: "Compound dual-hub closure detected: Concurrent 60% runway reduction at ORD and 35% capacity throttle at DEN, compounded by United N464UA maintenance grounding. Swapping widebody N671UA on DEN-SFO transcon to prevent outbound cancellation chain.",
      deltaCost: -118500,
      tradeoff: "Absorbs 28m ground delay at DEN; prevents cancellation of 3 downstream legs on West Coast trunk routes.",
      metric: "3 Trunk Legs Rescued",
    },
    {
      id: "multi-2",
      role: "gate",
      name: "GateMaster-AI",
      title: "Gate Controller",
      time: "08:22:21 CST",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      status: "contested",
      content: "Severe ramp saturation at DEN Concourse B (12 aircraft holding) and ORD Terminal 1. Re-allocating 4 widebody flights to DEN Concourse A hardstands and activating dual-tug pushback procedures.",
      tradeoff: "Requires passenger bus transfer for 2 regional flights; eliminates 45m taxiway gridlock and tarmac delay penalties.",
      metric: "Dual-Hub Ramp De-conflicted",
    },
    {
      id: "multi-3",
      role: "passenger",
      name: "PaxCare-Agent",
      title: "Passenger Controller",
      time: "08:22:28 CST",
      badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      status: "proposed",
      content: "Contagion risk: 312 connecting passengers facing stranded overnight status between Chicago and Denver. Executing automated dynamic protection: reserving seat inventory on partner airlines and holding UA-1892 (DEN->ORD) by 18m.",
      deltaCost: -142000,
      tradeoff: "Prevents hotel accommodation vouchers, meal stipends, and DOT mandatory delay compensation for 312 passengers.",
      metric: "312 Passengers Protected",
    },
    {
      id: "multi-4",
      role: "crew",
      name: "CrewRoster-Opt",
      title: "Crew Controller",
      time: "08:22:34 CST",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      status: "validated",
      content: "FAA Part 117 Cascade Alert: Wind shear holds at DEN cause 4 cockpit crews to breach maximum 14h Duty Period. Calling ORD Reserve Crew Pool #308 and DEN Standby Flight Officers #512 to take over evening legs.",
      deltaCost: -125900,
      tradeoff: "Deploys 2 reserve pairs ($4,200 callout expenses); avoids FAA crew duty violation fines of $120,000 and 4 stranded tails.",
      metric: "FAR 117: 0 Breaches",
    },
    {
      id: "multi-5",
      role: "dutymanager",
      name: "OCC Arbiter",
      title: "Duty Manager",
      time: "08:22:40 CST",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      status: "approved",
      content: "Cross-Hub Arbitration Executed (19.8s): Duty Manager approves coordinated multi-hub consensus plan across United and American networks. Swapped 2 tails, re-allocated 4 gates, protected 312 passengers, dispatched 2 reserve pairs. Net Recovery Savings: $386,400.",
      deltaCost: -386400,
      tradeoff: "Zero multi-day contagion; all passenger and crew invariants mathematically conserved.",
      metric: "Optimal Multi-Hub Plan Executed",
    },
  ],
};

const DECEMBER_PROFILE: ScenarioArbitrationProfile = {
  title: "5-Agent Arbitration Engine",
  subtitle: "31-Day Network Macro Horizon • 582K Flights Audited",
  totalSaved: 1420000,
  consensusLabel: "Systemic Network Consensus",
  consensusDetail: "Delta: $1,420,000 saved across 31-day national network",
  statusBadge: "31-Day Rolling Consensus",
  agentStatus: {
    aircraft: "42 Preventive Tail Swaps",
    crew: "18 Standby Crews Deployed",
    passenger: "2,840 Pax Re-routed Clean",
    gate: "Winter Buffer Protocol (65m)",
    dutymanager: "+$1.42M Plan Executed",
  },
  logs: [
    {
      id: "dec-1",
      role: "aircraft",
      name: "AeroOps-1",
      title: "Aircraft Controller",
      time: "Day 15 • 10:00 CST",
      badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      status: "proposed",
      content: "31-Day Network Macro Horizon: Managing 582,000 national schedule records. Winter weather de-icing holds propagating across Midwest/Northeast corridors (ORD, DTW, JFK). Executed 42 preventive tail swaps on rotation bottlenecks.",
      deltaCost: -480000,
      tradeoff: "Absorbs minor buffer compressions; eliminates systemic multi-day network de-synchronization.",
      metric: "42 Rotations Stabilized",
    },
    {
      id: "dec-2",
      role: "gate",
      name: "GateMaster-AI",
      title: "Gate Controller",
      time: "Day 15 • 10:05 CST",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      status: "contested",
      content: "Winter Operations Buffer Protocol: Dynamically expanded standard turnaround gate buffer from 45m to 65m at 8 northern winter hubs to absorb extended de-icing fluid application cycles.",
      tradeoff: "Reduces peak gate utilization by 4%; prevents 84 gate lockouts and de-icing pad queue overflow.",
      metric: "8 Winter Hubs Stabilized",
    },
    {
      id: "dec-3",
      role: "passenger",
      name: "PaxCare-Agent",
      title: "Passenger Controller",
      time: "Day 15 • 10:10 CST",
      badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      status: "proposed",
      content: "Mass Passenger Contagion Mitigation: Proactive rebooking algorithms protected 2,840 high-risk connecting passengers across 14 hubs 6 hours before storm arrival.",
      deltaCost: -560000,
      tradeoff: "Secures alternate routing through southern hubs (DFW, ATL, CLT); avoids catastrophic holiday rebooking backlog.",
      metric: "2,840 Passengers Protected",
    },
    {
      id: "dec-4",
      role: "crew",
      name: "CrewRoster-Opt",
      title: "Crew Controller",
      time: "Day 15 • 10:15 CST",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      status: "validated",
      content: "Macro FAA Part 117 Legality Shield: Managed rolling duty rest constraints across 45,000+ crew duty legs. Activated regional reserve domicile pools at ORD, EWR, and IAH.",
      deltaCost: -380000,
      tradeoff: "Deploys 18 standby reserve crews; prevents 34 cancellations due to crew timing out in blizzard de-icing queues.",
      metric: "FAR 117: Zero Systemic Breaches",
    },
    {
      id: "dec-5",
      role: "dutymanager",
      name: "OCC Arbiter",
      title: "Duty Manager",
      time: "Day 15 • 10:20 CST",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      status: "approved",
      content: "Macro-Horizon Arbitration Executed: 31-day rolling consensus prevents national airspace paralysis during holiday peak. Mitigated 118 cancellations across 582K flights. Total Net Value Saved: $1,420,000.",
      deltaCost: -1420000,
      tradeoff: "Ensured 98.4% system schedule completion rate across all major US trunk routes.",
      metric: "Macro Network Consensus Validated",
    },
  ],
};

const BASELINE_PROFILE: ScenarioArbitrationProfile = {
  title: "5-Agent Arbitration Engine",
  subtitle: "Airspace Nominal Baseline • 0 Active Disruption Cascades",
  totalSaved: 0,
  consensusLabel: "Airspace Nominal Baseline",
  consensusDetail: "Discrete-event engines confirm $0 variance across nationwide schedule",
  statusBadge: "Airspace Nominal • Clear",
  agentStatus: {
    aircraft: "2,840 Rotations Nominal",
    crew: "100% Part 117 Compliant",
    passenger: "0 Misconnections Flagged",
    gate: "All Ramps Clear",
    dutymanager: "Baseline Schedule Intact",
  },
  logs: [
    {
      id: "base-1",
      role: "aircraft",
      name: "AeroOps-1",
      title: "Aircraft Controller",
      time: "Simulated Time",
      badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      status: "validated",
      content: "All scheduled rotations operating within normal turnaround windows. 2,840 daily aircraft tails tracking on-time trajectory without tail swap intervention.",
      deltaCost: 0,
      tradeoff: "Standard buffers preserved; zero swap overhead.",
      metric: "Rotation Invariant: Preserved",
    },
    {
      id: "base-2",
      role: "gate",
      name: "GateMaster-AI",
      title: "Gate Controller",
      time: "Simulated Time",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      status: "validated",
      content: "Gate occupancy models nominal across 340 commercial airports. Concourse ramp flow and pushback separation verified clean.",
      deltaCost: 0,
      tradeoff: "Normal gate turnarounds maintained with 0 tarmac delays.",
      metric: "0 Ramp Conflicts",
    },
    {
      id: "base-3",
      role: "passenger",
      name: "PaxCare-Agent",
      title: "Passenger Controller",
      time: "Simulated Time",
      badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      status: "validated",
      content: "Continuous itinerary monitoring: 100% of connecting passenger itineraries within legal transfer limits. Zero misconnections flagged.",
      deltaCost: 0,
      tradeoff: "All scheduled connections intact; zero hotel vouchers required.",
      metric: "0 Misconnections",
    },
    {
      id: "base-4",
      role: "crew",
      name: "CrewRoster-Opt",
      title: "Crew Controller",
      time: "Simulated Time",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      status: "validated",
      content: "FAA FAR Part 117 legality audit nominal. All active cockpit and cabin crews have minimum rest buffers verified. Reserve crews unallocated.",
      deltaCost: 0,
      tradeoff: "Standard duty schedules maintained without overtime or penalty.",
      metric: "Part 117: 100% Legal",
    },
    {
      id: "base-5",
      role: "dutymanager",
      name: "OCC Arbiter",
      title: "Duty Manager",
      time: "Simulated Time",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      status: "approved",
      content: "Airspace Consensus: Nominal baseline state confirmed. Discrete-event simulation engines report zero delay contagion. Operations executing on published schedule.",
      deltaCost: 0,
      tradeoff: "Zero operational intervention needed; cost variance strictly $0.",
      metric: "Baseline Operational State",
    },
  ],
};

function resolveProfile(
  scenario?: ScenarioData,
  isCleanBoot?: boolean
): ScenarioArbitrationProfile {
  if (isCleanBoot) return BASELINE_PROFILE;
  const slug = scenario?.meta?.scenarioId?.toLowerCase() ?? "";

  if (slug === "baseline") return BASELINE_PROFILE;
  if (slug.includes("multi")) return MULTI_HUB_PROFILE;
  if (slug.includes("december")) return DECEMBER_PROFILE;
  if (slug.includes("ord") || slug.includes("runway")) return ORD_PROFILE;

  // If there are no disruption markers, default to baseline
  if (!scenario?.disruptionMarkers || scenario.disruptionMarkers.length === 0) {
    return BASELINE_PROFILE;
  }

  // Dynamic fallback for custom / live disruption scenarios
  const primaryHub = scenario.disruptionMarkers[0]?.airportIata ?? "ORD";
  const incidentCount = scenario.disruptionMarkers.length;
  const cost = scenario.impactSummary.totalCostUsd.typical;
  const estimatedSaving = Math.round(cost * 0.75);

  return {
    title: "5-Agent Arbitration Engine",
    subtitle: `${scenario.meta.label} • ${incidentCount} Disruption${incidentCount > 1 ? "s" : ""}`,
    totalSaved: estimatedSaving,
    consensusLabel: "Arbitrated OCC Consensus",
    consensusDetail: `Delta: ${formatUsd(estimatedSaving)} saved vs. active cascade`,
    statusBadge: `${incidentCount} Active Cascades`,
    agentStatus: {
      aircraft: `Active Swap at ${primaryHub}`,
      crew: "FAR 117 Duty Shield Active",
      passenger: `${scenario.impactSummary.passengersMisconnected} Pax Protected`,
      gate: `Ramp Buffer at ${primaryHub}`,
      dutymanager: `${formatUsd(estimatedSaving)} Plan Approved`,
    },
    logs: [
      {
        id: "dyn-1",
        role: "aircraft",
        name: "AeroOps-1",
        title: "Aircraft Controller",
        time: "Current Sim Window",
        badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        status: "proposed",
        content: `Disruption active at ${primaryHub}: Analyzing tail rotations. Re-assigning aircraft buffers to protect downstream connecting legs.`,
        deltaCost: -Math.round(estimatedSaving * 0.25),
        tradeoff: "Stabilizes turnarounds across bottleneck hubs.",
        metric: "Rotations Stabilized",
      },
      {
        id: "dyn-2",
        role: "gate",
        name: "GateMaster-AI",
        title: "Gate Controller",
        time: "Current Sim Window",
        badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        status: "contested",
        content: `Concourse hold mitigation: Re-allocating gate buffers at ${primaryHub} to eliminate taxiway pushback stackups.`,
        tradeoff: "Re-routes gate turns to reduce ground congestion.",
        metric: "Ramp De-conflicted",
      },
      {
        id: "dyn-3",
        role: "passenger",
        name: "PaxCare-Agent",
        title: "Passenger Controller",
        time: "Current Sim Window",
        badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        status: "proposed",
        content: `Mitigating ${scenario.impactSummary.passengersMisconnected} misconnections: Triggering partner airline rebooking and selective connection holds.`,
        deltaCost: -Math.round(estimatedSaving * 0.4),
        tradeoff: "Eliminates overnight passenger hotel vouchers.",
        metric: `${scenario.impactSummary.passengersMisconnected} Pax Protected`,
      },
      {
        id: "dyn-4",
        role: "crew",
        name: "CrewRoster-Opt",
        title: "Crew Controller",
        time: "Current Sim Window",
        badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        status: "validated",
        content: "FAR Part 117 Legality Watch: Dispatching domicile reserve crews to prevent flight cancellations from duty timeouts.",
        deltaCost: -Math.round(estimatedSaving * 0.15),
        tradeoff: "Standby callout prevents aircraft groundings.",
        metric: "Part 117: Compliant",
      },
      {
        id: "dyn-5",
        role: "dutymanager",
        name: "OCC Arbiter",
        title: "Duty Manager",
        time: "Current Sim Window",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        status: "approved",
        content: `Arbitration Consensus Achieved: Coordinated recovery plan executed for ${scenario.meta.label}. Total saved delta: ${formatUsd(estimatedSaving)}.`,
        deltaCost: -estimatedSaving,
        tradeoff: "Eliminates systemic contagion across connecting airline networks.",
        metric: "Arbitrated Plan Executed",
      },
    ],
  };
}

export function AgentArbitrationFeed({
  scenario,
  recovery,
  isCleanBoot,
  compact = false,
}: {
  scenario?: ScenarioData;
  recovery?: RecoveryView | null;
  isCleanBoot?: boolean;
  compact?: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<AgentRole>("all");
  const [isSimulating, setIsSimulating] = useState(false);

  const profile = useMemo(
    () => resolveProfile(scenario, isCleanBoot),
    [scenario, isCleanBoot]
  );

  const [activeStep, setActiveStep] = useState<number>(profile.logs.length);

  // When scenario or clean boot changes, reset simulation to full resolved state
  useEffect(() => {
    setActiveStep(profile.logs.length);
    setIsSimulating(false);
  }, [profile]);

  const filteredLogs = profile.logs
    .slice(0, activeStep)
    .filter((msg) => selectedRole === "all" || msg.role === selectedRole);

  const totalSaved = recovery?.recoverySaving?.typical ?? profile.totalSaved;

  function runSimulation() {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveStep(1);
    let step = 1;
    const interval = setInterval(() => {
      step += 1;
      setActiveStep(step);
      if (step >= profile.logs.length) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 750);
  }

  const agentMeta = [
    { role: "aircraft", label: "Aircraft", icon: "✈️", focus: profile.agentStatus.aircraft },
    { role: "crew", label: "Crew", icon: "👨‍✈️", focus: profile.agentStatus.crew },
    { role: "passenger", label: "Passenger", icon: "👥", focus: profile.agentStatus.passenger },
    { role: "gate", label: "Gate", icon: "🚪", focus: profile.agentStatus.gate },
    { role: "dutymanager", label: "Duty Mgr", icon: "⚖️", focus: profile.agentStatus.dutymanager },
  ] as const;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-3.5 space-y-3 shadow-xl">
      {/* Header with Title & Live Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              {profile.title}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {profile.subtitle}
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
        {agentMeta.map((agent) => {
          const isSelected = selectedRole === agent.role;
          return (
            <button
              key={agent.role}
              onClick={() => setSelectedRole(isSelected ? "all" : agent.role as AgentRole)}
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
                  <div className="text-[8px] text-slate-400 truncate" title={agent.focus}>
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
        {agentMeta.map((a) => (
          <button
            key={a.role}
            onClick={() => setSelectedRole(a.role as AgentRole)}
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
                  {msg.deltaCost < 0
                    ? `Savings: ${formatUsd(Math.abs(msg.deltaCost))}`
                    : msg.deltaCost === 0
                    ? "Variance: $0"
                    : `Cost: +${formatUsd(msg.deltaCost)}`}
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
              {profile.consensusLabel}
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              {totalSaved > 0 ? (
                <>Delta: <span className="text-gold font-bold">{formatUsd(totalSaved)}</span> saved vs. cascade</>
              ) : (
                profile.consensusDetail
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            {profile.statusBadge}
          </span>
        </div>
      </div>
    </div>
  );
}
