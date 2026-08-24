"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates 0 -> target once `active` flips true, with decelerating (not
 * springy -- a DOLLAR FIGURE overshooting its own target and settling
 * back down would read as a glitch, not a reveal) easing. Hand-rolled
 * requestAnimationFrame, no animation library -- matches
 * components/map/USMap.tsx's own usePulse() precedent, the only other
 * timed animation in this app. Used ONLY by the recovery reveal
 * (RecoveryPanel.tsx) -- the one place in the app a number counts up
 * instead of just appearing; the springy overshoot lives on the gold
 * saving-area's CSS transition instead (duration-reveal / ease-spring,
 * see tailwind.config.ts), not here.
 */
export function useCountUp(target: number, durationMs: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(target * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `active`'s false->true edge is the intentional (one-shot) re-trigger; target/durationMs are fixed for the life of one reveal
  }, [active]);

  return value;
}
