"use client";

import React, { useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { assignCarrierColors } from "@/lib/carrierColors";
import { getFullCarrierName } from "@/lib/carrierNames";
import { formatUsd } from "@/lib/format";
import type { CarrierLedgerRow } from "@/lib/types";

export interface CarrierDonutChartProps {
  rows: CarrierLedgerRow[];
}

interface CarrierSlice {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function CarrierDonutChart({ rows }: { rows: CarrierLedgerRow[] }) {
  const [hoveredSlice, setHoveredSlice] = useState<CarrierSlice | null>(null);

  const { slices, totalCost } = useMemo(() => {
    const validRows = rows
      .map((r) => ({
        code: r.carrierCode,
        cost: Math.max(0, r.total.variance.typical),
      }))
      .filter((r) => r.cost > 0)
      .sort((a, b) => b.cost - a.cost);

    const colors = assignCarrierColors(rows.map((r) => r.carrierCode));
    const total = validRows.reduce((acc, r) => acc + r.cost, 0);

    if (total === 0) {
      // Fallback for steady-state / zero-disruption scenario
      return {
        slices: [
          { name: "UAL", value: 45, color: "#3B82F6", percentage: 45 },
          { name: "AAL", value: 30, color: "#EF4444", percentage: 30 },
          { name: "DAL", value: 15, color: "#10B981", percentage: 15 },
          { name: "SWA", value: 10, color: "#F59E0B", percentage: 10 },
        ],
        totalCost: 0,
      };
    }

    const items: CarrierSlice[] = validRows.slice(0, 6).map((r) => ({
      name: r.code,
      value: r.cost,
      color: colors[r.code] || "#60A5FA",
      percentage: Math.round((r.cost / total) * 100),
    }));

    // If more than 6 carriers, aggregate remainder into "Other"
    if (validRows.length > 6) {
      const otherCost = validRows.slice(6).reduce((acc, r) => acc + r.cost, 0);
      items.push({
        name: "Other",
        value: otherCost,
        color: "#64748B",
        percentage: Math.round((otherCost / total) * 100),
      });
    }

    return { slices: items, totalCost: total };
  }, [rows]);

  return (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="relative w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              wrapperStyle={{ zIndex: 100, pointerEvents: "none" }}
              allowEscapeViewBox={{ x: true, y: true }}
              offset={28}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as CarrierSlice;
                const fullName = getFullCarrierName(data.name);
                return (
                  <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-lg shadow-2xl text-xs font-mono ring-1 ring-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: data.color }} />
                      <span className="font-semibold text-white">{fullName}</span>
                      {fullName !== data.name && (
                        <span className="text-slate-400 text-[10px]">({data.name})</span>
                      )}
                    </div>
                    <div className="mt-1 text-slate-300">
                      Impact: <span className="text-amber-400 font-bold">{formatUsd(data.value)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Carrier Share: {data.percentage}%
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              stroke="#0f172a"
              strokeWidth={2}
              onMouseEnter={(entry) => setHoveredSlice(entry as CarrierSlice)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              {slices.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="transition-opacity duration-150 cursor-pointer"
                  opacity={hoveredSlice && hoveredSlice.name !== entry.name ? 0.5 : 1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Label - fades out cleanly on hover to eliminate visual collision */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 transition-opacity duration-200 ${
            hoveredSlice ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Exposure</span>
          <span className="text-xs font-mono font-bold text-white">
            {totalCost > 0 ? formatUsd(totalCost) : "Nominal"}
          </span>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
        {slices.map((slice) => {
          const fullName = getFullCarrierName(slice.name);
          return (
            <div key={slice.name} className="flex items-center gap-1.5 truncate" title={`${fullName} (${slice.name})`}>
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-slate-300 font-medium truncate">{fullName}</span>
              <span className="text-slate-400 text-[10px] ml-auto shrink-0">{slice.percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CarrierDonutChart;

