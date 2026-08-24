import { useState } from "react";
import { SEVERITY_COLORS_RGB, SEVERITY_LABELS } from "@/lib/severity";
import { formatSimClock, formatCount, humanizeActionType } from "@/lib/format";
import { CARRIER_NAMES } from "@/lib/carrierNames";
import { RangeValue } from "@/components/ui/RangeValue";
import { useInspectorMode } from "@/lib/inspectorMode";
import { buildRotation } from "@/lib/rotation";
import type { RecoveryAction } from "@/lib/backendClient";
import type { FlightLeg } from "@/lib/types";

type PanelTab = "overview" | "rotation" | "crew";

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
  const showTabs = inspectorMode && !!flights;
  const activeTab: PanelTab = showTabs ? tab : "overview";

  return (
    <div className="absolute top-0 right-0 h-full w-[340px] bg-surface border-l border-border overflow-y-auto state-transition" data-testid="flight-detail-panel">
      <div className="flex items-start justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="font-display text-lg font-semibold text-aubergine">{flight.flightNumber ?? flight.legId}</p>
          <p className="text-xs text-muted mt-0.5">
            {airline} &middot; {flight.aircraftType ?? "Aircraft type unknown"}
          </p>
          {flight.tailNumber && <p className="font-mono text-xs text-muted mt-0.5">{flight.tailNumber}</p>}
        </div>
        <button onClick={onClose} className="text-muted hover:text-aubergine state-transition text-lg leading-none px-1" aria-label="Close">
          &times;
        </button>
      </div>

      {showTabs && (
        <div className="flex border-b border-border" role="tablist" aria-label="Flight detail tabs">
          {(["overview", "rotation", "crew"] as PanelTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={activeTab === t}
              data-testid={`flight-tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 font-mono text-[11px] uppercase tracking-widest px-2 py-2 state-transition ${
                activeTab === t ? "bg-aubergine text-page" : "bg-surface text-aubergine-soft hover:text-aubergine"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {activeTab === "rotation" && flights ? (
        <RotationTab flight={flight} flights={flights} onSelectFlight={onSelectFlight} />
      ) : activeTab === "crew" ? (
        <CrewTab flight={flight} />
      ) : (
        <OverviewTab flight={flight} s={s} b={b} severityColor={severityColor} delayLabel={delayLabel} recoveryAction={recoveryAction} />
      )}
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
}: {
  flight: FlightLeg;
  s: FlightLeg["scenario"];
  b: FlightLeg["baseline"];
  severityColor: string;
  delayLabel: string;
  recoveryAction?: RecoveryAction | null;
}) {
  return (
    <>

      <div className="px-4 py-3 border-b border-border">
        <p className="font-mono text-base text-aubergine">
          {flight.originIata} <span className="text-muted">&rarr;</span> {flight.destIata}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2 font-mono tabular-nums text-xs">
          <div>
            <p className="text-muted">Scheduled dep</p>
            <p className="text-aubergine">{flight.scheduledDepMin != null ? formatSimClock(flight.scheduledDepMin) : ", "}</p>
          </div>
          <div>
            <p className="text-muted">Simulated dep</p>
            <p className="text-aubergine">{s.simDepMin != null ? formatSimClock(s.simDepMin) : ", "}</p>
          </div>
          <div>
            <p className="text-muted">Scheduled arr</p>
            <p className="text-aubergine">{flight.scheduledArrMin != null ? formatSimClock(flight.scheduledArrMin) : ", "}</p>
          </div>
          <div>
            <p className="text-muted">Simulated arr</p>
            <p className="text-aubergine">{s.simArrMin != null ? formatSimClock(s.simArrMin) : ", "}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: severityColor }} />
          <span className="font-mono tabular-nums text-lg font-medium" style={{ color: severityColor }}>
            {delayLabel}
          </span>
          <span className="text-xs text-muted">{SEVERITY_LABELS[s.severity]}</span>
        </div>
      </div>

      {recoveryAction && (
        <div className="px-4 py-3 border-b border-border">
          <p className="font-mono text-xs uppercase tracking-widest text-gold-deep mb-2">Recovery action</p>
          <p className="text-xs text-aubergine">
            <span className="font-mono text-gold-deep font-medium">{humanizeActionType(recoveryAction.actionType)}</span>
            {recoveryAction.affectedIds.length > 1 && <span className="font-mono text-muted"> &middot; {recoveryAction.affectedIds.slice(1).join(", ")}</span>}
          </p>
          {recoveryAction.rationale && <p className="text-xs text-muted mt-1">{recoveryAction.rationale}</p>}
        </div>
      )}

      <div className="px-4 py-3 border-b border-border">
        <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Passenger impact</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="font-mono tabular-nums text-xl text-aubergine font-medium">{formatCount(flight.passengersOnBoard)}</p>
            <p className="text-xs text-muted mt-0.5">passengers on board</p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl text-aubergine font-medium">{formatCount(flight.connectingPassengers)}</p>
            <p className="text-xs text-muted mt-0.5">connecting onward</p>
          </div>
        </div>

        {flight.connectingPassengers > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            {b && s.misconnectionsCaused !== b.misconnectionsCaused ? (
              <>
                <p className="text-xs text-aubergine">
                  This flight&rsquo;s delay caused{" "}
                  <span className="font-mono tabular-nums text-red-soft font-medium">
                    {formatCount(s.misconnectionsCaused)} of {formatCount(flight.connectingPassengers)}
                  </span>{" "}
                  connecting passenger(s) ({s.misconnectCausedPct ?? 0}%) to miss their connection.
                </p>
                <p className="text-xs text-muted mt-1.5">
                  Without this disruption: <span className="font-mono tabular-nums">{formatCount(b.misconnectionsCaused)}</span> would have
                  misconnected ({b.misconnectCausedPct ?? 0}%).
                </p>
              </>
            ) : (
              <p className="text-xs text-aubergine">
                <span className="font-mono tabular-nums text-red-soft font-medium">
                  {formatCount(s.misconnectionsCaused)} of {formatCount(flight.connectingPassengers)}
                </span>{" "}
                connecting passenger(s) ({s.misconnectCausedPct ?? 0}%) missed their connection because of this flight.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Direct cost</p>
        {s.directCostUsd ? (
          <RangeValue low={s.directCostUsd.low} typical={s.directCostUsd.typical} high={s.directCostUsd.high} tone="red" size="base" />
        ) : (
          <p className="text-xs text-muted">Not tracked for this flight.</p>
        )}
        <p className="text-[11px] text-muted mt-1.5">
          This flight&rsquo;s own operating/cancellation/crew/delay cost,  a PARTIAL figure. Excludes misconnect-driven rebooking and
          misconnected-passenger delay costs, which can&rsquo;t be cleanly attributed to one leg.
        </p>
      </div>
    </>
  );
}

/**
 * Inspector Mode, Rotation tab: this tail's own chronological leg
 * timeline for the loaded day (see lib/rotation.ts). Highlights the
 * currently-focused leg and shows each leg's delay INHERITANCE --
 * `reactionaryDelayMin` (never `primaryDelayMin`, which is always 0 in
 * this app's clean-mode exports -- see FlightLegSide's own doc comment)
 * is the number that tells the "delay carried in from the previous leg"
 * story a rotation timeline exists to show.
 */
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
    return <p className="px-4 py-3 text-xs text-muted">No tail number recorded for this leg -- rotation unavailable.</p>;
  }
  const rotation = buildRotation(flights, flight.tailNumber);

  return (
    <div className="px-4 py-3">
      <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">
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
                className={`w-full text-left rounded border px-2.5 py-2 state-transition ${
                  isCurrent ? "border-gold bg-elevated cursor-default" : "border-border hover:border-aubergine-soft"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-aubergine">
                    {i + 1}. {leg.originIata}&rarr;{leg.destIata}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {leg.scheduledDepMin != null ? formatSimClock(leg.scheduledDepMin) : ", "}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-muted">{SEVERITY_LABELS[rs.severity]}</span>
                  {reactionary != null && reactionary > 0 && (
                    <span className="font-mono text-[11px] text-red-soft">+{Math.round(reactionary)} min inherited</span>
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

/**
 * Inspector Mode, Crew tab: composition + legality-clock facts, read
 * straight off `flight.crew` (static reference facts + this leg's own
 * computed duty/flight-time-so-far clocks -- see
 * scripts/scenario_reshape.py's load_crew_reference/_compute_crew_clocks).
 * "AT RISK" is a purely presentational threshold on the ALREADY-COMPUTED
 * remaining margin (maxFdpMin - dutyTimeSoFarMin) -- no new legality
 * logic invented here, this just surfaces the same cliff
 * engine/crew_legality.py itself checks at simulation time.
 */
function CrewTab({ flight }: { flight: FlightLeg }) {
  const crew = flight.crew;
  if (!crew) {
    return <p className="px-4 py-3 text-xs text-muted">No crew reference data available for this leg.</p>;
  }
  const { roleCounts, reportMin, releaseMin, maxFdpMin, dutyTimeSoFarMin, flightTimeSoFarMin } = crew;
  const marginMin = dutyTimeSoFarMin != null ? maxFdpMin - dutyTimeSoFarMin : null;
  const atRisk = marginMin != null && marginMin <= 60;
  const cliffTriggered = flight.scenario.crewIllegal || flight.scenario.crewResolution !== "on_time";

  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Crew composition</p>
        <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-xs">
          <div>
            <p className="text-aubergine text-base">{roleCounts.captain}</p>
            <p className="text-muted">Captain</p>
          </div>
          <div>
            <p className="text-aubergine text-base">{roleCounts.firstOfficer}</p>
            <p className="text-muted">First officer</p>
          </div>
          <div>
            <p className="text-aubergine text-base">{roleCounts.flightAttendant}</p>
            <p className="text-muted">Flight attendant</p>
          </div>
        </div>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">Duty clock</p>
        <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-xs">
          <div>
            <p className="text-muted">On duty since</p>
            <p className="text-aubergine">{formatSimClock(reportMin)}</p>
          </div>
          <div>
            <p className="text-muted">Scheduled release</p>
            <p className="text-aubergine">{formatSimClock(releaseMin)}</p>
          </div>
          <div>
            <p className="text-muted">Duty time so far</p>
            <p className="text-aubergine">{dutyTimeSoFarMin != null ? `${Math.round(dutyTimeSoFarMin)} min` : ", "}</p>
          </div>
          <div>
            <p className="text-muted">Flight time so far</p>
            <p className="text-aubergine">{flightTimeSoFarMin != null ? `${Math.round(flightTimeSoFarMin)} min` : ", "}</p>
          </div>
          <div>
            <p className="text-muted">Max FDP (legal limit)</p>
            <p className="text-aubergine">{maxFdpMin} min</p>
          </div>
          <div>
            <p className="text-muted">Remaining margin</p>
            <p className={marginMin != null && marginMin <= 60 ? "text-red-soft" : "text-aubergine"}>
              {marginMin != null ? `${Math.round(marginMin)} min` : ", "}
            </p>
          </div>
        </div>
      </div>

      {(atRisk || cliffTriggered) && (
        <div className="pt-3 border-t border-border flex flex-col gap-1.5">
          {atRisk && (
            <p className="text-xs text-red-soft font-medium" data-testid="crew-at-risk">
              AT RISK &middot; crew is within 60 minutes of its legal duty-time limit.
            </p>
          )}
          {cliffTriggered && (
            <p className="text-xs text-red-soft font-medium" data-testid="crew-cliff-triggered">
              Legality cliff triggered &middot; resolution: {flight.scenario.crewResolution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
