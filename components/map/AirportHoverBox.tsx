import type { AirportMeta, DisruptionMarker } from "@/lib/types";

/**
 * Task 8c: the airport layer's own quick-read hover box, styled
 * IDENTICALLY to MapHoverBox.tsx (same tokens: bg-elevated, hairline
 * border, pointer-events-none, cursor+14px offset) so the two read as
 * one consistent hover system, not two competing ones. IATA/city/state
 * always; disruption kind + window ONLY if this airport has one or
 * more injected disruptions -- otherwise nothing more, per this task's
 * own "hover is identity + disruption status, not the rich stuff"
 * restraint.
 */
export function AirportHoverBox({ x, y, airport, disruptions }: { x: number; y: number; airport: AirportMeta; disruptions: DisruptionMarker[] }) {
  return (
    <div
      className="absolute z-10 bg-elevated border border-border rounded-md px-3 py-2 pointer-events-none max-w-xs"
      style={{ left: x + 14, top: y + 14 }}
      data-testid="airport-hover-box"
    >
      <p className="font-mono text-sm text-aubergine">{airport.iata}</p>
      {/* cityName already carries ", ST" (aviation.db's own convention,
          e.g. "Chicago, IL") -- appending stateAbbr again would read as
          "Chicago, IL · IL". */}
      <p className="text-xs text-muted mt-0.5">{airport.cityName}</p>
      {disruptions.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {disruptions.map((d) => (
            <p key={d.id} className="font-mono text-xs text-red-soft">
              {d.label}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
