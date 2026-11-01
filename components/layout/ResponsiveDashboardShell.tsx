"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { OCCWorkspace } from "@/components/controls/WorkspaceSwitcher";

export type MobileTab = "ledger" | "audit" | "analytics";
export type DrawerSnap = "peek" | "half" | "full";

export interface DrawerContextValue {
  drawerSnap: DrawerSnap;
  setDrawerSnap: (snap: DrawerSnap) => void;
  cycleDrawerSnap: () => void;
  isLandscapeMobile: boolean;
}

export const DrawerContext = React.createContext<DrawerContextValue>({
  drawerSnap: "half",
  setDrawerSnap: () => {},
  cycleDrawerSnap: () => {},
  isLandscapeMobile: false,
});

export function useDrawer() {
  return React.useContext(DrawerContext);
}

const DEFAULT_SIDEBAR_WIDTH = 360;
const MIN_SIDEBAR_WIDTH = 48; // Thin sliver minimum
const MAX_SIDEBAR_WIDTH = 3000;
const SIDEBAR_STORAGE_KEY = "skyripple_sidebar_width";

export interface ResponsiveDashboardShellProps {
  header?: React.ReactNode;          // Desktop top command bar
  activeWorkspace?: OCCWorkspace;    // Active top-level view: "radar" | "audit" | "analytics"
  onWorkspaceChange?: (workspace: OCCWorkspace) => void;
  // View 1 (Tactical Radar)
  mapSlot: React.ReactNode;          // deck.gl FlightRadar map component
  timelineSlot: React.ReactNode;     // Scrubbable timeline bar with 44px touch targets
  controlsSlot: React.ReactNode;     // PreloadedScenariosSidebar (Rendered in right rail in View 1)
  kpiSummarySlot?: React.ReactNode;  // Compact $145K delta & <20s ticker (HUD pill)
  // View 2 (Explainability & Deterministic Audit)
  auditSlot?: React.ReactNode;       // Centered single-column workspace
  // View 3 (Financial & Carrier Analytics)
  analyticsSlot?: React.ReactNode;   // Standard analytical dashboard grid
  // Backward compatibility / optional
  agentsPanelSlot?: React.ReactNode;
  ledgerPanelSlot?: React.ReactNode;
}

export function ResponsiveDashboardShell({
  header,
  activeWorkspace,
  onWorkspaceChange,
  mapSlot,
  timelineSlot,
  controlsSlot,
  auditSlot,
  analyticsSlot,
  kpiSummarySlot,
}: ResponsiveDashboardShellProps) {
  const [internalWorkspace, setInternalWorkspace] = useState<OCCWorkspace>("radar");
  const currentWorkspace = activeWorkspace ?? internalWorkspace;
  const handleWorkspaceChange = onWorkspaceChange ?? setInternalWorkspace;

  const [activeTab, setActiveTab] = useState<MobileTab>("ledger");
  const [drawerSnap, setDrawerSnap] = useState<DrawerSnap>("half");
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  // Desktop Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_SIDEBAR_WIDTH);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(DEFAULT_SIDEBAR_WIDTH);
  const sidebarWidthRef = useRef<number>(DEFAULT_SIDEBAR_WIDTH);

  // Keep sidebarWidthRef in sync for cleanup/persistence handlers
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Load persisted sidebar width on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(parsed);
        }
      }
    } catch {
      // LocalStorage unavailable in restricted environment
    }
  }, []);

  // Compute maximum permissible sidebar width based on available viewport
  const getMaxAllowedWidth = useCallback(() => {
    if (typeof window === "undefined") return MAX_SIDEBAR_WIDTH;
    return Math.max(MIN_SIDEBAR_WIDTH, window.innerWidth - 80);
  }, []);

  // Pointer drag event handlers for vertical resizer divider
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    setIsDragging(true);
  };

  const handleDoubleClick = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(DEFAULT_SIDEBAR_WIDTH));
    } catch {
      // LocalStorage unavailable
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const maxAllowed = getMaxAllowedWidth();
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSidebarWidth((w) => {
        const next = Math.min(maxAllowed, w + 24);
        try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch {}
        return next;
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSidebarWidth((w) => {
        const next = Math.max(MIN_SIDEBAR_WIDTH, w - 24);
        try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch {}
        return next;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDoubleClick();
    }
  };

  // Global pointer tracking when actively resizing
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = startXRef.current - e.clientX;
      const rawWidth = startWidthRef.current + deltaX;
      const maxAllowed = getMaxAllowedWidth();
      const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxAllowed, rawWidth));
      setSidebarWidth(clamped);
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidthRef.current));
      } catch {
        // LocalStorage unavailable
      }
    };

    const handleWindowBlur = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isDragging, getMaxAllowedWidth]);

  useEffect(() => {
    const checkViewport = () => {
      const isShortLandscape =
        window.innerWidth > window.innerHeight && window.innerHeight <= 540;
      setIsLandscapeMobile(isShortLandscape);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    window.addEventListener("orientationchange", checkViewport);
    return () => {
      window.removeEventListener("resize", checkViewport);
      window.removeEventListener("orientationchange", checkViewport);
    };
  }, []);

  const snapHeightClass: Record<DrawerSnap, string> = {
    peek: "h-[195px]",
    half: "h-[50dvh]",
    full: "h-[85dvh]",
  };

  const mapBottomClass: Record<DrawerSnap, string> = {
    peek: "bottom-[195px]",
    half: "bottom-[50dvh]",
    full: "bottom-[85dvh]",
  };

  const cycleDrawerSnap = () => {
    setDrawerSnap((prev) =>
      prev === "peek" ? "half" : prev === "half" ? "full" : "peek"
    );
  };

  return (
    <DrawerContext.Provider value={{ drawerSnap, setDrawerSnap, cycleDrawerSnap, isLandscapeMobile }}>
      <div className={`relative h-[100dvh] w-screen overflow-hidden bg-page text-aubergine overscroll-none font-sans ${
        isDragging ? "select-none cursor-col-resize" : "select-none"
      }`}>
        {/* =========================================================
            1. DESKTOP LAYOUT (lg: >= 1024px, 3-View Architecture)
           ========================================================= */}
        <div className="hidden lg:flex lg:flex-col lg:h-full lg:w-full overflow-hidden">
          {header}

          {/* VIEW 1: Tactical Radar (Default View) */}
          <div
            id="workspace-panel-radar"
            role="tabpanel"
            aria-labelledby="workspace-tab-radar"
            className={`flex-1 min-h-0 flex flex-row gap-2 p-3 overflow-hidden ${
              currentWorkspace === "radar" ? "" : "hidden"
            }`}
          >
            {/* Main Airspace Stage (Map + FlightDeck Scrubber) */}
            <div
              className={`flex-1 flex flex-col min-w-0 min-h-0 gap-2.5 overflow-hidden transition-all duration-75 ${
                isDragging ? "pointer-events-none" : ""
              }`}
            >
              <div className="flex-1 relative min-h-0 overflow-hidden rounded-md border border-border bg-map-canvas">
                {mapSlot}
              </div>
              <div className="shrink-0">
                {timelineSlot}
              </div>
            </div>

            {/* Draggable Vertical Divider Resizer */}
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="Resize sidebar panel"
              aria-valuenow={sidebarWidth}
              aria-valuemin={MIN_SIDEBAR_WIDTH}
              aria-valuemax={MAX_SIDEBAR_WIDTH}
              title="Drag to resize sidebar • Double-click to reset"
              onPointerDown={handlePointerDown}
              onDoubleClick={handleDoubleClick}
              onKeyDown={handleKeyDown}
              className={`group relative w-2 shrink-0 cursor-col-resize select-none touch-none flex items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 ${
                isDragging
                  ? "bg-slate-800/90"
                  : "hover:bg-slate-800/60 active:bg-slate-800"
              }`}
            >
              {/* Subtle visual vertical grip indicator */}
              <div
                className={`w-0.5 rounded-full transition-all duration-150 ${
                  isDragging
                    ? "h-16 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]"
                    : "h-8 bg-slate-700 group-hover:h-12 group-hover:bg-slate-400 group-hover:shadow-[0_0_6px_rgba(148,163,184,0.4)]"
                }`}
              />
            </div>

            {/* Right Rail: Preloaded Scenarios Sidebar */}
            <aside
              style={{ width: `${sidebarWidth}px` }}
              className="shrink-0 overflow-y-auto min-h-0 rounded-md pr-1 transition-all duration-75"
            >
              {controlsSlot}
            </aside>
          </div>

          {/* VIEW 2: Financial & Carrier Analytics (12-Col Bento Grid) */}
          {currentWorkspace === "analytics" && (
            <div
              id="workspace-panel-analytics"
              role="tabpanel"
              aria-labelledby="workspace-tab-analytics"
              className="flex-1 min-h-0 overflow-y-auto bg-page px-4 sm:px-6 py-6"
            >
              <div className="max-w-[1720px] w-full mx-auto pb-12 animate-in fade-in duration-150">
                {analyticsSlot}
              </div>
            </div>
          )}

          {/* VIEW 3: Explainability & Deterministic Audit (Two-Column Engine Room) */}
          {currentWorkspace === "audit" && (
            <div
              id="workspace-panel-audit"
              role="tabpanel"
              aria-labelledby="workspace-tab-audit"
              className="flex-1 min-h-0 overflow-y-auto bg-page px-4 sm:px-6 py-6"
            >
              <div className="max-w-[1720px] w-full mx-auto pb-12 animate-in fade-in duration-150">
                {auditSlot}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            2. MOBILE & TABLET ADAPTIVE SHELL (< 1024px)
           ========================================================= */}
        <div className="lg:hidden h-full w-full">
          {isLandscapeMobile ? (
            /* --- MOBILE LANDSCAPE: 60/40 SPLIT COMMAND CENTER --- */
            <div className="grid grid-cols-12 h-[100dvh] w-screen overflow-hidden">
              <div className="col-span-7 relative h-full w-full overflow-hidden">
                <div className="absolute inset-0">
                  {mapSlot}
                </div>
                <div
                  className="absolute bottom-2 left-2 right-2 z-20 bg-slate-900/90 backdrop-blur-md rounded-xl p-2 border border-slate-800 shadow-xl"
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {timelineSlot}
                </div>
              </div>

              <div
                className="col-span-5 h-full flex flex-col bg-slate-900/95 border-l border-slate-800 overflow-hidden"
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-slate-800 shrink-0">
                  {kpiSummarySlot}
                </div>

                <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-950/80 border-b border-slate-800 shrink-0 text-xs font-mono font-medium">
                  {(["ledger", "analytics", "audit"] as MobileTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        handleWorkspaceChange(tab === "ledger" ? "radar" : tab);
                      }}
                      className={`py-1.5 rounded-lg capitalize transition text-center min-h-[38px] ${
                        activeTab === tab
                          ? "bg-blue-900/30 text-blue-400 border border-blue-700/50 shadow-sm font-semibold"
                          : "text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-transparent"
                      }`}
                    >
                      {tab === "ledger" ? "Scenarios" : tab === "analytics" ? "Analytics" : "Audit"}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {activeTab === "ledger" && controlsSlot}
                  {activeTab === "analytics" && analyticsSlot}
                  {activeTab === "audit" && auditSlot}
                </div>
              </div>
            </div>
          ) : (
            /* --- MOBILE PORTRAIT: FULL-BLEED MAP + BOTTOM SHEET --- */
            <div className="relative h-[100dvh] w-screen overflow-hidden">
              <div
                className={`fixed inset-x-0 top-0 z-0 transition-all duration-300 ease-out ${mapBottomClass[drawerSnap]}`}
              >
                {mapSlot}
              </div>

              <div
                className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-3 right-3 z-20 pointer-events-auto"
                onTouchStart={(e) => e.stopPropagation()}
              >
                {kpiSummarySlot}
              </div>

              <div
                className={`fixed bottom-0 left-0 right-0 z-30 flex flex-col bg-slate-900/95 backdrop-blur-2xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl transition-all duration-300 ease-out ${snapHeightClass[drawerSnap]}`}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="px-3 pt-2 pb-2 border-b border-slate-800/80 shrink-0">
                  <button
                    type="button"
                    onClick={cycleDrawerSnap}
                    aria-label="Cycle drawer height (peek, half, full)"
                    className="w-full flex flex-col items-center pb-1.5 cursor-pointer touch-manipulation"
                  >
                    <span className="w-12 h-1.5 bg-slate-600 hover:bg-slate-400 rounded-full transition-colors" />
                  </button>
                  {timelineSlot}
                </div>

                <div className="grid grid-cols-3 gap-1.5 px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("ledger");
                      handleWorkspaceChange("radar");
                      if (drawerSnap === "peek") setDrawerSnap("half");
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-mono transition flex items-center justify-center ${
                      activeTab === "ledger"
                        ? "bg-blue-900/30 text-blue-400 border border-blue-700/50 shadow-sm font-semibold"
                        : "text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    Scenarios
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("analytics");
                      handleWorkspaceChange("analytics");
                      if (drawerSnap === "peek") setDrawerSnap("half");
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-mono transition flex items-center justify-center ${
                      activeTab === "analytics"
                        ? "bg-blue-900/30 text-blue-400 border border-blue-700/50 shadow-sm font-semibold"
                        : "text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("audit");
                      handleWorkspaceChange("audit");
                      if (drawerSnap === "peek") setDrawerSnap("half");
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-mono transition flex items-center justify-center ${
                      activeTab === "audit"
                        ? "bg-blue-900/30 text-blue-400 border border-blue-700/50 shadow-sm font-semibold"
                        : "text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    Audit
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {activeTab === "ledger" && controlsSlot}
                  {activeTab === "analytics" && analyticsSlot}
                  {activeTab === "audit" && auditSlot}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DrawerContext.Provider>
  );
}

export default ResponsiveDashboardShell;
