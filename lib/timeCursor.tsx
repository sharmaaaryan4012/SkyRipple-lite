"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface TimeCursorValue {
  currentMinute: number;
  minMinute: number;
  maxMinute: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setMinute: (min: number) => void;
  /** A multiplier on the base playbackRateMinPerSec -- e.g. 2 plays at
   * 2x speed. Added for Task 3's speed control; USMap never reads this
   * (it only reads currentMinute), so adding it here doesn't touch the
   * map at all -- exactly the additive-only extension the seam was
   * designed for. */
  speedMultiplier: number;
  setSpeedMultiplier: (multiplier: number) => void;
}

/**
 * The sim-time cursor the map animates against. Task 2 shipped a
 * MINIMAL control (a play/pause + one setMinute); Task 3 built the real
 * date+clock/timeline control and, per the plan below, moved THIS
 * PROVIDER up (see components/ControlRoomApp.tsx) to wrap both the
 * `controls` and `map` grid areas instead of living inside MapPanel, 
 * exactly the anticipated move, done without changing USMap.tsx or
 * this file's existing contract at all (speedMultiplier above is a
 * pure addition). The point of putting this in a context rather than
 * local state inside the map component: any control that calls
 * useTimeCursor() drives the SAME cursor USMap already consumes,
 * without USMap ever needing to know the control exists.
 */
const TimeCursorContext = createContext<TimeCursorValue | null>(null);

// React state updates are throttled to this interval rather than driven
// every requestAnimationFrame (~16ms),  at ~17.8K flights, recomputing
// deck.gl's accessor functions on every single frame is unnecessary CPU
// work for a "minimal" cursor. deck.gl's own `transitions` prop (see
// components/map/USMap.tsx) smoothly interpolates arc positions/colors
// BETWEEN these updates, so motion still reads as continuous even though
// React itself only re-renders ~10x/second.
const COMMIT_INTERVAL_MS = 120;

export function TimeCursorProvider({
  minMinute,
  maxMinute,
  playbackRateMinPerSec = 24, // ~24 sim-minutes per real second -> a ~48h (2880min) day plays in ~2 minutes
  children,
}: {
  minMinute: number;
  maxMinute: number;
  playbackRateMinPerSec?: number;
  children: React.ReactNode;
}) {
  const [currentMinute, setCurrentMinute] = useState(minMinute);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number | null>(null);
  const lastCommitTsRef = useRef<number>(0);
  const minuteRef = useRef(minMinute); // avoids stale-closure reads inside the RAF loop
  const speedRef = useRef(speedMultiplier); // read live inside the RAF loop without restarting it on every speed change

  useEffect(() => {
    minuteRef.current = currentMinute;
  }, [currentMinute]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameTsRef.current = null;
      return;
    }

    function tick(ts: number) {
      if (lastFrameTsRef.current === null) lastFrameTsRef.current = ts;
      const dtSec = (ts - lastFrameTsRef.current) / 1000;
      lastFrameTsRef.current = ts;

      const next = minuteRef.current + dtSec * playbackRateMinPerSec * speedRef.current;
      minuteRef.current = next >= maxMinute ? maxMinute : next;

      if (ts - lastCommitTsRef.current >= COMMIT_INTERVAL_MS || minuteRef.current >= maxMinute) {
        lastCommitTsRef.current = ts;
        setCurrentMinute(minuteRef.current);
      }

      if (minuteRef.current >= maxMinute) {
        setIsPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, maxMinute, playbackRateMinPerSec]);

  const play = useCallback(() => {
    // Restart from the beginning once the cursor has run to the end,
    // rather than a no-op "play" that sits at maxMinute forever.
    if (minuteRef.current >= maxMinute) {
      minuteRef.current = minMinute;
      setCurrentMinute(minMinute);
    }
    setIsPlaying(true);
  }, [minMinute, maxMinute]);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);
  const setMinute = useCallback(
    (min: number) => {
      const clamped = Math.min(maxMinute, Math.max(minMinute, min));
      minuteRef.current = clamped;
      setCurrentMinute(clamped);
    },
    [minMinute, maxMinute]
  );

  const value = useMemo<TimeCursorValue>(
    () => ({ currentMinute, minMinute, maxMinute, isPlaying, play, pause, toggle, setMinute, speedMultiplier, setSpeedMultiplier }),
    [currentMinute, minMinute, maxMinute, isPlaying, play, pause, toggle, setMinute, speedMultiplier]
  );

  return <TimeCursorContext.Provider value={value}>{children}</TimeCursorContext.Provider>;
}

export function useTimeCursor(): TimeCursorValue {
  const ctx = useContext(TimeCursorContext);
  if (!ctx) throw new Error("useTimeCursor must be called within a TimeCursorProvider");
  return ctx;
}
