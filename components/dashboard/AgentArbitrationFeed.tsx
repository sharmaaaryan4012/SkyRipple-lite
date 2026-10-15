"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import type { RecoveryView } from "@/lib/recoveryView";
import type { ScenarioData } from "@/lib/types";

export type AgentRole = "all" | "aircraft" | "crew" | "passenger" | "gate" | "dutymanager";

export interface ArbitrationMessage {
  id: string;
  role: "aircraft" | "crew" | "passenger" | "gate" | "dutymanager";
  title: string;
  time: string;
  content: string;
  deltaCost?: number;
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
  logs: ArbitrationMessage[];
}

const ORD_PROFILE: ScenarioArbitrationProfile = {
  title: "OCC Arbitration Log",
  subtitle: "Chicago O'Hare (ORD) Capacity Reduction • Discrete Resolution <20s",
  totalSaved: 172400,
  consensusLabel: "Duty Manager Arbitrated Consensus",
  consensusDetail: "Delta: +$172,400 net savings achieved vs. unmitigated cascade",
  statusBadge: "Plan Approved • 0 Overrides",
  logs: [
    {
      id: "ord-1",
      role: "aircraft",
      title: "Aircraft Controller",
      time: "08:14 CST",
      content: "ORD runway capacity restricted to 40%. Inbound leg UA-422 turnaround buffer compromised. Proposing tail swap: N418UA ↔ N892UA (MSP arrival) at Concourse B.",
      deltaCost: -42500,
      tradeoff: "Adds 12m ground service buffer; prevents cascading downstream cancellation on outbound UA-784.",
      metric: "Rotation Conservation: 100%",
    },
    {
      id: "ord-2",
      role: "gate",
      title: "Gate Controller",
      time: "08:14 CST",
      content: "Gate B12 conflict identified: N892UA turnaround overlaps with scheduled widebody arrival DL-291. Re-assigning N892UA to Concourse C Gate C08.",
      tradeoff: "Adds 4m passenger transit walk time; eliminates taxiway pushback deadlock and ground hold penalties.",
      metric: "Ramp Conflicts: 0",
    },
    {
      id: "ord-3",
      role: "passenger",
      title: "Passenger Controller",
      time: "08:14 CST",
      content: "Detected 48 high-value passengers connecting to transatlantic flight UA-1184 (ORD → LHR). Authorizing 15-minute gate departure hold on UA-1184.",
      deltaCost: -68400,
      tradeoff: "Averts 48 international misconnections, hotel accommodation vouchers, and DOT delay compensation.",
      metric: "48 Passengers Protected",
    },
    {
      id: "ord-4",
      role: "crew",
      title: "Crew Controller",
      time: "08:14 CST",
      content: "FAR Part 117 Audit: 15m hold on UA-1184 pushes First Officer over the 14-hour maximum duty limit. Dispatching ORD Standby Reserve First Officer #4102.",
      deltaCost: -18200,
      tradeoff: "Incurs $1,800 reserve callout cost; avoids illegal crew duty fine ($20,000) and stranded aircraft.",
      metric: "FAR Part 117: Compliant",
    },
    {
      id: "ord-5",
      role: "dutymanager",
      title: "Duty Manager",
      time: "08:14 CST",
      content: "Arbitration Complete (18.4s): Evaluated multi-agent proposals against macro cost objective function. Approved tail swap, Gate C08 reassignment, Reserve FO callout, and 15m connection hold.",
      deltaCost: -172400,
      tradeoff: "Zero flight cancellations, zero crew duty breaches, 48 protected passengers across network.",
      metric: "Optimal Delta: +$172,400",
    },
  ],
};

const MULTI_HUB_PROFILE: ScenarioArbitrationProfile = {
  title: "OCC Arbitration Log",
  subtitle: "Multi-Hub Cascade (ORD + DEN Closures, Fleet Grounding) • Resolution <20s",
  totalSaved: 386400,
  consensusLabel: "Cross-Hub Coordinated Consensus",
  consensusDetail: "Delta: +$386,400 net savings achieved across ORD and DEN hubs",
  statusBadge: "Multi-Hub Plan Approved",
  logs: [
    {
      id: "multi-1",
      role: "aircraft",
      title: "Aircraft Controller",
      time: "08:22 CST",
      content: "Compound dual-hub constraint: Concurrent 60% ORD capacity cut, 35% DEN capacity throttle, and United N464UA maintenance grounding. Swapping widebody N671UA on DEN-SFO transcon route.",
      deltaCost: -118500,
      tradeoff: "Absorbs 28m ground delay at Denver; eliminates 3 downstream cancellations on West Coast trunk routes.",
      metric: "3 Trunk Legs Rescued",
    },
    {
      id: "multi-2",
      role: "gate",
      title: "Gate Controller",
      time: "08:22 CST",
      content: "Severe ramp saturation at DEN Concourse B and ORD Terminal 1. Re-allocating 4 flights to DEN Concourse A hardstands and initiating dual-tug pushback sequencing.",
      tradeoff: "Requires bus transfer for 2 regional flights; avoids tarmac hold penalties and taxiway gridlock.",
      metric: "Dual Ramp De-conflicted",
    },
    {
      id: "multi-3",
      role: "passenger",
      title: "Passenger Controller",
      time: "08:22 CST",
      content: "Identified 312 passengers facing stranded overnight status across Chicago and Denver. Executing proactive partner airline seat rebooking and holding UA-1892 (DEN → ORD) by 18m.",
      deltaCost: -142000,
      tradeoff: "Pre-empts catastrophic overnight hotel and voucher obligations for 312 connecting travelers.",
      metric: "312 Passengers Protected",
    },
    {
      id: "multi-4",
      role: "crew",
      title: "Crew Controller",
      time: "08:22 CST",
      content: "FAR Part 117 Legality Shield: Denver ground stop strands 4 cockpit crews beyond legal duty thresholds. Dispatched emergency reserve pairs from ORD Pool #308 and DEN Standby #512.",
      deltaCost: -125900,
      tradeoff: "Deploys 2 reserve pairs ($4,200 total expenses); averts FAA duty violation fines and stranded tails.",
      metric: "FAR Part 117: Compliant",
    },
    {
      id: "multi-5",
      role: "dutymanager",
      title: "Duty Manager",
      time: "08:22 CST",
      content: "Cross-Hub Consensus Approved (19.8s): Duty Manager validated global cross-hub arbitration plan. Swapped 2 tails, de-conflicted 4 gates, protected 312 passengers, dispatched 2 reserve pairs.",
      deltaCost: -386400,
      tradeoff: "Zero multi-day contagion; preserves schedule integrity across both Midwest and Mountain hubs.",
      metric: "Optimal Delta: +$386,400",
    },
  ],
};

const BASELINE_PROFILE: ScenarioArbitrationProfile = {
  title: "OCC Arbitration Log",
  subtitle: "Published Schedule Baseline • 0 Injected Disruptions",
  totalSaved: 0,
  consensusLabel: "Airspace Operating at Published Baseline",
  consensusDetail: "Discrete-event engines confirm nominal schedule performance ($0 cost variance)",
  statusBadge: "Airspace Nominal",
  logs: [
    {
      id: "base-1",
      role: "aircraft",
      title: "Aircraft Controller",
      time: "Steady State",
      content: "All scheduled rotations operating within published turnaround windows. 2,840 daily aircraft tails tracking nominal flight trajectories without tail swap intervention.",
      deltaCost: 0,
      tradeoff: "Standard buffers preserved; zero rotation changes required.",
      metric: "Rotation Conservation: 100%",
    },
    {
      id: "base-2",
      role: "gate",
      title: "Gate Controller",
      time: "Steady State",
      content: "Gate occupancy models nominal across 340 commercial airports. Concourse ramp flow and pushback separations verified clear.",
      deltaCost: 0,
      tradeoff: "Published gate turnarounds maintained with zero tarmac delays.",
      metric: "Ramp Conflicts: 0",
    },
    {
      id: "base-3",
      role: "passenger",
      title: "Passenger Controller",
      time: "Steady State",
      content: "Continuous passenger itinerary monitoring: 100% of connecting passenger itineraries are within legal transfer limits. Zero misconnections flagged.",
      deltaCost: 0,
      tradeoff: "All scheduled connections intact; zero hotel vouchers required.",
      metric: "Misconnections: 0",
    },
    {
      id: "base-4",
      role: "crew",
      title: "Crew Controller",
      time: "Steady State",
      content: "FAR Part 117 legality audit nominal. All active cockpit and cabin crews have minimum rest buffers verified. Reserve crews remain unallocated on standby.",
      deltaCost: 0,
      tradeoff: "Standard duty schedules maintained without overtime or penalty.",
      metric: "FAR Part 117: Compliant",
    },
    {
      id: "base-5",
      role: "dutymanager",
      title: "Duty Manager",
      time: "Steady State",
      content: "Airspace Consensus: Nominal baseline state verified. Discrete-event engines report zero delay contagion. Operations executing strictly on published schedule.",
      deltaCost: 0,
      tradeoff: "Zero operational intervention needed; cost variance strictly $0.",
      metric: "Schedule Variance: $0",
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
  if (slug.includes("ord") || slug.includes("runway")) return ORD_PROFILE;

  if (!scenario?.disruptionMarkers || scenario.disruptionMarkers.length === 0) {
    return BASELINE_PROFILE;
  }

  const primaryHub = scenario.disruptionMarkers[0]?.airportIata ?? "ORD";
  const cost = scenario.impactSummary.totalCostUsd.typical;
  const estimatedSaving = Math.round(cost * 0.75);

  return {
    title: "OCC Arbitration Log",
    subtitle: `${scenario.meta.label} • Active Disruption Resolution`,
    totalSaved: estimatedSaving,
    consensusLabel: "Duty Manager Arbitrated Consensus",
    consensusDetail: `Delta: +${formatUsd(estimatedSaving)} net savings achieved vs. cascade`,
    statusBadge: "Plan Approved",
    logs: [
      {
        id: "dyn-1",
        role: "aircraft",
        title: "Aircraft Controller",
        time: "Active Window",
        content: `Active bottleneck at ${primaryHub}: Re-allocating aircraft turnaround buffers to protect downstream connecting rotations.`,
        deltaCost: -Math.round(estimatedSaving * 0.3),
        metric: "Rotation Conservation: 100%",
      },
      {
        id: "dyn-2",
        role: "gate",
        title: "Gate Controller",
        time: "Active Window",
        content: `Ramp hold mitigation at ${primaryHub}: Dynamically adjusting gate allocations to eliminate pushback queue stackups.`,
        metric: "Ramp De-conflicted",
      },
      {
        id: "dyn-3",
        role: "passenger",
        title: "Passenger Controller",
        time: "Active Window",
        content: `Protecting ${scenario.impactSummary.passengersMisconnected} connecting passengers: Activating partner rebooking and selective connection holds.`,
        deltaCost: -Math.round(estimatedSaving * 0.4),
        metric: "Passengers Protected",
      },
      {
        id: "dyn-4",
        role: "crew",
        title: "Crew Controller",
        time: "Active Window",
        content: "FAR Part 117 Compliance Watch: Deploying domicile reserve crews to prevent duty timeout cancellations.",
        deltaCost: -Math.round(estimatedSaving * 0.15),
        metric: "FAR Part 117: Compliant",
      },
      {
        id: "dyn-5",
        role: "dutymanager",
        title: "Duty Manager",
        time: "Active Window",
        content: `Coordinated Consensus Validated: Executed arbitrated plan for ${scenario.meta.label}. Mitigated delay contagion across connecting network.`,
        deltaCost: -estimatedSaving,
        metric: `Optimal Delta: +${formatUsd(estimatedSaving)}`,
      },
    ],
  };
}

const ROLES = [
  { id: "all", label: "All Agents" },
  { id: "aircraft", label: "Aircraft" },
  { id: "crew", label: "Crew" },
  { id: "passenger", label: "Passenger" },
  { id: "gate", label: "Gate" },
  { id: "dutymanager", label: "Duty Manager" },
] as const;

export function AgentArbitrationFeed({
  scenario,
  recovery,
  isCleanBoot,
}: {
  scenario?: ScenarioData;
  recovery?: RecoveryView | null;
  isCleanBoot?: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<AgentRole>("all");
  const [isSimulating, setIsSimulating] = useState(false);

  const profile = useMemo(
    () => resolveProfile(scenario, isCleanBoot),
    [scenario, isCleanBoot]
  );

  const [activeStep, setActiveStep] = useState<number>(profile.logs.length);

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
    }, 700);
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xl select-none">
      {/* Executive Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-white tracking-tight truncate">
              {profile.title}
            </h3>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              {profile.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className="px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-slate-950/70 border border-slate-800 hover:border-blue-500 hover:text-white transition disabled:opacity-50 shrink-0 text-slate-400"
        >
          {isSimulating ? "Replaying..." : "Replay Consensus"}
        </button>
      </div>

      {/* Unified Segmented Agent Filter Control (No redundant cards or emojis) */}
      <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg overflow-x-auto scrollbar-none text-[11px] font-mono">
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id as AgentRole)}
              className={`px-2.5 py-1 rounded-md transition whitespace-nowrap text-center ${
                isSelected
                  ? "bg-blue-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {role.label}
            </button>
          );
        })}
      </div>

      {/* Streamlined Executive Audit Log Feed */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {filteredLogs.map((msg) => (
          <div
            key={msg.id}
            className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
          >
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
              <span className="font-semibold text-white tracking-wide uppercase">
                {msg.title}
              </span>
              <span className="text-slate-400">{msg.time}</span>
            </div>

            <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
              {msg.content}
            </p>

            {msg.tradeoff && (
              <div className="text-[10px] text-slate-400 border-l-2 border-blue-500/60 pl-2 my-1 font-mono">
                <span className="text-amber-400 font-medium">Trade-off: </span>
                {msg.tradeoff}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[10px] font-mono">
              <span className="text-emerald-400 font-medium">
                {msg.metric}
              </span>
              {msg.deltaCost !== undefined && (
                <span className="text-blue-400 font-semibold">
                  {msg.deltaCost < 0
                    ? `Saved: ${formatUsd(Math.abs(msg.deltaCost))}`
                    : msg.deltaCost === 0
                    ? "Delta: $0"
                    : `Cost: +${formatUsd(msg.deltaCost)}`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Executive Consensus Footer */}
      <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 text-xs">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {profile.consensusLabel}
          </div>
          <div className="text-[11px] text-slate-200 font-mono mt-0.5">
            {totalSaved > 0 ? (
              <>Net Value Recovered: <span className="text-emerald-400 font-bold">{formatUsd(totalSaved)}</span></>
            ) : (
              profile.consensusDetail
            )}
          </div>
        </div>

        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50 shrink-0">
          {profile.statusBadge}
        </span>
      </div>
    </div>
  );
}
