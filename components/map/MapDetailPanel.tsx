import { useState } from "react";
import { SEVERITY_COLORS_RGB, SEVERITY_LABELS } from "@/lib/severity";
import { formatSimClock, formatCount, humanizeActionType } from "@/lib/format";
import { CARRIER_NAMES } from "@/lib/carrierNames";
import { RangeValue } from "@/components/ui/RangeValue";
import { buildRotation } from "@/lib/rotation";
import { useInspectorMode } from "@/lib/inspectorMode";
import type { RecoveryAction } from "@/lib/backendClient";
import type { FlightLeg } from "@/lib/types";

type PanelTab = "overview" | "rotation" | "crew" | "telemetry";

/**
 * Task B: the rich, interactive click-detail panel,  the "fun" surface
 * FlightRadar-style maps build their whole click interaction around.
 * Consumes Task A's enriched per-leg fields directly from the in-memory
 * `flight` record (no fetch,  the whole point of enriching flights.json
 * up front). Slides in from the right when a plane is clicked (see
 * USMap.tsx's focus-mode state); closing (the × button, or clicking
 * empty map space,  handled by the caller) clears it.
 *
 * THE PASSENGER-IMPACT CONTRAST is the compelling part: baseline vs
 * scenario misconnectionsCaused, side by side, IS the disruption's
 * effect on this specific flight,  shown explicitly rather than making
 * the reader do the subtraction themselves.
 */
export function MapDetailPanel({
  flight,
  flights,
  onClose,
  onSelectFlight,
  recoveryAction,
}: {
  flight: FlightLeg;
  /** Inspector Mode's Rotation tab needs every OTHER leg this same tail
   * flew today -- optional so every pre-8f caller keeps working
   * unchanged (Rotation tab simply can't render without it, degrading
   * gracefully rather than crashing). */
  flights?: FlightLeg[];
  onClose: () => void;
  /** Rotation tab row click -> re-focus the panel on that leg instead
   * of closing it, so a developer can walk a tail's whole day without
   * returning to the map each time. */
  onSelectFlight?: (legId: string) => void;
  /** The before/after recovery view's stretch goal: when this flight is
   * one the OCC acted on (in "Recovered" mode -- see MapPanel.tsx's own
   * actionByLegId), shows what was done and why, closing the loop from
   * "the agents decided X" to "click this plane and read why." Absent
   * everywhere else. */
  recoveryAction?: RecoveryAction | null;
}) {
  const s = flight.scenario;
  const b = flight.baseline;
  const airline = CARRIER_NAMES[flight.carrierCode] ?? flight.carrierCode;
  const severityColor = `rgb(${SEVERITY_COLORS_RGB[s.severity].join(",")})`;
  const delayLabel = s.delayMin == null ? ", " : s.delayMin <= 0 ? "On-time" : `+${Math.round(s.delayMin)} min`;

  const { enabled: inspectorMode } = useInspectorMode();
  const [tab, setTab] = useState<PanelTab>("overview");
  const availableTabs: PanelTab[] = inspectorMode
    ? ["overview", "rotation", "crew", "telemetry"]
    : ["overview", "rotation", "crew"];
  const activeTab: PanelTab = availableTabs.includes(tab) ? tab : "overview";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] w-full rounded-t-3xl border-t border-slate-700/80 shadow-[0_-16px_48px_rgba(0,0,0,0.95)] bg-slate-900/98 backdrop-blur-2xl flex flex-col overflow-hidden lg:absolute lg:inset-x-auto lg:bottom-auto lg:top-0 lg:right-0 lg:h-full lg:w-[380px] lg:rounded-none lg:border-t-0 lg:border-l lg:border-slate-800 lg:z-50 lg:max-h-full state-transition select-none"
      data-testid="flight-detail-panel"
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Mobile Touch Drag Pill */}
      <div className="lg:hidden pt-2.5 pb-1 flex justify-center shrink-0">
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full" />
      </div>

      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-lg font-bold text-white tracking-tight">{flight.flightNumber ?? flight.legId}</p>
            {inspectorMode && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                DEV INSPECTOR
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {airline} &middot; {flight.aircraftType ?? "Aircraft type unknown"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {flight.tailNumber && <p className="font-mono text-xs text-blue-400 font-semibold">{flight.tailNumber}</p>}
            {inspectorMode && (
              <span className="font-mono text-[10px] text-amber-400/80 truncate">
                leg: {flight.legId}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div className="flex border-b border-slate-800 bg-slate-950/80 shrink-0 p-1.5 gap-1.5" role="tablist" aria-label="Flight detail tabs">
        {availableTabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={activeTab === t}
            data-testid={`flight-tab-${t}`}
            onClick={() => setTab(t)}
            className={`flex-1 font-mono text-xs uppercase tracking-wider py-2 rounded-lg transition min-h-[40px] flex items-center justify-center font-bold ${
              activeTab === t
                ? t === "telemetry"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800"
            }`}
          >
            {t === "telemetry" ? "Dev" : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {activeTab === "rotation" && flights ? (
          <RotationTab flight={flight} flights={flights} onSelectFlight={onSelectFlight} />
        ) : activeTab === "crew" ? (
          <CrewTab flight={flight} />
        ) : activeTab === "telemetry" ? (
          <TelemetryTab flight={flight} />
        ) : (
          <OverviewTab
            flight={flight}
            s={s}
            b={b}
            severityColor={severityColor}
            delayLabel={delayLabel}
            recoveryAction={recoveryAction}
            inspectorMode={inspectorMode}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  flight,
  s,
  b,
  severityColor,
  delayLabel,
  recoveryAction,
  inspectorMode,
}: {
  flight: FlightLeg;
  s: FlightLeg["scenario"];
  b: FlightLeg["baseline"];
  severityColor: string;
  delayLabel: string;
  recoveryAction?: RecoveryAction | null;
  inspectorMode?: boolean;
}) {
  return (
    <>
      {inspectorMode && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-300 font-bold uppercase tracking-wide text-[10px]">Dev Diagnostics</span>
          </div>
          <span className="text-[10px] text-amber-200/90 truncate">
            Reactionary: +{s.reactionaryDelayMin ?? 0}m &bull; Gate: {s.gateWaitMin ?? 0}m
          </span>
        </div>
      )}

      <div className="px-4 py-3 border-b border-slate-800">
        <p className="font-mono text-base font-bold text-white">
          {flight.originIata} <span className="text-blue-400">&rarr;</span> {flight.destIata}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2 font-mono tabular-nums text-xs">
          <div>
            <p className="text-slate-400">Scheduled dep</p>
            <p className="text-white font-semibold">{flight.scheduledDepMin != null ? formatSimClock(flight.scheduledDepMin) : "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Simulated dep</p>
            <p className="text-white font-semibold">{s.simDepMin != null ? formatSimClock(s.simDepMin) : "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Scheduled arr</p>
            <p className="text-white font-semibold">{flight.scheduledArrMin != null ? formatSimClock(flight.scheduledArrMin) : "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Simulated arr</p>
            <p className="text-white font-semibold">{s.simArrMin != null ? formatSimClock(s.simArrMin) : "—"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ backgroundColor: severityColor }} />
          <span className="font-mono tabular-nums text-lg font-bold" style={{ color: severityColor }}>
            {delayLabel}
          </span>
          <span className="text-xs text-slate-400 font-mono">({SEVERITY_LABELS[s.severity]})</span>
        </div>
      </div>

      {recoveryAction && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400 font-semibold mb-1">Recovery Action</p>
          <p className="text-xs text-slate-200 font-sans">
            <span className="font-mono text-amber-300 font-bold">{humanizeActionType(recoveryAction.actionType)}</span>
            {recoveryAction.affectedIds.length > 1 && <span className="font-mono text-slate-400"> &middot; {recoveryAction.affectedIds.slice(1).join(", ")}</span>}
          </p>
          {recoveryAction.rationale && <p className="text-xs text-slate-300 mt-1 font-sans">{recoveryAction.rationale}</p>}
        </div>
      )}

      <div className="px-4 py-3 border-b border-slate-800">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">Passenger Impact</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="font-mono tabular-nums text-xl text-white font-bold">{formatCount(flight.passengersOnBoard)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">passengers on board</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="font-mono tabular-nums text-xl text-blue-400 font-bold">{formatCount(flight.connectingPassengers)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">connecting onward</p>
          </div>
        </div>

        {flight.connectingPassengers > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            {b && s.misconnectionsCaused !== b.misconnectionsCaused ? (
              <>
                <p className="text-xs text-slate-200">
                  This flight&rsquo;s delay caused{" "}
                  <span className="font-mono tabular-nums text-red-400 font-bold">
                    {formatCount(s.misconnectionsCaused)} of {formatCount(flight.connectingPassengers)}
                  </span>{" "}
                  connecting passenger(s) ({s.misconnectCausedPct ?? 0}%) to miss their connection.
                </p>
                <p className="text-xs text-slate-400 mt-1.5 font-mono">
                  Without disruption: <span className="font-mono tabular-nums text-slate-300">{formatCount(b.misconnectionsCaused)}</span> would misconnect ({b.misconnectCausedPct ?? 0}%).
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-200">
                <span className="font-mono tabular-nums text-red-400 font-bold">
                  {formatCount(s.misconnectionsCaused)} of {formatCount(flight.connectingPassengers)}
                </span>{" "}
                connecting passenger(s) ({s.misconnectCausedPct ?? 0}%) missed their connection because of this flight.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">Direct Cost Impact</p>
        {s.directCostUsd ? (
          <RangeValue low={s.directCostUsd.low} typical={s.directCostUsd.typical} high={s.directCostUsd.high} tone="neutral" size="base" />
        ) : (
          <p className="text-xs text-slate-400 font-mono">Not tracked for this flight.</p>
        )}
        <p className="text-[11px] text-slate-400 mt-1.5">
          This flight&rsquo;s own operating/cancellation/crew/delay cost. Excludes downstream hotel accommodations and cross-carrier passenger rebooking.
        </p>
      </div>
    </>
  );
}

function TelemetryTab({ flight }: { flight: FlightLeg }) {
  const [copied, setCopied] = useState(false);
  const s = flight.scenario;

  const copyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(flight, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-4 font-mono text-xs">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold mb-2">
          Dispatch Diagnostics & Delay Attribution
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Primary Delay</span>
            <span className="text-white font-bold text-sm">
              {s.primaryDelayMin != null ? `${s.primaryDelayMin} min` : "0 min"}
            </span>
            <span className="text-[9px] text-slate-500 block">Initial incident</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-amber-400 block">Reactionary Delay</span>
            <span className="text-amber-300 font-bold text-sm">
              {s.reactionaryDelayMin != null ? `${s.reactionaryDelayMin} min` : "0 min"}
            </span>
            <span className="text-[9px] text-slate-500 block">Propagated turn lag</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Gate Wait</span>
            <span className="text-white font-bold text-sm">
              {s.gateWaitMin != null ? `${s.gateWaitMin} min` : "0 min"}
            </span>
            <span className="text-[9px] text-slate-500 block">Ramp / Stand holding</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Crew Legality Status</span>
            <span className={`font-bold text-sm ${s.crewIllegal ? "text-red-400" : "text-emerald-400"}`}>
              {s.crewIllegal ? "ILLEGAL" : "COMPLIANT"}
            </span>
            <span className="text-[9px] text-slate-500 block">FAR Part 117</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold mb-2">
          GPS Geodetic Coordinates
        </p>
        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Origin ({flight.originIata}):</span>
            <span className="text-white font-bold">[{flight.originLat.toFixed(4)}, {flight.originLon.toFixed(4)}]</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Destination ({flight.destIata}):</span>
            <span className="text-white font-bold">[{flight.destLat.toFixed(4)}, {flight.destLon.toFixed(4)}]</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Carrier / Flight Code:</span>
            <span className="text-white font-bold">{flight.carrierCode} &middot; {flight.flightNumber ?? "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tail Number:</span>
            <span className="text-blue-400 font-bold">{flight.tailNumber ?? "N/A"}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold">
            Raw In-Memory Flight JSON
          </p>
          <button
            type="button"
            onClick={copyJson}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition"
          >
            {copied ? "✓ Copied" : "Copy JSON"}
          </button>
        </div>
        <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 overflow-x-auto max-h-48 leading-tight">
          {JSON.stringify(flight, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function RotationTab({
  flight,
  flights,
  onSelectFlight,
}: {
  flight: FlightLeg;
  flights: FlightLeg[];
  onSelectFlight?: (legId: string) => void;
}) {
  if (!flight.tailNumber) {
    return <p className="px-4 py-3 text-xs text-slate-400 font-mono">No tail number recorded for this leg &mdash; rotation unavailable.</p>;
  }
  const rotation = buildRotation(flights, flight.tailNumber);

  return (
    <div className="px-4 py-3">
      <p className="font-mono text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
        {flight.tailNumber} &middot; {rotation.length} leg{rotation.length === 1 ? "" : "s"} today
      </p>
      <ul className="flex flex-col gap-2">
        {rotation.map((leg, i) => {
          const isCurrent = leg.legId === flight.legId;
          const rs = leg.scenario;
          const reactionary = rs.reactionaryDelayMin;
          return (
            <li key={leg.legId}>
              <button
                type="button"
                onClick={() => onSelectFlight?.(leg.legId)}
                disabled={isCurrent}
                data-testid="rotation-leg-row"
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                  isCurrent
                    ? "border-blue-500 bg-blue-950/40 shadow-sm ring-1 ring-blue-500/50 cursor-default"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">
                    {i + 1}. {leg.originIata} &rarr; {leg.destIata}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {leg.scheduledDepMin != null ? formatSimClock(leg.scheduledDepMin) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] font-mono text-slate-300">{SEVERITY_LABELS[rs.severity]}</span>
                  {reactionary != null && reactionary > 0 && (
                    <span className="font-mono text-[11px] text-red-400 font-medium">+{Math.round(reactionary)}m inherited</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CrewTab({ flight }: { flight: FlightLeg }) {
  const crew = flight.crew;
  if (!crew) {
    return (
      <div className="px-4 py-3 text-xs text-slate-400 leading-relaxed font-sans">
        <p className="font-mono text-[11px] uppercase tracking-widest text-slate-300 font-semibold mb-1.5">No Crew Pairing</p>
        <p>Crew pairing roster is not published in DOT BTS schedule records for this specific leg.</p>
        <p className="mt-2 text-[11px] text-slate-400">
          Coverage across December is ~90%+; other scheduled turns for this carrier or day include active rosters.
        </p>
      </div>
    );
  }
  const { roleCounts, reportMin, releaseMin, maxFdpMin, dutyTimeSoFarMin, flightTimeSoFarMin } = crew;
  const marginMin = dutyTimeSoFarMin != null ? maxFdpMin - dutyTimeSoFarMin : null;
  const atRisk = marginMin != null && marginMin <= 60;
  const cliffTriggered = flight.scenario.crewIllegal || flight.scenario.crewResolution !== "on_time";

  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">Crew Composition</p>
        <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-xs">
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
            <p className="text-white text-base font-bold">{roleCounts.captain}</p>
            <p className="text-[10px] text-slate-400">Captain</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
            <p className="text-white text-base font-bold">{roleCounts.firstOfficer}</p>
            <p className="text-[10px] text-slate-400">First Officer</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
            <p className="text-white text-base font-bold">{roleCounts.flightAttendant}</p>
            <p className="text-[10px] text-slate-400">Flight Attendant</p>
          </div>
        </div>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">FAR Part 117 Duty Clock</p>
        <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-xs">
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400 text-[10px]">On duty since</p>
            <p className="text-white font-semibold">{formatSimClock(reportMin)}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400 text-[10px]">Scheduled release</p>
            <p className="text-white font-semibold">{formatSimClock(releaseMin)}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400 text-[10px]">Duty time so far</p>
            <p className="text-white font-semibold">{dutyTimeSoFarMin != null ? `${Math.round(dutyTimeSoFarMin)} min` : "—"}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400 text-[10px]">Flight time so far</p>
            <p className="text-white font-semibold">{flightTimeSoFarMin != null ? `${Math.round(flightTimeSoFarMin)} min` : "—"}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400 text-[10px]">Max FDP (legal limit)</p>
            <p className="text-white font-semibold">{maxFdpMin} min</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <p className="text-slate-400 text-[10px]">Remaining margin</p>
            <p className={`font-bold ${marginMin != null && marginMin <= 60 ? "text-red-400" : "text-emerald-400"}`}>
              {marginMin != null ? `${Math.round(marginMin)} min` : "—"}
            </p>
          </div>
        </div>
      </div>

      {(atRisk || cliffTriggered) && (
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5 font-mono text-xs">
          {atRisk && (
            <p className="text-amber-400 font-semibold" data-testid="crew-at-risk">
              &bull; AT RISK: Crew is within 60 minutes of FAR Part 117 duty limit.
            </p>
          )}
          {cliffTriggered && (
            <p className="text-red-400 font-semibold" data-testid="crew-cliff-triggered">
              &bull; Legality Cliff: Resolution: {flight.scenario.crewResolution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
