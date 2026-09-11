/**
 * The redesigned Operations Control Center (OCC) cockpit screen.
 * Implements a clean 2-tier spatial hierarchy:
 * 1. Top Executive Command Bar: Scenario switching, status indicator, and telemetry toggles.
 * 2. Main Body Split:
 *    - Left/Center Stage: High-impact US Airspace Map + Integrated Flight Deck (playback + full-width scrubber).
 *    - Right Rail: Structured Financial & Operational Contagion Ledger.
 */
export function ControlRoomShell({
  header,
  stage,
  ledger,
  controls,
  map,
}: {
  header?: React.ReactNode;
  stage?: React.ReactNode;
  ledger: React.ReactNode;
  /** Backward-compatible legacy props */
  controls?: React.ReactNode;
  map?: React.ReactNode;
}) {
  // If modern OCC stage & header are provided:
  if (header || stage) {
    return (
      <div className="h-screen flex flex-col bg-page text-aubergine font-sans overflow-hidden select-none">
        {header}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
          {/* Main Airspace Stage (Map + Flight Deck) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-2.5 overflow-hidden">
            {stage}
          </div>

          {/* Right Impact Ledger */}
          <aside className="w-full lg:w-[410px] xl:w-[440px] shrink-0 overflow-y-auto min-h-0 rounded-md">
            {ledger}
          </aside>
        </div>
      </div>
    );
  }

  // Fallback to legacy 3-column layout if old props used
  return (
    <div
      className="h-screen grid gap-3 p-3"
      style={{
        gridTemplateColumns: "1fr 2.4fr 1.6fr",
        gridTemplateRows: "1fr",
        gridTemplateAreas: `"controls map ledger"`,
      }}
    >
      <div style={{ gridArea: "controls" }} className="overflow-y-auto">
        {controls}
      </div>
      <div style={{ gridArea: "map" }} className="overflow-hidden">
        {map}
      </div>
      <div style={{ gridArea: "ledger" }} className="overflow-y-auto min-h-0">
        {ledger}
      </div>
    </div>
  );
}
