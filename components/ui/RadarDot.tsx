"use client";

import { useRadarSyncDelay } from "@/lib/radarSync";

export interface RadarDotProps {
  size?: "xs" | "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

/**
 * Reusable pulse beacon synchronized with the airport radar bleep on the map.
 * Renders a solid persistent core and an expanding, dissipating outer wave.
 */
export function RadarDot({
  size = "md",
  color = "#EF4444",
  className = "",
}: RadarDotProps) {
  const syncDelay = useRadarSyncDelay();

  const sizeMap = {
    xs: { container: "w-1.5 h-1.5", core: "w-1.5 h-1.5" },
    sm: { container: "w-2 h-2", core: "w-2 h-2" },
    md: { container: "w-2.5 h-2.5", core: "w-2.5 h-2.5" },
    lg: { container: "w-3 h-3", core: "w-3 h-3" },
  };

  const { container, core } = sizeMap[size];

  return (
    <span className={`relative flex items-center justify-center shrink-0 ${container} ${className}`}>
      {/* Expanding Radar Ping Ring */}
      <span
        className="animate-radar-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{
          backgroundColor: color,
          animationDelay: syncDelay,
        }}
      />
      {/* Solid Radar Core */}
      <span
        className={`relative inline-flex rounded-full ${core}`}
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

