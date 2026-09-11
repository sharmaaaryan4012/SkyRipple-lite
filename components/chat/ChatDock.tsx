"use client";

import { useEffect, useRef, useState } from "react";

import { buildScenarioSummary } from "@/lib/qaEngine";
import { MessageBubble, type ChatMessage } from "./MessageBubble";
import { PromptChip } from "./PromptChip";
import { RadarDot } from "@/components/ui/RadarDot";
import type { RecoveryView } from "@/lib/recoveryView";
import type { ScenarioData, BackendDisruptionRequest, FlightLeg, SimulationData } from "@/lib/types";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${idCounter}`;
}

const STARTER_PROMPTS: { label: string; id: string }[] = [
  { label: "ORD Runway Closure", id: "ord-runway-closure" },
  { label: "Multi-Disruption Cascade", id: "multi-disruption-cascade" },
  { label: "Reset to Baseline", id: "baseline" },
];

/**
 * The OCC Mission Briefing & Assistant.
 * Designed as an out-of-the-way, collapsible tactical capsule floating
 * over the map. Defaulted to collapsed so the US flight radar canvas is
 * 100% visible on first load, and expands into a focused briefing drawer
 * where users can switch scenarios or explore AI disruption narratives.
 */
export function ChatDock({
  scenario,
  flights: _flights,
  recovery: _recovery,
  nlAvailable: _nlAvailable,
  onActivateLive: _onActivateLive,
  onActivatePrecomputed,
}: {
  scenario: ScenarioData;
  flights: FlightLeg[];
  recovery: RecoveryView | null;
  nlAvailable: boolean | null;
  onActivateLive: (data: SimulationData, disruptions: BackendDisruptionRequest[]) => void;
  onActivatePrecomputed: (scenarioId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: nextId(),
      role: "assistant",
      text: "Welcome to SkyRipple! ✈️\n\nI am the autonomous OCC simulation assistant. In this system, you inject air traffic disruptions and track how localized delays cascade across the national network.\n\nSelect a scenario below or type a command to run a cascade:",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy] = useState(false);
  const [pendingSummaryKey, setPendingSummaryKey] = useState<string | null>(`${scenario.meta.scenarioId}#0`);
  const requestCounterRef = useRef(0);
  const lastProcessedKeyRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function pushMessage(role: ChatMessage["role"], text: string) {
    const id = nextId();
    setMessages((prev) => [...prev, { id, role, text }]);
    if (role === "assistant" && !expanded) setHasUnread(true);
    return id;
  }

  useEffect(() => {
    if (pendingSummaryKey && pendingSummaryKey.startsWith(`${scenario.meta.scenarioId}#`) && lastProcessedKeyRef.current !== pendingSummaryKey) {
      lastProcessedKeyRef.current = pendingSummaryKey;
      pushMessage("assistant", buildScenarioSummary(scenario));
      setPendingSummaryKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, pendingSummaryKey]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function armSummary(scenarioId: string) {
    requestCounterRef.current += 1;
    setPendingSummaryKey(`${scenarioId}#${requestCounterRef.current}`);
  }

  function expandDock() {
    setExpanded(true);
    setHasUnread(false);
  }

  async function submitText(text: string) {
    if (!text || busy) return;
    if (!expanded) expandDock();
    pushMessage("user", text);
    setInput("");

    const lower = text.toLowerCase();
    if (lower.includes("ord") || lower.includes("chicago") || lower.includes("runway")) {
      pushMessage("assistant", "Injecting Chicago O'Hare (ORD) runway closure: 60% capacity cut from 08:00 to 10:00 CST. Calculating cascade...");
      onActivatePrecomputed("ord-runway-closure");
      armSummary("ord-runway-closure");
    } else if (lower.includes("multi") || lower.includes("compound") || lower.includes("denver")) {
      pushMessage("assistant", "Injecting multi-hub cascade: concurrent ORD + DEN runway closures with an evening United fleet grounding...");
      onActivatePrecomputed("multi-disruption-cascade");
      armSummary("multi-disruption-cascade");
    } else if (lower.includes("baseline") || lower.includes("nominal") || lower.includes("clear") || lower.includes("reset")) {
      pushMessage("assistant", "Resetting airspace to nominal baseline operations ($0 cost variance)...");
      onActivatePrecomputed("baseline");
      armSummary("baseline");
    } else {
      pushMessage(
        "assistant",
        "In this static Lite version, natural language queries are matched to benchmark precomputed scenarios. Click any of the prompt chips below or type 'ORD', 'Multi-Hub', or 'Baseline'.\n\n(The full local version connects to Gemini API & Python agents for arbitrary free-form disruption injection)."
      );
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitText(input.trim());
  }

  function handleStarterClick(prompt: { label: string; id: string }) {
    if (busy) return;
    onActivatePrecomputed(prompt.id);
    armSummary(prompt.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && expanded) setExpanded(false);
  }

  const isDisrupted = scenario.disruptionMarkers && scenario.disruptionMarkers.length > 0;

  return (
    <div className="absolute left-3 bottom-3 z-30 flex flex-col items-start" onKeyDown={handleKeyDown}>
      {/* Collapsed Capsule Button */}
      {!expanded ? (
        <button
          onClick={expandDock}
          data-testid="chat-toggle"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface/90 backdrop-blur-md border border-border hover:border-gold/60 shadow-xl state-transition group"
          title="Open Ops Assistant to switch scenarios or view mission briefing"
        >
          {isDisrupted ? (
            <RadarDot size="sm" />
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          )}

          <span className="font-mono text-xs text-white font-medium flex items-center gap-1.5">
            <span>Ops Assistant</span>
            <span className="text-muted group-hover:text-gold transition-colors text-[11px]">
              &middot; {isDisrupted ? scenario.meta.label : "Select Scenario"}
            </span>
          </span>

          {hasUnread && (
            <span data-testid="chat-unread-dot" className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          )}

          <ChevronIcon expanded={false} />
        </button>
      ) : (
        /* Expanded Tactical Drawer */
        <div
          className="w-[min(460px,92vw)] max-h-[62vh] bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden state-transition"
          style={{ height: "540px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.02] border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-gold font-semibold">
                OCC Mission Assistant
              </span>
              <span className="text-muted text-[11px]">&middot; {scenario.meta.day}</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              data-testid="chat-toggle"
              aria-label="Collapse ops assistant"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-elevated text-muted hover:text-white transition-colors"
            >
              <ChevronIcon expanded={true} />
            </button>
          </div>

          {/* Active Disruption Banner */}
          <div className="px-3.5 py-2 bg-white/[0.01] border-b border-border/60 shrink-0">
            <p className="font-mono text-xs text-aubergine-soft leading-relaxed">
              {scenario.meta.disruptionSummary}
            </p>
          </div>

          {/* Message Stream */}
          <div
            id="chat-message-list"
            ref={listRef}
            data-testid="chat-message-list"
            className="flex-1 overflow-y-auto px-3.5 py-2.5 flex flex-col gap-2.5 min-h-0 text-xs"
          >
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>

          {/* Preset Quick Chips */}
          <div className="px-3.5 pt-2 pb-1.5 flex flex-wrap gap-1.5 shrink-0 border-t border-border/60">
            {STARTER_PROMPTS.map((prompt) => (
              <PromptChip
                key={prompt.id}
                label={prompt.label}
                onClick={() => handleStarterClick(prompt)}
                disabled={busy}
              />
            ))}
          </div>

          {/* Prompt Input Form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2.5 border-t border-border shrink-0 bg-white/[0.01]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder={busy ? "Working on that…" : "Describe a disruption or ask about flight impacts…"}
              data-testid="chat-input"
              data-busy={busy}
              className="flex-1 bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-muted outline-none focus:border-gold/50 state-transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              data-testid="chat-send-button"
              className="bg-gold text-page font-medium rounded-md px-3 py-1.5 text-xs hover:bg-white state-transition shrink-0 disabled:opacity-40 disabled:hover:bg-gold"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted transition-transform"
      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
