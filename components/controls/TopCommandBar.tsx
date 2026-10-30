"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useInspectorMode } from "@/lib/inspectorMode";
import { GuidedTourModal } from "@/components/ui/GuidedTourModal";
import { WorkspaceSwitcher, type OCCWorkspace } from "@/components/controls/WorkspaceSwitcher";
import type { ScenarioData, BackendDisruptionRequest } from "@/lib/types";

export interface TopCommandBarProps {
  scenario?: ScenarioData;
  isCleanBoot?: boolean;
  disruptions?: BackendDisruptionRequest[] | null;
  activeWorkspace?: OCCWorkspace;
  onWorkspaceChange?: (workspace: OCCWorkspace) => void;
}

const TOUR_STORAGE_KEY = "skyripple_guided_tour_seen";

export function TopCommandBar({
  activeWorkspace = "radar",
  onWorkspaceChange,
}: TopCommandBarProps) {
  const [tourOpen, setTourOpen] = useState(false);
  const { enabled: inspectorMode, setEnabled: setInspectorMode } = useInspectorMode();

  // Auto-launch Guided Tour on first visit
  useEffect(() => {
    try {
      const seen = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!seen) {
        setTourOpen(true);
      }
    } catch {
      // LocalStorage unavailable in restricted environment
    }
  }, []);

  const handleCloseTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } catch {
      // LocalStorage unavailable
    }
  };

  return (
    <>
      <header className="relative h-14 border-b border-border bg-page/95 backdrop-blur-md px-4 flex items-center justify-between gap-4 z-40 shrink-0 select-none">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="font-display text-lg font-bold text-white group-hover:text-blue-300 transition-colors tracking-tight">
              SkyRipple
            </span>
            <span className="font-mono text-[10px] text-muted font-normal">lite</span>
          </Link>

          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-blue-900/30 text-blue-400 border border-blue-700/50 font-semibold">
            OCC Cockpit
          </span>

          <a
            href="https://www.saaryan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-blue-300 transition-colors hidden md:flex items-center gap-1 pl-2 border-l border-border"
          >
            <span>&larr;</span> saaryan.com
          </a>
        </div>

        {/* Center: Workspace Switcher Tabs (Strict Visual Center) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
          {onWorkspaceChange && (
            <WorkspaceSwitcher
              activeWorkspace={activeWorkspace}
              onWorkspaceChange={onWorkspaceChange}
            />
          )}
        </div>

        {/* Right: Dev Mode Switch & Subtle Guided Tour Button */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          {/* Dev Mode Toggle Switch */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-white/[0.02]">
            <span className="text-xs font-mono text-muted select-none hidden sm:inline">Dev mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={inspectorMode}
              onClick={() => setInspectorMode(!inspectorMode)}
              data-testid="inspector-mode-toggle"
              aria-label="Toggle dev mode"
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                inspectorMode ? "bg-amber-400" : "bg-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full shadow-sm transition duration-200 ease-in-out mt-0.5 ${
                  inspectorMode ? "translate-x-4 bg-page" : "translate-x-0.5 bg-white"
                }`}
              />
            </button>
          </div>

          {/* Subtle Dull-Styled Guided Tour Button */}
          <button
            onClick={() => setTourOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
            title="Start Guided Tour"
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
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="hidden sm:inline">Guided Tour</span>
          </button>
        </div>
      </header>

      <GuidedTourModal
        open={tourOpen}
        onClose={handleCloseTour}
        onSwitchWorkspace={onWorkspaceChange}
      />
    </>
  );
}

export default TopCommandBar;
