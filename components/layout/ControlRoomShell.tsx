/**
 * The one control-room screen the whole app lives on (see the design
 * reference, section 03: "One primary screen, not a page tour"). This
 * shell fixes the three regions the reference defines,  a controls rail,
 * the map as the fixed center of gravity, and a ledger/dashboard column,
 *  as named CSS grid areas, so later tasks can each fill in their own
 * area without touching this file or the areas already built.
 *
 * Proportions: the design reference's own mockup uses roughly 1 : 3 : 1.3
 * (controls : map : ledger). This task only builds the ledger column, so
 * it gets a little more room here (1 : 2.4 : 1.6) than the schematic
 * mockup shows,  enough for the cost chart's legend and the carrier
 * table to stay legible on their own before the map exists to balance
 * against. The ledger column scrolls independently so it can hold real
 * content without pushing on the map's reserved width once that's built.
 *
 * ONE ROW, not two: the chat dock (Ops Assistant) used to be a fourth
 * grid area sitting below the map, permanently reserving vertical space
 * from it. It now floats OVER the map instead (an absolutely-positioned
 * overlay composed directly into the `map` slot's own content by the
 * caller,  see ControlRoomApp.tsx), so the ledger column can use the
 * FULL row height and there is no separate `chat` area left to fix here.
 */
export function ControlRoomShell({
  controls,
  map,
  ledger,
}: {
  controls: React.ReactNode;
  map: React.ReactNode;
  ledger: React.ReactNode;
}) {
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
