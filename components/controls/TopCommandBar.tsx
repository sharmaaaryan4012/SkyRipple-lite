"use client";

import { useState } from "react";
import Link from "next/link";
import { useInspectorMode } from "@/lib/inspectorMode";
import { AboutModal } from "@/components/ui/AboutModal";
import { RadarDot } from "@/components/ui/RadarDot";
import type { ScenarioData } from "@/lib/types";

export function TopCommandBar({
  scenario,
  isCleanBoot,
}: {
  scenario: ScenarioData;
  activeScenarioId?: string;
  isCleanBoot: boolean;
  onSelectScenario?: (scenarioId: string, isRaw: boolean) => void;
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const { enabled: inspectorMode, setEnabled: setInspectorMode } = useInspectorMode();

  const isDisrupted = !isCleanBoot && scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;

  return (
    <>
      <header className="h-14 border-b border-border bg-page/95 backdrop-blur-md px-4 flex items-center justify-between gap-4 z-40 shrink-0">
        {/* Left: Brand Identity & saaryan.com Link */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="font-display text-lg font-bold text-white group-hover:text-gold transition-colors tracking-tight">
              SkyRipple
            </span>
            <span className="font-mono text-[10px] text-muted font-normal">lite</span>
          </Link>

          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-gold/10 text-gold border border-gold/30 font-medium">
            OCC Cockpit
          </span>

          <a
            href="https://www.saaryan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-gold transition-colors hidden md:flex items-center gap-1 pl-2 border-l border-border"
          >
            <span>&larr;</span> saaryan.com
          </a>
        </div>

        {/* Center: Incident Status Display (Disrupted vs. Nominal) */}
        <div className="flex items-center justify-center flex-1 max-w-[500px]">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-md border border-white/10 bg-white/[0.03] text-xs font-mono select-none">
            {isDisrupted ? (
              <>
                <RadarDot size="md" />
                <span className="text-[#F87171] font-medium tracking-wide truncate">
                  {scenario.meta.label}: {scenario.disruptionMarkers.length}{" "}
                  {scenario.disruptionMarkers.length === 1 ? "Incident" : "Incidents"} Active
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] shrink-0" />
                <span className="text-[#34D399] font-medium tracking-wide">
                  Airspace Nominal &middot; Normal Baseline
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Dev Mode Switch & About */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Dev Mode Toggle Switch */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-white/[0.02]">
            <span className="text-xs font-mono text-muted select-none">Dev mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={inspectorMode}
              onClick={() => setInspectorMode(!inspectorMode)}
              data-testid="inspector-mode-toggle"
              aria-label="Toggle dev mode"
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                inspectorMode ? "bg-gold" : "bg-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full shadow-sm transition duration-200 ease-in-out mt-0.5 ${
                  inspectorMode ? "translate-x-4 bg-page" : "translate-x-0.5 bg-white"
                }`}
              />
            </button>
          </div>

          {/* About Modal Launcher */}
          <button
            onClick={() => setAboutOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted hover:text-white hover:bg-elevated transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="hidden sm:inline">About</span>
          </button>
        </div>
      </header>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
