"use client";

import { useInspectorMode } from "@/lib/inspectorMode";

/**
 * Inspector Mode (Task 8f): a small, out-of-the-way dev toggle -- OFF by
 * default. Flipping it does nothing but gate the Rotation/Crew tabs on
 * the flight click panel (MapDetailPanel.tsx); it never changes what
 * data is loaded or computed (byte-identical network traffic either
 * way).
 */
export function InspectorModeToggle() {
  const { enabled, setEnabled } = useInspectorMode();

  return (
    <label className="flex items-center justify-between gap-2 px-1 cursor-pointer select-none" data-testid="inspector-mode-toggle">
      <span className="text-xs text-aubergine-soft">Inspector mode</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={`relative w-8 h-[18px] rounded-full state-transition shrink-0 ${enabled ? "bg-gold" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-surface state-transition ${enabled ? "left-4" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
