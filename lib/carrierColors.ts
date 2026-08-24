/**
 * The 14-color categorical palette from the design reference v2, 
 * "tuned for white bg" (its own words), swapped in wholesale from v1's
 * dark-background set. Deliberately cool/neutral, no saturated red or
 * gold, so an airline line is never mistaken for a severity or cost
 * signal (those live on separate red/gold/severity scales),  never
 * recolor or reassign these per the design system's own rule.
 *
 * Carrier codes vary per scenario, so colors are assigned by POSITION in a
 * sorted carrier list, not hardcoded per airline (e.g. "AA is always
 * blue"),  that keeps this working for any scenario without a lookup
 * table to maintain, at the cost of a carrier's color shifting if the set
 * of carriers present changes between scenarios. Good enough for a
 * single-scenario dashboard; a stable global registry would be the next
 * step if the app grows to compare scenarios side by side.
 */
export const CARRIER_PALETTE = [
  "#2D6CB5",
  "#1F8A82",
  "#7A5EA6",
  "#3E9E6E",
  "#B5537A",
  "#4A93D1",
  "#6B9A3C",
  "#9B6FC9",
  "#2A9D9A",
  "#C25E8A",
  "#4C7DB8",
  "#5FA35A",
  "#8B5E9E",
  "#7C7266",
] as const;

/** Deterministic carrier -> color map for a given (sorted) carrier list. */
export function assignCarrierColors(carrierCodes: string[]): Record<string, string> {
  const sorted = [...carrierCodes].sort();
  const colors: Record<string, string> = {};
  sorted.forEach((code, i) => {
    colors[code] = CARRIER_PALETTE[i % CARRIER_PALETTE.length];
  });
  return colors;
}
