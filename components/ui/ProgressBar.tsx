/**
 * A quiet, hairline-bordered progress indicator,  no glass/blur/shadow,
 * 300ms state-transition on the fill width (see globals.css's
 * .state-transition). Used for the recovery job's REAL 0..1 progress
 * value (see api/recovery_job.py,  time-estimated but genuinely driven by
 * a running background thread, not fake). Fill uses `aubergine-soft`,
 * the design system's quiet structural accent,  deliberately NOT gold
 * (gold is reserved for recovered/value, arriving with the before/after
 * comparison view next task) and not red (nothing here is a disruption).
 */
export function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div>
      {label && <p className="font-mono text-xs text-muted mb-1.5">{label}</p>}
      <div className="h-1.5 w-full bg-elevated border border-border rounded-full overflow-hidden">
        <div className="h-full bg-aubergine-soft state-transition" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
