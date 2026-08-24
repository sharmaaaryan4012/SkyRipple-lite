import { SEVERITY_COLORS_RGB } from "@/lib/severity";
import { formatSimClock } from "@/lib/format";
import { CARRIER_NAMES } from "@/lib/carrierNames";
import type { FlightLeg } from "@/lib/types";

/**
 * Task B: the FlightRadar-style quick-read hover box,  identity + route
 * + times only, restrained (mono for the times, hairline border, no
 * glass/blur/shadow). The rich passenger/cost detail lives in
 * MapDetailPanel.tsx instead, opened on CLICK,  this is deliberately
 * light so hovering across a dense field of planes stays cheap to read.
 */
export function MapHoverBox({ x, y, flight }: { x: number; y: number; flight: FlightLeg }) {
  const s = flight.scenario;
  const airline = CARRIER_NAMES[flight.carrierCode] ?? flight.carrierCode;
  return (
    <div
      className="absolute z-10 bg-elevated border border-border rounded-md px-3 py-2 pointer-events-none max-w-xs"
      style={{ left: x + 14, top: y + 14 }}
    >
      <p className="font-mono text-sm text-aubergine">{flight.flightNumber ?? `${flight.carrierCode} ${flight.legId}`}</p>
      <p className="text-xs text-muted mt-0.5">
        {airline} &middot; {flight.originIata} &rarr; {flight.destIata}
      </p>
      <div className="flex items-center gap-3 mt-1.5 font-mono tabular-nums text-xs text-aubergine">
        <span>Dep {s.simDepMin != null ? formatSimClock(s.simDepMin) : ", "}</span>
        <span className="text-muted">&rarr;</span>
        <span>Arr {s.simArrMin != null ? formatSimClock(s.simArrMin) : ", "}</span>
      </div>
      <p className="text-xs mt-1" style={{ color: `rgb(${SEVERITY_COLORS_RGB[s.severity].join(",")})` }}>
        {s.delayMin == null ? ", " : s.delayMin <= 0 ? "On-time" : `+${Math.round(s.delayMin)} min`}
      </p>
    </div>
  );
}
