import type { SeverityBucket } from "./types";

/**
 * Severity -> color, using the design system's own severity gradient
 * (see tailwind.config.ts's `sev` tokens, and design reference v2's
 * "Delay-severity gradient",  on-time/minor/moderate/severe values
 * copied verbatim from there). The THRESHOLDS that produced each
 * flight's severity bucket live server-side only (scripts/
 * export_frontend_scenario.py's SEVERITY_THRESHOLDS_MIN),  the frontend
 * never recomputes a severity from a delay figure, it just colors
 * whatever bucket the export already assigned, so there's exactly one
 * place a delay-minute is turned into a bucket.
 *
 * `cancelled` and `unresolved` are NOT on the on-time -> severe gradient
 * (cancellation/non-resolution isn't a "how late" concept),  they get
 * their own distinct, muted treatment so they read as "different kind
 * of outcome," not "off the end of the delay scale." Not in the v2
 * reference's own gradient (it only shows 4 buckets), so chosen to
 * preserve the SAME role each had in v1: cancelled stays a categorical
 * blue off the red/gold/severity axis (the first of v2's own
 * white-bg-tuned categorical airline colors); unresolved stays the
 * "muted, non-alarming" treatment (v2's own `--muted` token value).
 */
export const SEVERITY_COLORS: Record<SeverityBucket, string> = {
  on_time: "#94A3B8",
  minor: "#C5A059",
  moderate: "#F59E0B",
  severe: "#EF4444",
  cancelled: "#3B82F6",
  unresolved: "#64748B",
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** deck.gl layers want [r, g, b] (0-255), not CSS hex strings. */
export const SEVERITY_COLORS_RGB: Record<SeverityBucket, [number, number, number]> = Object.fromEntries(
  Object.entries(SEVERITY_COLORS).map(([k, v]) => [k, hexToRgb(v)])
) as Record<SeverityBucket, [number, number, number]>;

export const SEVERITY_LABELS: Record<SeverityBucket, string> = {
  on_time: "On-time",
  minor: "Minor delay",
  moderate: "Moderate delay",
  severe: "Severe delay",
  cancelled: "Cancelled",
  unresolved: "Unresolved",
};
