import { formatUsd } from "@/lib/format";

export type ValueTone = "red" | "gold" | "aubergine" | "muted";

const TONE_CLASS: Record<ValueTone, string> = {
  // red = disrupted/cost, gold = recovered/value,  see the design
  // system's semantic-color rule. This task only ever renders cost
  // figures, so "gold" is unused today but kept for when the later
  // with/without-recovery comparison introduces recovered-value numbers.
  // Uses `gold-deep`, NOT `gold` -- the v2 reference is explicit that
  // plain gold (#C79A3F) is for fills/CTAs only and fails contrast as
  // text on the new white/off-white surfaces; gold-deep (#9A7420) is
  // its documented text-safe exception.
  red: "text-red-soft",
  gold: "text-gold-deep",
  aubergine: "text-aubergine",
  muted: "text-muted",
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
  tone = "aubergine",
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
