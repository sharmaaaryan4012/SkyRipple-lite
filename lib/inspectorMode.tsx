"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "skyripple:inspectorMode";

export interface InspectorModeContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const InspectorModeContext = createContext<InspectorModeContextValue | null>(null);

/**
 * Inspector Mode (Task 8f): a dev-mode toggle, OFF by default, gating the
 * Rotation/Crew tabs on the flight click panel (see MapDetailPanel.tsx).
 * Nothing else in the app reads this -- it does NOT gate the always-
 * visible data-provenance line (see DataProvenanceLine.tsx), which stays
 * visible regardless, per this task's own "always-visible, non-gated"
 * requirement.
 *
 * Persisted to localStorage so a reload doesn't silently reset a
 * developer's own toggle mid-session; wrapped in try/catch since
 * localStorage can throw (private browsing, disabled storage) -- a
 * throw here must never crash the app, it just means the toggle doesn't
 * persist for that session, still defaulting OFF.
 */
export function InspectorModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    try {
      setEnabledState(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore -- stays default-off
    }
  }, []);

  function setEnabled(next: boolean) {
    setEnabledState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore -- in-memory state still updates for this session
    }
  }

  return <InspectorModeContext.Provider value={{ enabled, setEnabled }}>{children}</InspectorModeContext.Provider>;
}

export function useInspectorMode(): InspectorModeContextValue {
  const ctx = useContext(InspectorModeContext);
  if (!ctx) throw new Error("useInspectorMode must be called within an InspectorModeProvider");
  return ctx;
}
