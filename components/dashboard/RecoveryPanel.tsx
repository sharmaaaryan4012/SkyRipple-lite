"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RecoveryReveal } from "./RecoveryReveal";
import { startRecovery, pollRecoveryStatus, BackendUnreachableError, type RecoveryResult } from "@/lib/backendClient";
import type { RecoveryView } from "@/lib/recoveryView";
import type { BackendDisruptionRequest } from "@/lib/types";

const POLL_INTERVAL_MS = 2000;

type JobState = "idle" | "starting" | "queued" | "running" | "done" | "error";

/**
 * The "Compute Recovery" button + progress mechanism (Task 5c), now
 * extended (the before/after finale) to render the reveal once the job
 * completes. Wires the REAL /api/recovery job (POST starts it, GET polls
 * state/progress); this panel itself only tracks job lifecycle and hands
 * the raw done result up via `onDone`,  ControlRoomApp turns that into a
 * RecoveryView (lib/recoveryView.ts, pure arithmetic over the two
 * already-finished recordings, never a re-simulation) and hands it back
 * down as `view`, which is what actually renders here AND drives the map
 * toggle / cost overlay elsewhere. This split exists because the same
 * RecoveryView is needed in three places (this panel, MapPanel,
 * Dashboard),  computing it once at the parent avoids three redundant
 * derivations of the same numbers.
 *
 * Keyed by the parent (ControlRoomApp passes `key={activeKey}`) so
 * switching the active scenario remounts this panel fresh, rather than
 * showing a stale progress bar/result from a previous scenario.
 *
 * `disruptions === null` means this active scenario's originating
 * disruption(s) aren't known (a precomputed showcase entry with no
 * lib/scenarioRegistry.ts mapping),  the button disables itself with an
 * honest note rather than guessing what to recover.
 */
export function RecoveryPanel({
  day,
  disruptions,
  view,
  onDone,
}: {
  day: string;
  disruptions: BackendDisruptionRequest[] | null;
  /** The parent's already-computed RecoveryView for THIS job's result,
   * once done -- see this component's own docstring for why the parent
   * (not this panel) owns that derivation. */
  view: RecoveryView | null;
  onDone?: (result: RecoveryResult) => void;
}) {
  const [state, setState] = useState<JobState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  function schedulePoll(jobId: string) {
    pollTimerRef.current = setTimeout(async () => {
      if (cancelledRef.current) return;
      try {
        const status = await pollRecoveryStatus(jobId);
        if (cancelledRef.current) return;
        setProgress(status.progress);
        setMessage(status.message);
        if (status.state === "done" && status.result) {
          setState("done");
          onDone?.(status.result);
          return;
        }
        if (status.state === "error") {
          setState("error");
          setErrorText(status.error ?? "recovery job failed");
          return;
        }
        setState(status.state);
        schedulePoll(jobId);
      } catch (err) {
        if (cancelledRef.current) return;
        setState("error");
        setErrorText(err instanceof BackendUnreachableError ? err.message : "lost contact with the recovery job");
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleClick() {
    if (!disruptions) return;
    setState("starting");
    setErrorText(null);
    setProgress(0);
    setMessage("Starting the recovery job…");
    try {
      const { jobId } = await startRecovery(day, disruptions);
      setState("queued");
      schedulePoll(jobId);
    } catch (err) {
      setState("error");
      setErrorText(err instanceof Error ? err.message : "failed to start recovery");
    }
  }

  const running = state === "starting" || state === "queued" || state === "running";

  return (
    <Panel eyebrow="OCC recovery" title="Compute recovery">
      {state === "idle" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">
            Runs the real 5-role recovery orchestrator against this scenario&rsquo;s disruption(s). Headline scenarios take roughly 25 minutes,  this
            starts a background job and tracks its progress here.
          </p>
          <button
            onClick={handleClick}
            disabled={!disruptions}
            className="self-start border border-border rounded px-3 py-1.5 text-xs text-aubergine hover:bg-elevated state-transition disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Compute recovery
          </button>
          {!disruptions && <p className="text-xs text-muted">Recovery isn&rsquo;t available for this scenario,  its originating disruption isn&rsquo;t known.</p>}
        </div>
      )}

      {running && (
        <div className="flex flex-col gap-2">
          <ProgressBar progress={progress} label={message || "Working…"} />
          <p className="text-xs text-muted">This can take several minutes for a full recovery run,  feel free to keep using the app while it runs.</p>
        </div>
      )}

      {state === "done" && view && <RecoveryReveal view={view} />}

      {state === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-red-soft text-xs">{errorText ?? "Recovery failed."}</p>
          <button
            onClick={handleClick}
            disabled={!disruptions}
            className="self-start border border-border rounded px-3 py-1.5 text-xs text-aubergine hover:bg-elevated state-transition"
          >
            Retry
          </button>
        </div>
      )}
    </Panel>
  );
}
