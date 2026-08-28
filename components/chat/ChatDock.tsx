"use client";

import { useEffect, useRef, useState } from "react";

import { buildScenarioSummary } from "@/lib/qaEngine";
import { MessageBubble, type ChatMessage } from "./MessageBubble";
import { PromptChip } from "./PromptChip";
import type { RecoveryView } from "@/lib/recoveryView";
import type { ScenarioData, BackendDisruptionRequest, FlightLeg, SimulationData } from "@/lib/types";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${idCounter}`;
}

// Staged loading text -- see this component's own docstring below for why
// these are TIME-based guesses, not a real phase signal from the backend.
const STAGES: { delayMs: number; text: string }[] = [
  { delayMs: 0, text: "Parsing the disruption…" },
  { delayMs: 3000, text: "Simulating the day's cascade…" },
  { delayMs: 12000, text: "Pricing the impact…" },
];

// Each `id` is a precomputed export slug under public/scenarios/<id>/.
// Clicking one activates it as the app's `active` scenario IN PLACE (see
// handleStarterClick() below) -- no navigation, no remount, chat history
// stays put. Free-text NL parsing needs the Python/Gemini backend this
// static Lite build doesn't ship with, so these chips are the only way
// to load a real disruption cascade here.
const STARTER_PROMPTS: { label: string; id: string }[] = [
  { label: "ORD Runway Closure", id: "ord-runway-closure" },
  { label: "Multi-Disruption Cascade", id: "multi-disruption-cascade" },
];

/**
 * The Ops Assistant -- a floating, collapsible dock positioned absolutely
 * over the map (composed there by ControlRoomApp.tsx; see
 * ControlRoomShell.tsx's own docstring for why there's no separate `chat`
 * grid area to reserve space for it anymore).
 *
 * Lite build: there's no Python/Gemini backend to send free text to, so
 * submitText() below just posts an honest "NL parsing needs the full
 * local version" message instead of calling a live API -- see that
 * function. The STARTER_PROMPTS chips are the real interaction here:
 * each names a precomputed scenario slug (public/scenarios/<id>/) and
 * activates it as the app's `active` result via `onActivatePrecomputed`
 * (handleStarterClick() below) -- the SAME seam ControlRoomApp already
 * uses for its own boot load, just re-fired with a new scenarioId. This
 * swaps the map/dashboard/ledger data IN PLACE: no navigation, no
 * component remount, chat history and dock state untouched.
 *
 * That in-place swap replaces an earlier version that routed a starter
 * click through `router.push('/simulation?scenario=...')` -- a real URL
 * navigation that remounted ControlRoomApp from scratch via
 * app/simulation/page.tsx, discarding this whole chat session and
 * reading, to the user, as the entire site reloading just to load a
 * scenario.
 *
 * Shared-state seam: `onActivateLive` and `onActivatePrecomputed` are how
 * this component is an INPUT to ControlRoomApp's shared `active` state,
 * exactly like TimeControlPanel is an input to the shared cursor.
 */
export function ChatDock({
  scenario,
  flights,
  recovery,
  nlAvailable,
  onActivateLive,
  onActivatePrecomputed,
}: {
  scenario: ScenarioData;
  /** Task 8e: needed by lib/qaQuery.ts's airport-level executors (the
   * same already-loaded flights the map/dashboard render from -- no
   * separate fetch). */
  flights: FlightLeg[];
  /** Task 8e: the before/after recovery view, if "Compute recovery" has
   * finished for the active scenario -- null otherwise (recovery_summary
   * questions handle that honestly, see lib/qaQuery.ts). */
  recovery: RecoveryView | null;
  nlAvailable: boolean | null; // null = still checking /api/health
  onActivateLive: (data: SimulationData, disruptions: BackendDisruptionRequest[]) => void;
  /** Swaps ControlRoomApp's shared `active` to a different precomputed
   * scenario slug (public/scenarios/<id>/), in place -- see
   * handleStarterClick() below and this component's own docstring. */
  onActivatePrecomputed: (scenarioId: string) => void;
}) {

  // Floating-over-map rework: starts EXPANDED (onboarding -- greeting +
  // chips visible on first load), auto-collapses once after the FIRST
  // successful disruption run (`hasRunOnce` below), then stays wherever
  // the user leaves it. Re-expanding to show a NEW reply is handled
  // explicitly in submitText() (any submission made while collapsed
  // reopens the panel to show its own progress/answer) rather than by a
  // generic "any assistant message arrived" watcher, which would fight
  // the auto-collapse below the moment the post-disruption scenario-
  // summary message lands a beat later (see that effect's own comment).
  // A message arriving from THAT unrelated path while collapsed instead
  // sets `hasUnread` -- a quiet dot, not a forced re-open.
  const [expanded, setExpanded] = useState(true);
  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: nextId(),
      role: "assistant",
      text: "Welcome to SkyRipple! ✈️\n\nI am an agentic simulation engine. I've loaded a full day of real US air traffic. Pick a scenario below to watch how a single disruption cascades through the network, costs airlines millions, and how an AI operations team recovers it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Keyed by "<scenarioId>#<requestId>", not just the scenarioId -- a
  // bare-id guard would (a) double-post under StrictMode's double effect
  // invocation and (b) never fire again for a second live result that
  // happens to share the backend's default scenarioId ("live-nl") with
  // the first one. See the effect below.
  const [pendingSummaryKey, setPendingSummaryKey] = useState<string | null>(`${scenario.meta.scenarioId}#0`);
  const requestCounterRef = useRef(0);
  const lastProcessedKeyRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function pushMessage(role: ChatMessage["role"], text: string) {
    const id = nextId();
    setMessages((prev) => [...prev, { id, role, text }]);
    // A quiet unread dot, not a forced re-open -- see this component's own
    // docstring on why an assistant message arriving from an UNRELATED
    // path (the scenario-summary effect below) must not fight the
    // deliberate post-first-run auto-collapse.
    if (role === "assistant" && !expanded) setHasUnread(true);
    return id;
  }

  function pushPending(text: string): string {
    const id = nextId();
    setMessages((prev) => [...prev, { id, role: "assistant", text, pending: true }]);
    return id;
  }

  function updatePending(id: string, text: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
  }

  function resolvePending(id: string, text: string, kind?: ChatMessage["kind"]) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, pending: false, kind } : m)));
  }

  function startStages(id: string) {
    stopStages();
    for (const stage of STAGES.slice(1)) {
      stageTimersRef.current.push(setTimeout(() => updatePending(id, stage.text), stage.delayMs));
    }
  }

  function stopStages() {
    stageTimersRef.current.forEach(clearTimeout);
    stageTimersRef.current = [];
  }

  useEffect(() => stopStages, []);

  // Posts the active scenario's real-data summary + jumps the cursor to
  // its first disruption once its data has actually arrived -- fires for
  // the scenario the app starts on, and again whenever `scenario` catches
  // up to a slug/live-result just requested via activate*() below. Doing
  // the jump HERE (not immediately in the activate call) matters: right
  // after calling onActivate*, `scenario` is still the PREVIOUS scenario's
  // data (React state updates are async), so jumping immediately would
  // use the wrong disruption markers for anything but a same-scenario
  // reactivation.
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

  // Lite build: free text has no backend to parse it, so this just posts
  // the honest disabled-feature message. See handleStarterClick() below
  // for the actual scenario-loading path.
  async function submitText(text: string) {
    if (!text || busy) return;
    if (!expanded) expandDock();
    pushMessage("user", text);
    setInput("");

    pushMessage("assistant", "Live NLP simulation and querying are only available in the full local version of SkyRipple, as they require the Python engine and Gemini API.\n\nIn this Lite version, you can click the scenario chips below to explore pre-computed cascades!");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitText(input.trim());
  }

  // Activates the precomputed scenario IN PLACE via onActivatePrecomputed
  // (ControlRoomApp swaps its shared `active` state) -- no navigation, so
  // the map/dashboard/ledger update where they sit and this chat's own
  // history survives. armSummary() arms the same "post the new scenario's
  // summary once its data lands" effect the app's own boot uses (see that
  // effect above); the summary itself confirms the load instead of a
  // separate "user said X" bubble, since a chip click isn't really the
  // user typing a sentence.
  function handleStarterClick(prompt: { label: string; id: string }) {
    if (busy) return;
    if (!expanded) expandDock();
    onActivatePrecomputed(prompt.id);
    armSummary(prompt.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && expanded) setExpanded(false);
  }

  return (
    <>
      {/* Faint, non-interactive scrim -- focuses attention on the panel
          without blocking the map underneath (no pointer-events), and
          fades with the SAME 220ms as the panel's own height change so
          the two read as one motion. Always mounted (never conditionally
          rendered) so the opacity actually transitions instead of
          snapping in/out. */}
      <div
        className={`absolute inset-0 z-10 bg-aubergine pointer-events-none transition-opacity duration-[220ms] ease-in-out ${expanded ? "opacity-15" : "opacity-0"}`}
        aria-hidden="true"
      />

      <div
        className="absolute left-1/2 bottom-4 z-20 w-[min(680px,92%)] -translate-x-1/2 bg-surface border border-border rounded-md overflow-hidden flex flex-col shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-[height,opacity] duration-[220ms] ease-in-out"
        style={{ height: expanded ? "60%" : "56px" }}
        onKeyDown={handleKeyDown}
      >
        {expanded && (
          <>
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center justify-between px-3 py-2.5 shrink-0 hover:bg-elevated state-transition"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-aubergine-soft">Ops assistant</span>
              <ChevronIcon expanded />
            </button>

            <div id="chat-message-list" ref={listRef} data-testid="chat-message-list" className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2 min-h-0">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>

            <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {STARTER_PROMPTS.map((prompt) => (
                <PromptChip key={prompt.id} label={prompt.label} onClick={() => handleStarterClick(prompt)} disabled={busy} />
              ))}
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className={`flex items-center gap-2 p-2 shrink-0 ${expanded ? "border-t border-border" : ""}`}>
          <button
            type="button"
            onClick={() => (expanded ? setExpanded(false) : expandDock())}
            aria-label={expanded ? "Collapse ops assistant" : "Expand ops assistant"}
            data-testid="chat-toggle"
            className="relative flex items-center justify-center w-7 h-7 rounded border border-border text-muted hover:bg-elevated hover:text-aubergine state-transition shrink-0"
          >
            <ChevronIcon expanded={expanded} />
            {!expanded && hasUnread && <span data-testid="chat-unread-dot" className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-aubergine" />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (!expanded) expandDock();
            }}
            disabled={busy}
            placeholder={busy ? "Working on that…" : "Describe a disruption, or ask about the loaded scenario."}
            data-testid="chat-input"
            data-busy={busy}
            className="flex-1 bg-elevated border border-border rounded px-2.5 py-1.5 text-sm text-aubergine placeholder:text-muted outline-none focus:border-aubergine-soft state-transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy}
            data-testid="chat-send-button"
            className="bg-gold text-aubergine rounded px-3 py-1.5 text-xs font-medium hover:bg-gold-hover state-transition shrink-0 disabled:opacity-40 disabled:hover:bg-gold"
          >
            {busy ? "Working…" : "Send"}
          </button>
        </form>
      </div>
    </>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-muted state-transition"
      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M1.5 3.5L5 7L8.5 3.5" />
    </svg>
  );
}
