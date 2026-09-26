"use client";

import React, { useState, useEffect } from "react";

export type MobileTab = "agents" | "ledger" | "controls";
export type DrawerSnap = "peek" | "half" | "full";

export interface ResponsiveDashboardShellProps {
  header?: React.ReactNode;          // Desktop top command bar
  mapSlot: React.ReactNode;          // deck.gl FlightRadar map component
  timelineSlot: React.ReactNode;     // Scrubbable timeline bar with 44px touch targets
  kpiSummarySlot: React.ReactNode;   // Compact $172K delta & <20s ticker (HUD pill)
  agentsPanelSlot: React.ReactNode;  // 5-Agent arbitration feed (Aircraft, Crew, Pax, Gate, Duty Mgr)
  ledgerPanelSlot: React.ReactNode;  // Full deterministic cost validation ledger
  controlsSlot: React.ReactNode;     // Scenario selector & simulation triggers
}

export function ResponsiveDashboardShell({
  header,
  mapSlot,
  timelineSlot,
  kpiSummarySlot,
  agentsPanelSlot,
  ledgerPanelSlot,
  controlsSlot,
}: ResponsiveDashboardShellProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("agents");
  const [drawerSnap, setDrawerSnap] = useState<DrawerSnap>("half");
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

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
    peek: "h-[16dvh]",
    half: "h-[46dvh]",
    full: "h-[82dvh]",
  };

  const cycleDrawerSnap = () => {
    setDrawerSnap((prev) =>
      prev === "peek" ? "half" : prev === "half" ? "full" : "peek"
    );
  };

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-page text-aubergine select-none overscroll-none font-sans">
      {/* =========================================================
          1. DESKTOP LAYOUT (lg: >= 1024px, full multi-panel)
         ========================================================= */}
      <div className="hidden lg:flex lg:flex-col lg:h-full lg:w-full overflow-hidden">
        {header}
        <div className="flex-1 min-h-0 flex flex-row gap-3 p-3 overflow-hidden">
          {/* Main Airspace Stage (Map + FlightDeck Scrubber) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-2.5 overflow-hidden">
            <div className="flex-1 relative min-h-0 overflow-hidden rounded-md border border-border bg-map-canvas">
              {mapSlot}
            </div>
            <div className="shrink-0">
              {timelineSlot}
            </div>
          </div>

          {/* Right Rail: 5-Agent Arbitration + Impact Ledger */}
          <aside className="w-[410px] xl:w-[440px] shrink-0 overflow-y-auto min-h-0 rounded-md space-y-3.5 pr-1">
            {controlsSlot}
            {agentsPanelSlot}
            {ledgerPanelSlot}
          </aside>
        </div>
      </div>

      {/* =========================================================
          2. MOBILE & TABLET ADAPTIVE SHELL (< 1024px)
         ========================================================= */}
      <div className="lg:hidden h-full w-full">
        {isLandscapeMobile ? (
          /* --- MOBILE LANDSCAPE: 60/40 SPLIT COMMAND CENTER --- */
          <div className="grid grid-cols-12 h-[100dvh] w-screen overflow-hidden">
            {/* Left 7 Cols: Interactive Map + Compact Bottom Scrubber */}
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

            {/* Right 5 Cols: Full-Height Scrollable HUD & Tabs */}
            <div
              className="col-span-5 h-full flex flex-col bg-slate-900/95 border-l border-slate-800 overflow-hidden"
              onTouchStart={(e) => e.stopPropagation()}
            >
              {/* Compact Cost Ledger / KPI Header */}
              <div className="px-3 py-2 border-b border-slate-800 shrink-0">
                {kpiSummarySlot}
              </div>

              {/* Segmented Mobile Landscape Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-950/70 border-b border-slate-800 shrink-0 text-xs font-mono font-medium">
                {(["agents", "ledger", "controls"] as MobileTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-1.5 rounded-lg capitalize transition text-center min-h-[38px] ${
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow font-bold"
                        : "text-slate-400 hover:text-slate-200 bg-slate-900/60"
                    }`}
                  >
                    {tab === "agents" ? "5 Agents" : tab === "ledger" ? "Ledger ($)" : "Sim"}
                  </button>
                ))}
              </div>

              {/* Scrollable Tab Interior */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {activeTab === "agents" && agentsPanelSlot}
                {activeTab === "ledger" && ledgerPanelSlot}
                {activeTab === "controls" && controlsSlot}
              </div>
            </div>
          </div>
        ) : (
          /* --- MOBILE PORTRAIT: FULL-BLEED MAP + BOTTOM SHEET --- */
          <div className="relative h-[100dvh] w-screen overflow-hidden">
            {/* Background Map Layer */}
            <div className="fixed inset-0 z-0">
              {mapSlot}
            </div>

            {/* Top Floating KPI Pill */}
            <div
              className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-3 right-3 z-20 pointer-events-auto"
              onTouchStart={(e) => e.stopPropagation()}
            >
              {kpiSummarySlot}
            </div>

            {/* Bottom Sheet + Docked Thumb Timeline */}
            <div
              className={`fixed bottom-0 left-0 right-0 z-30 flex flex-col bg-slate-900/95 backdrop-blur-2xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl transition-all duration-300 ease-out ${snapHeightClass[drawerSnap]}`}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {/* Drag Handle & Scrubbable Timeline docked right at top of sheet */}
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

              {/* Touch-Friendly 44px Segmented Tab Bar */}
              <div className="grid grid-cols-3 gap-1.5 px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("agents");
                    if (drawerSnap === "peek") setDrawerSnap("half");
                  }}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold font-mono transition flex items-center justify-center ${
                    activeTab === "agents"
                      ? "bg-blue-600 text-white shadow-md font-bold"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  5-Agent Feed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ledger");
                    if (drawerSnap === "peek") setDrawerSnap("half");
                  }}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold font-mono transition flex items-center justify-center ${
                    activeTab === "ledger"
                      ? "bg-emerald-600 text-white shadow-md font-bold"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  $172K Ledger
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("controls");
                    if (drawerSnap === "peek") setDrawerSnap("half");
                  }}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold font-mono transition flex items-center justify-center ${
                    activeTab === "controls"
                      ? "bg-indigo-600 text-white shadow-md font-bold"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Scenarios
                </button>
              </div>

              {/* Scrollable Content Interior */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {activeTab === "agents" && agentsPanelSlot}
                {activeTab === "ledger" && ledgerPanelSlot}
                {activeTab === "controls" && controlsSlot}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default ResponsiveDashboardShell;

