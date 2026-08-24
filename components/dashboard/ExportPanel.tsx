"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { useViewWindow } from "@/lib/viewWindowContext";
import {
  AIRPORT_COLUMNS,
  CARRIER_COLUMNS,
  DAY_COLUMNS,
  FLIGHT_COLUMNS,
  GRAIN_LABELS,
  airportRows,
  carrierRows,
  dayRows,
  exportFilename,
  flightRows,
  rowsToCsv,
  scopeTag,
  type ColumnDef,
  type ExportGrain,
} from "@/lib/csvExport";
import type { FlightLeg, ScenarioData } from "@/lib/types";

/**
 * Task 8d: pick-your-columns CSV export. Four grains -- PER-FLIGHT,
 * PER-AIRPORT (Task 8c), PER-CARRIER, PER-DAY (multi-day only) -- never
 * mixed into one file (see lib/csvExport.ts's own docstring for why:
 * each has a different row identity, and a combined file would force
 * every column to repeat at the wrong grain). Scope is always the
 * CURRENT view window (Task 8b's own useViewWindow()) -- "download what
 * I'm seeing," never a full-scenario dump when the user is looking at
 * one day.
 *
 * Entirely client-side: every row-builder in lib/csvExport.ts reads only
 * already-loaded `scenario`/`flights`, no fetch, no backend call. A
 * single checked grain downloads its own .csv directly; more than one
 * zips them together (via jszip, already a transitive dep of deck.gl's
 * own @loaders.gl/zip -- see this task's own dependency note) into one
 * .zip, since a browser can't offer multiple simultaneous downloads from
 * one click reliably.
 */
export function ExportPanel({ scenario, flights }: { scenario: ScenarioData; flights: FlightLeg[] }) {
  const { window, multiDay, coverage } = useViewWindow();
  const grains: ExportGrain[] = multiDay ? ["flight", "airport", "carrier", "day"] : ["flight", "airport", "carrier"];

  const [checkedGrains, setCheckedGrains] = useState<Set<ExportGrain>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Record<ExportGrain, Set<string>>>({
    flight: new Set(FLIGHT_COLUMNS.map((c) => c.id)),
    airport: new Set(AIRPORT_COLUMNS.map((c) => c.id)),
    carrier: new Set(CARRIER_COLUMNS.map((c) => c.id)),
    day: new Set(DAY_COLUMNS.map((c) => c.id)),
  });
  const [expandedGrain, setExpandedGrain] = useState<ExportGrain | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Computed once per render from already-loaded data -- cheap enough
  // (at most a few tens of thousands of rows) that a live row-count
  // preview needs no debouncing or memo beyond the window/scenario
  // identity itself.
  const rowsByGrain = useMemo(
    () => ({
      flight: flightRows(flights, window),
      airport: airportRows(scenario, flights, window, multiDay),
      carrier: carrierRows(scenario, scenario.costTimeseries, window),
      day: multiDay ? dayRows(scenario, scenario.costTimeseries, coverage, window) : [],
    }),
    [scenario, flights, window, multiDay, coverage]
  );

  const columnsByGrain: Record<ExportGrain, ColumnDef<unknown>[]> = {
    flight: FLIGHT_COLUMNS as ColumnDef<unknown>[],
    airport: AIRPORT_COLUMNS as ColumnDef<unknown>[],
    carrier: CARRIER_COLUMNS as ColumnDef<unknown>[],
    day: DAY_COLUMNS as ColumnDef<unknown>[],
  };

  function toggleGrain(g: ExportGrain) {
    setCheckedGrains((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
    setExpandedGrain((cur) => (cur === g ? null : cur));
  }

  function toggleColumn(g: ExportGrain, colId: string) {
    setSelectedColumns((prev) => {
      const next = new Set(prev[g]);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return { ...prev, [g]: next };
    });
  }

  function setAllColumns(g: ExportGrain, on: boolean) {
    setSelectedColumns((prev) => ({ ...prev, [g]: on ? new Set(columnsByGrain[g].map((c) => c.id)) : new Set() }));
  }

  async function handleExport() {
    const chosen = grains.filter((g) => checkedGrains.has(g));
    if (chosen.length === 0) return;
    setDownloading(true);
    try {
      const files = await Promise.all(chosen.map(async (g) => {
        let rows = rowsByGrain[g] as unknown[];
        
        if (g === "flight" && multiDay) {
          const { dayOptions } = await import("@/lib/viewScale");
          const { loadFlights } = await import("@/lib/loadFlights");
          const { flightRows } = await import("@/lib/csvExport");
          const viewDays = dayOptions({ startDay: window.startDay, endDay: window.endDay });
          
          let allFlights: import("@/lib/types").FlightLeg[] = [];
          for (const d of viewDays) {
            try {
              const res = await loadFlights(scenario.meta.scenarioId, d);
              if (res && res.flights) allFlights = allFlights.concat(res.flights);
            } catch (e) {
              console.error("Failed to load flights for " + d, e);
            }
          }
          rows = flightRows(allFlights, window);
        }
        
        return {
          name: exportFilename(scenario.meta.scenarioId, g, window),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: rowsToCsv(columnsByGrain[g] as ColumnDef<any>[], selectedColumns[g], rows),
        };
      }));

      if (files.length === 1) {
        downloadBlob(new Blob([files[0].content], { type: "text/csv;charset=utf-8" }), files[0].name);
      } else {
        const zip = new JSZip();
        for (const f of files) zip.file(f.name, f.content);
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, `skyripple_export_${scopeTag(window)}.zip`);
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="export-panel">
      <p className="text-xs text-muted">
        Exports exactly the current view window (<span className="text-aubergine-soft font-mono">{window.label}</span>). Each grain downloads as its own CSV; picking more than one
        zips them together.
      </p>
      <div className="flex flex-col gap-2">
        {grains.map((g) => {
          const checked = checkedGrains.has(g);
          const rows = rowsByGrain[g];
          const cols = columnsByGrain[g];
          const selected = selectedColumns[g];
          return (
            <div key={g} className="border border-border rounded">
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none">
                <input type="checkbox" checked={checked} onChange={() => toggleGrain(g)} data-testid={`export-grain-${g}`} className="accent-aubergine" />
                <span className="font-mono text-xs uppercase tracking-widest text-aubergine">{GRAIN_LABELS[g]}</span>
                <span className="font-mono tabular-nums text-xs text-muted ml-auto" data-testid={`export-rowcount-${g}`}>
                  {g === "flight" && multiDay ? "Full window" : `${rows.length.toLocaleString("en-US")} rows`}
                </span>
                {checked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedGrain((cur) => (cur === g ? null : g));
                    }}
                    className="text-xs text-aubergine-soft hover:text-aubergine state-transition"
                    data-testid={`export-columns-toggle-${g}`}
                  >
                    columns
                  </button>
                )}
              </label>

              {checked && expandedGrain === g && (
                <div className="px-3 pb-3 border-t border-border pt-2" data-testid={`export-columns-${g}`}>
                  <div className="flex gap-3 mb-2">
                    <button type="button" onClick={() => setAllColumns(g, true)} className="text-xs text-aubergine-soft hover:text-aubergine state-transition">
                      All
                    </button>
                    <button type="button" onClick={() => setAllColumns(g, false)} className="text-xs text-aubergine-soft hover:text-aubergine state-transition">
                      None
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {cols.map((c) => (
                      <label key={c.id} className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleColumn(g, c.id)} className="accent-aubergine" data-testid={`export-col-${g}-${c.id}`} />
                        <span className="font-mono truncate">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={checkedGrains.size === 0 || downloading}
        data-testid="export-download-button"
        className="font-mono text-xs uppercase tracking-widest px-3 py-2 rounded border border-border bg-aubergine text-page state-transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-aubergine-soft"
      >
        {downloading ? "Preparing…" : checkedGrains.size > 1 ? "Download .zip" : "Download .csv"}
      </button>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
