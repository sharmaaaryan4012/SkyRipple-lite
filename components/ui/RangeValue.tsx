import { formatUsd } from "@/lib/format";

export type ValueTone = "neutral" | "gold" | "negative" | "muted" | "aubergine" | "red";

const TONE_CLASS: Record<ValueTone, string> = {
  // Financial UI Principle: General ledger figures and operational costs are
  // neutral data values (text-white/slate-100), not errors or alerts.
  // "gold" is reserved for recovered value / savings / highlights (#C5A059).
  // "negative" / "red" is reserved strictly for net loss / critical failure.
  neutral: "text-white",
  gold: "text-gold",
  negative: "text-red-soft",
  aubergine: "text-aubergine",
  muted: "text-muted",
  red: "text-red-soft", // backward-compatible alias for explicit alerts
};

/**
 * The one place low/typical/high rendering is decided, so every dollar
 * figure in the app looks the same: the typical value prominent and
 * mono, the low–high range always visible underneath in smaller muted
 * mono,  "ranges everywhere," not hidden behind a hover a screen-reader
 * or a screenshot would miss.
 */
export function RangeValue({
  low,
  typical,
  high,
  tone = "neutral",
  size = "lg",
}: {
  low: number;
  typical: number;
  high: number;
  tone?: ValueTone;
  size?: "lg" | "base" | "sm";
}) {
  const sizeClass = size === "lg" ? "text-xl" : size === "base" ? "text-base" : "text-sm";
  return (
    <div>
      <div className={`font-mono tabular-nums font-medium ${sizeClass} ${TONE_CLASS[tone]}`}>{formatUsd(typical)}</div>
      <div className="font-mono tabular-nums text-xs text-muted mt-0.5">
        {formatUsd(low)} &ndash; {formatUsd(high)}
      </div>
    </div>
  );
}
