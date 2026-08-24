"use client";

import type { RecoveryView } from "@/lib/recoveryView";
import { formatUsd, formatCount, formatMinutes, humanizeActionType } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";

const ACTION_LIST_CAP = 30;

/**
 * The before/after recovery view's headline block: the gold saving
 * figure (counted up, the one non-instant reveal outside the chart's own
 * gold fill), the operational before->after deltas, and the arbitration
 * action list -- the proof the OCC did real, specific things. Renders
 * inside RecoveryPanel.tsx once a recovery result exists; everything
 * here reads straight off the already-computed RecoveryView (see
 * lib/recoveryView.ts) -- no re-simulation, no re-derivation.
 *
 * HONESTY GUARDRAIL: `noBenefit` below is the ONLY branch,  a real
 * $0/near-$0 recovery (the Duty Manager correctly finding nothing worth
 * doing) renders a plain, honest note instead of forcing a gold headline
 * over a null result.
 */
export function RecoveryReveal({ view }: { view: RecoveryView }) {
  const { recoverySaving, actionsTaken, conflictsDetected, recoveryActions, beforeImpact, afterImpact } = view;
  const noBenefit = actionsTaken === 0 || recoverySaving.typical <= 0;

  // Fires once: this component only ever exists (mounts) once a recovery
  // result has just arrived (see ControlRoomApp.tsx's `{recovery && ...}`
  // gating),  so `active=true` from the first render IS "the reveal
  // moment," and the count-up runs exactly once per completed recovery.
  const countedSaving = useCountUp(recoverySaving.typical, 900, !noBenefit);

  if (noBenefit) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-aubergine">Recovery found no net-beneficial actions for this disruption,  no-recovery was already optimal.</p>
        <p className="text-xs text-muted">
          {actionsTaken} action(s) taken, {conflictsDetected} conflict(s) detected. The agents observed the cascade and determined no available
          move (swap, reserve callout, gate reassignment, rebooking, delay hold) would have reduced cost.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted mb-1">Recovery complete,  saved</p>
        <div className="font-mono tabular-nums font-medium text-2xl text-gold-deep">{formatUsd(countedSaving)}</div>
        <div className="font-mono tabular-nums text-xs text-muted mt-0.5">
          {formatUsd(recoverySaving.low)} &ndash; {formatUsd(recoverySaving.high)}
        </div>
        <p className="text-xs text-muted mt-1.5">
          {actionsTaken} action(s) taken, {conflictsDetected} conflict(s) detected and arbitrated.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <DeltaRow label="Delay" before={formatMinutes(beforeImpact.totalDelayMin)} after={formatMinutes(afterImpact.totalDelayMin)} />
        <DeltaRow label="Cancellations" before={formatCount(beforeImpact.flightsCancelled)} after={formatCount(afterImpact.flightsCancelled)} />
        <DeltaRow label="Misconnections" before={formatCount(beforeImpact.passengersMisconnected)} after={formatCount(afterImpact.passengersMisconnected)} />
        <DeltaRow
          label="Passengers helped"
          before={formatCount(0)}
          after={formatCount(Math.max(0, beforeImpact.passengersMisconnected - afterImpact.passengersMisconnected))}
        />
      </div>

      {recoveryActions.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">What the OCC did</p>
          <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {recoveryActions.slice(0, ACTION_LIST_CAP).map((a) => (
              <li key={a.actionId} className="text-xs">
                <p className="text-aubergine">
                  <span className="font-mono text-aubergine-soft">{humanizeActionType(a.actionType)}</span>
                  {a.affectedIds.length > 0 && <span className="font-mono text-muted"> &middot; {a.affectedIds.join(" → ")}</span>}
                </p>
                {a.rationale && <p className="text-muted mt-0.5">{a.rationale}</p>}
              </li>
            ))}
          </ul>
          {recoveryActions.length > ACTION_LIST_CAP && (
            <p className="text-xs text-muted mt-2">and {recoveryActions.length - ACTION_LIST_CAP} more action(s)</p>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className="font-mono tabular-nums text-sm text-aubergine">
        <span className="text-muted">{before}</span> <span className="text-aubergine-soft">&rarr;</span> <span className="text-gold-deep font-medium">{after}</span>
      </p>
    </div>
  );
}
