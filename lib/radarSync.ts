"use client";

import { useMemo } from "react";

export const RADAR_PERIOD_MS = 2200;

/**
 * Returns a negative animation-delay string (e.g. "-1420ms") based on
 * performance.now() % 2200. This guarantees that any CSS animation with a 2.2s
 * duration immediately locks into exact phase synchronization with the
 * performance.now() clock driving Deck.gl airport radar rings in USMap.tsx.
 */
export function getRadarSyncDelay(): string {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return "0ms";
  }
  const elapsed = Math.round(performance.now() % RADAR_PERIOD_MS);
  return `-${elapsed}ms`;
}

/**
 * Hook returning the negative animation-delay string to lock CSS animations
 * into global phase synchronization with USMap's airport pulse.
 */
export function useRadarSyncDelay(): string {
  return useMemo(() => getRadarSyncDelay(), []);
}

