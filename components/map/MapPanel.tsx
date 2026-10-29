"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { USMap } from "./USMap";
import { RadarDot } from "@/components/ui/RadarDot";
import { formatUsd } from "@/lib/format";
import type { RecoveryAction } from "@/lib/backendClient";
import type { RecoveryView } from "@/lib/recoveryView";
import type { FlightLeg, DisruptionMarker, AirportMeta, ImpactSummary, AirportDaily, BackendDisruptionRequest } from "@/lib/types";

export type MapView = "disrupted" | "recovered";

/**
 * The `map` grid area's content, pure presentation.
 * Houses the high-performance deck.gl nationwide airspace radar,
 * the before/after recovery toggles, and the real-time
 * Airspace Operational Status HUD Pill in the top-right corner.
 */
export function MapPanel({
  flights,
  disruptionMarkers,
  recovery,
  mapView,
  onMapViewChange,
  airports,
  impactSummary,
  airportDaily,
  flightsDetailDay,
  scenarioLabel,
  disruptions,
  isCleanBoot = false,
}: {
  flights: FlightLeg[];
  disruptionMarkers: DisruptionMarker[];
  recovery?: RecoveryView | null;
  mapView?: MapView;
  onMapViewChange?: (view: MapView) => void;
  airports: AirportMeta[];
  impactSummary: ImpactSummary;
  airportDaily?: AirportDaily;
  flightsDetailDay?: string;
  scenarioLabel?: string;
  disruptions?: BackendDisruptionRequest[] | null;
  isCleanBoot?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const showingRecovered = mapView === "recovered" && !!recovery;
  const activeFlights = showingRecovered ? recovery!.data.flights : flights;

  const markers = disruptionMarkers || [];
  const isDisrupted = !isCleanBoot && (markers.length > 0 || (disruptions != null && disruptions.length > 0));

  let statusText = "Airspace Nominal · Normal Baseline";

  if (isDisrupted) {
    if (markers.length > 0) {
      const labels = markers.map((m) => m.label).join(" | ");
      statusText = markers.length === 1
        ? `1 Incident Active · ${markers[0].label}`
        : `${markers.length} Incidents Active · ${labels}`;
    } else if (disruptions && disruptions.length > 0) {
      const descriptions = disruptions.map((d) => `${d.kind} (${d.target})`).join(" | ");
      statusText = `${disruptions.length} Disruptions Active · ${descriptions}`;
    } else {
      statusText = scenarioLabel ? `${scenarioLabel}: Disruption Active` : "Disruption Active";
    }
  }

  const actionByLegId = useMemo(() => {
    if (!recovery) return undefined;
    const map = new Map<string, RecoveryAction>();
    for (const a of recovery.recoveryActions) {
      const legId = a.affectedIds[0];
      if (legId && !map.has(legId)) map.set(legId, a);
    }
    return map;
  }, [recovery]);

  return (
    <div className="relative h-full bg-map-canvas border border-border rounded-md overflow-hidden">
      <USMap
        flights={activeFlights}
        disruptionMarkers={disruptionMarkers}
        improvedLegIds={showingRecovered ? recovery!.improvedLegIds : undefined}
        actionByLegId={showingRecovered ? actionByLegId : undefined}
        airports={airports}
        impactSummary={impactSummary}
        airportDaily={airportDaily}
        flightsDetailDay={flightsDetailDay}
      />

      {/* State-Driven Top-Right Airspace Status Pill with On-Click Dropdown */}
      <div
        ref={dropdownRef}
        className="absolute top-3 right-3 z-30 pointer-events-auto"
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Pill Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Toggle active operational constraints dropdown"
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border backdrop-blur-md text-xs font-mono select-none shadow-xl cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-[0.98] ${
            isDisrupted
              ? "bg-rose-950/85 border-rose-700/80 text-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.25)] hover:bg-rose-900/90"
              : "bg-emerald-950/80 border-emerald-700/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.18)] hover:bg-emerald-900/90"
          }`}
          title="Click to view active operational constraints"
        >
          {isDisrupted ? (
            <>
              <RadarDot size="md" />
              <span className="font-semibold tracking-wide truncate max-w-[260px]">
                {statusText}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="font-semibold tracking-wide truncate max-w-[260px]">
                {statusText}
              </span>
            </>
          )}

          {/* Subtle dropdown indicator chevron */}
          <svg
            className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* On-Click Dropdown: Active Constraints Panel */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-xl p-4 shadow-2xl z-40 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1.5">
                {isDisrupted ? (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
                Active Operational Constraints
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isDisrupted
                      ? "bg-rose-950/60 text-rose-300 border-rose-800/60 font-semibold"
                      : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60 font-semibold"
                  }`}
                >
                  {isDisrupted ? `${markers.length || (disruptions?.length ?? 1)} Active` : "Nominal"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition"
                  aria-label="Close dropdown"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Constraints List */}
            <div className="pt-3 space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {isDisrupted ? (
                <>
                  {markers.length > 0
                    ? markers.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 flex items-start justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span className="text-white font-medium truncate">{m.label}</span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {formatUsd(m.marginalCost.typical)} cascade delay impact
                            </p>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50 shrink-0">
                            Active
                          </span>
                        </div>
                      ))
                    : disruptions?.map((d, i) => {
                        const targetStr =
                          d.target.airport_iata ||
                          d.target.tail_number ||
                          (d.target.flight_number ? `${d.target.carrier_code || ""}${d.target.flight_number}` : "") ||
                          d.target.leg_id ||
                          "Airspace";
                        return (
                          <div
                            key={`d-${i}`}
                            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 flex items-start justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span className="text-white font-medium truncate capitalize">
                                  {d.kind.replace("_", " ")} ({targetStr})
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Injected live via prompt
                              </p>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50 shrink-0">
                              Active
                            </span>
                          </div>
                        );
                      })}
                </>
              ) : (
                <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/60 text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Airspace Operating at Normal Baseline</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    All 582,410 published airline schedule legs operating without cascade delay.
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>100% Tail Conservation</span>
                    <span>&bull;</span>
                    <span>0 Part 117 Breaches</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {recovery && onMapViewChange && (
        <div className="absolute top-3 left-3 z-10 flex bg-elevated border border-border rounded-md p-0.5 font-mono text-xs">
          {(["disrupted", "recovered"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onMapViewChange(v)}
              className={`px-2.5 py-1 rounded state-transition ${
                mapView === v ? "bg-aubergine text-page" : "text-aubergine-soft hover:text-aubergine"
              }`}
            >
              {v === "disrupted" ? "Disrupted" : "Recovered"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapPanel;
