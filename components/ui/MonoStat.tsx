/** A single tabular-nums figure with a label,  for counts/minutes that
 * don't carry a low/high range (use RangeValue for those instead). */
export function MonoStat({ label, value, tone = "aubergine" }: { label: string; value: string; tone?: "aubergine" | "muted" }) {
  return (
    <div>
      <div className={`font-mono tabular-nums text-xl font-medium ${tone === "aubergine" ? "text-aubergine" : "text-muted"}`}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
