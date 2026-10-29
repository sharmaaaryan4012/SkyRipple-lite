"use client";

import React from "react";

export type OCCWorkspace = "radar" | "audit" | "analytics";

export interface WorkspaceOption {
  id: OCCWorkspace;
  label: string;
  shortLabel: string;
  badge: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

export const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  {
    id: "radar",
    label: "Tactical Radar",
    shortLabel: "Radar",
    badge: "01",
    icon: ({ className = "w-3.5 h-3.5" }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    id: "audit",
    label: "Explainability & Audit",
    shortLabel: "Audit",
    badge: "02",
    icon: ({ className = "w-3.5 h-3.5" }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Financial & Carrier Analytics",
    shortLabel: "Analytics",
    badge: "03",
    icon: ({ className = "w-3.5 h-3.5" }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
];

export interface WorkspaceSwitcherProps {
  activeWorkspace: OCCWorkspace;
  onWorkspaceChange: (workspace: OCCWorkspace) => void;
  className?: string;
}

/**
 * Top-level OCC Cockpit Workspace Switcher.
 * Adheres strictly to the Executive Cockpit design system:
 * - Slate/navy background container (bg-slate-950/80 border-slate-800)
 * - Active view: Solid slate highlight with bright white typography (bg-slate-800 text-white font-semibold)
 * - Inactive views: Muted slate with subtle hover states (text-slate-400 hover:text-slate-200)
 */
export function WorkspaceSwitcher({
  activeWorkspace,
  onWorkspaceChange,
  className = "",
}: WorkspaceSwitcherProps) {
  return (
    <nav
      role="tablist"
      aria-label="Operations Control Center Workspaces"
      className={`inline-flex items-center gap-1 p-1 rounded-lg bg-slate-950/80 border border-slate-800 shadow-inner font-mono text-xs select-none ${className}`}
    >
      {WORKSPACE_OPTIONS.map((ws) => {
        const isActive = activeWorkspace === ws.id;
        const Icon = ws.icon;
        return (
          <button
            key={ws.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`workspace-panel-${ws.id}`}
            onClick={() => onWorkspaceChange(ws.id)}
            title={`Switch to ${ws.label}`}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 ${
              isActive
                ? "bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
            }`}
          >
            <span
              className={`transition-colors ${
                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
              }`}
            >
              <Icon />
            </span>
            <span className="font-sans font-medium tracking-tight whitespace-nowrap hidden sm:inline">
              {ws.label}
            </span>
            <span className="font-sans font-medium tracking-tight whitespace-nowrap sm:hidden">
              {ws.shortLabel}
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors hidden md:inline ${
                isActive
                  ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              {ws.badge}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default WorkspaceSwitcher;

