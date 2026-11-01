"use client";

import React, { useState, useEffect } from "react";
import type { OCCWorkspace } from "@/components/controls/WorkspaceSwitcher";

export interface GuidedTourModalProps {
  open: boolean;
  onClose: () => void;
  onSwitchWorkspace?: (workspace: OCCWorkspace) => void;
}

interface TourStep {
  stepNumber: number;
  badge: string;
  title: string;
  description: string;
  callout: string;
  icon: React.ReactNode;
  actionText?: string;
  actionWorkspace?: OCCWorkspace;
}

const TOUR_STEPS: TourStep[] = [
  {
    stepNumber: 1,
    badge: "STEP 01 OF 03 • SYSTEM PURPOSE",
    title: "Welcome to SkyRipple",
    description:
      "Welcome to SkyRipple. This is not just a flight tracker. It is an AI-driven Operations Control Center (OCC) simulator that resolves cascading airline delays.",
    callout:
      "Unlike simple radar maps that only show past GPS positions, SkyRipple simulates nationwide schedule cascades across 582,410 flights using discrete-event mathematical engines.",
    icon: (
      <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    actionWorkspace: "radar",
  },
  {
    stepNumber: 2,
    badge: "STEP 02 OF 03 • THE PROBLEM",
    title: "Select an Operational Scenario",
    description:
      "Explore how severe airspace disruptions cascade across airline schedules. Use the Preloaded Scenarios selector in the right rail to load realistic incident benchmarks.",
    callout:
      "Select 'Chicago O'Hare (ORD) Runway Closure' to see a 60% runway capacity reduction spark widespread flight delays, missed passenger connections, and crew duty timeouts.",
    icon: (
      <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    actionText: "View Scenarios in Tactical Radar",
    actionWorkspace: "radar",
  },
  {
    stepNumber: 3,
    badge: "STEP 03 OF 03 • THE SOLUTION",
    title: "Watch 5 Autonomous Agents Recover the Airspace",
    description:
      "Switch to Tab 03 ('Explainability & Audit') to watch the 5 agents negotiate the recovery and prove mathematically that zero FAA Part 117 limits or rotations are violated.",
    callout:
      "Aircraft, Crew, Passenger, Gate, and Duty Manager controllers arbitrate trade-offs in under 20 seconds, successfully recovering over $145K in delay costs.",
    icon: (
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    actionText: "Open Explainability & Audit (Tab 03)",
    actionWorkspace: "audit",
  },
];

export function GuidedTourModal({
  open,
  onClose,
  onSwitchWorkspace,
}: GuidedTourModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (TOUR_STEPS[nextIdx].actionWorkspace && onSwitchWorkspace) {
        onSwitchWorkspace(TOUR_STEPS[nextIdx].actionWorkspace!);
      }
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      if (TOUR_STEPS[prevIdx].actionWorkspace && onSwitchWorkspace) {
        onSwitchWorkspace(TOUR_STEPS[prevIdx].actionWorkspace!);
      }
    }
  };

  const handleAction = () => {
    if (step.actionWorkspace && onSwitchWorkspace) {
      onSwitchWorkspace(step.actionWorkspace);
    }
    if (isLast) {
      onClose();
    } else {
      handleNext();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SkyRipple Guided Tour"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden select-none animate-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              {step.icon}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold block">
                {step.badge}
              </span>
              <h3 className="text-base font-bold text-white tracking-tight font-sans">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800 text-lg leading-none"
            aria-label="Close guided tour"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {step.description}
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-300 leading-relaxed font-sans">
            <span className="text-amber-400 font-semibold font-mono block mb-1">
              KEY TAKEAWAY
            </span>
            {step.callout}
          </div>

          {step.actionText && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAction}
                className="w-full py-2 px-3 rounded-lg bg-blue-950/70 border border-blue-700/70 text-blue-300 hover:bg-blue-900/80 hover:text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <span>{step.actionText}</span>
                <span>&rarr;</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-t border-slate-800 text-xs font-mono">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-2">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentStepIndex(idx);
                  if (TOUR_STEPS[idx].actionWorkspace && onSwitchWorkspace) {
                    onSwitchWorkspace(TOUR_STEPS[idx].actionWorkspace!);
                  }
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? "bg-blue-400 scale-125 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                    : "bg-slate-700 hover:bg-slate-500"
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              Skip
            </button>

            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md transition"
            >
              {isLast ? "Finish Tour" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuidedTourModal;

