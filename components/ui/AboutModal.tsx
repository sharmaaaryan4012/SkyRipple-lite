"use client";

import { useEffect } from "react";

export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-surface border border-border shadow-2xl rounded-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted hover:text-aubergine hover:bg-elevated rounded-md transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 id="modal-title" className="font-display text-2xl font-bold text-aubergine mb-6">
          What is SkyRipple?
        </h2>

        <div className="space-y-6 text-sm text-aubergine/90">
          <p className="text-base leading-relaxed">
            <strong>SkyRipple</strong> is an agentic US-domestic airline delay-propagation simulator. It takes a real day of US domestic air traffic (based on Dec 2025 BTS data) and lets you watch - and provoke - how delay cascades through the system, what it costs, and how an AI operations team recovers from it.
          </p>

          <div>
            <h3 className="font-semibold text-base mb-2">🧠 Under the Hood</h3>
            <p className="mb-3">While this <strong>Lite</strong> version serves a fully-featured interface loaded with pre-computed scenarios, the actual local SkyRipple engine runs an intense, validated pipeline:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>The World Model & Data:</strong> A clean, normalized 167MB database generated from BTS On-Time, OurAirports, and the FAA registry. It simulates 343 airports, 14 carriers, 5,729 aircraft, and over 582k flight legs.
              </li>
              <li>
                <strong>The Synthetic World:</strong> We generate synthetic crews (~190K legal pairings), passengers (~1.95M/day, dynamically generating misconnections and rebooking logic), and ground resources (6,756 gates) to accurately mimic constraints.
              </li>
              <li>
                <strong>The Simulation Engine:</strong> A discrete-event engine operating on four channels (Rotation, Crew+Gate, Passengers, and Disruptions) validated against real BTS data.
              </li>
              <li>
                <strong>Economics & Ledger:</strong> Pure costing down to the dollar across 5 categories. <em>Example: A runway closure at ORD costs ~$942K above normal, representing a ~5× propagation multiplier!</em>
              </li>
              <li>
                <strong>Agentic OCC:</strong> An AI operations team (Aircraft, Crew, Passenger, and Gate Controllers, plus a Duty Manager) proposes recovery plans and arbitrates to find the most cost-effective recovery strategy.
              </li>
              <li>
                <strong>Live NLP Parsing:</strong> In the full local app, you don&apos;t use dropdowns. You type: <em>&quot;ground stop at Atlanta and a runway closure at Chicago.&quot;</em> Gemini Flash-Lite parses the intents, validates them, and kicks off the live cascade.
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-aubergine text-white rounded font-medium hover:bg-aubergine/90 transition-colors"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
