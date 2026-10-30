import { assignCarrierColors } from "@/lib/carrierColors";
import { getFullCarrierName } from "@/lib/carrierNames";
import { formatUsd } from "@/lib/format";
import type { CarrierLedgerRow } from "@/lib/types";

/**
 * Cost by carrier, sorted by impact (highest typical cost first). Each
 * row's accent bar reuses the SAME color the carrier's line has in
 * CostTimeseriesChart, so a reader can connect a bar here back to a line
 * up there without a shared legend forcing them to cross-reference codes.
 */
export function CarrierBreakdownTable({ rows }: { rows: CarrierLedgerRow[] }) {
  const sorted = [...rows].sort((a, b) => Math.max(0, b.total.variance.typical) - Math.max(0, a.total.variance.typical));
  const colors = assignCarrierColors(rows.map((r) => r.carrierCode));
  const maxAbsTypical = Math.max(1, ...sorted.map((r) => Math.max(0, r.total.variance.typical)));

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted uppercase tracking-wider font-mono">
          <th className="font-normal pb-2 pl-1">Carrier</th>
          <th className="font-normal pb-2">Impact</th>
          <th className="font-normal pb-2 text-right pr-1">Cost above normal</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => {
          const typical = Math.max(0, row.total.variance.typical);
          const low = Math.max(0, row.total.variance.low);
          const high = Math.max(0, row.total.variance.high);
          const fullName = getFullCarrierName(row.carrierCode);
          const widthPct = (typical / maxAbsTypical) * 100;
          return (
            <tr key={row.carrierCode} className="border-t border-border">
              <td className="py-2 pl-1">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colors[row.carrierCode] }} />
                  <span className="font-medium text-slate-200">{fullName}</span>
                  {fullName !== row.carrierCode && (
                    <span className="font-mono text-xs text-muted">({row.carrierCode})</span>
                  )}
                </span>
              </td>
              <td className="py-2 pr-2">
                <div className="h-1.5 bg-elevated rounded-sm overflow-hidden w-full max-w-[140px]">
                  <div
                    className="h-full state-transition"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: colors[row.carrierCode] || "#C5A059",
                    }}
                  />
                </div>
              </td>
              <td className="py-2 pr-1 text-right">
                <span className="font-mono tabular-nums text-aubergine font-semibold">{formatUsd(typical)}</span>
                <span className="font-mono tabular-nums text-xs text-muted ml-2">
                  ({formatUsd(low)}&ndash;{formatUsd(high)})
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
