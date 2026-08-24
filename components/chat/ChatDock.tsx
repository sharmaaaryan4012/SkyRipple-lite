"use client";

import { useEffect, useRef, useState } from "react";

import { buildScenarioSummary } from "@/lib/qaEngine";
import { askChat, parseAndSimulate, BackendApiError, BackendUnreachableError } from "@/lib/backendClient";
import { buildSnapshot } from "@/lib/qaSnapshot";
import { executeQuery } from "@/lib/qaQuery";
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

// Fix 1 (Task B follow-up): these REPLACE the old precomputed-scenario
// showcase chips. Each one is real free text that runs through the
// EXACT SAME live /api/parse-and-simulate path as anything typed by
// hand (see submitText() below) -- they are examples-that-RUN, not
// links to a preloaded file. Deliberately spans more than "runway
// closure at an airport" (the ONLY disruption kind the old precomputed
// chip demonstrated): a non-airport target (GROUND_AIRCRAFT), a
// multi-disruption sentence (proving the multi-parse capability), and a
// single-flight DELAY_FLIGHT, alongside one airport-capacity example --
// so the starters themselves teach a new user the tool's actual range,
// not just its one canned demo.
const STARTER_PROMPTS: { label: string; id: string }[] = [
  { label: "ORD Runway Closure", id: "ord-runway-closure" },
  { label: "Live NL Example", id: "live-nl" },
];

/**
 * The Ops Assistant -- a floating, collapsible dock positioned absolutely
 * over the map (composed there by ControlRoomApp.tsx; see
 * ControlRoomShell.tsx's own docstring for why there's no separate `chat`
 * grid area to reserve space for it anymore). Task 5c replaces Task 4's client-side
 * keyword matcher with the REAL backend: free text goes to
 * POST /api/parse-and-simulate (Gemini NL parsing + live simulation),
 * and the backend's own `interpretation` string becomes the assistant's
 * confirmation message verbatim,  the honest "here's what I understood"
 * the task requires, not a client-reconstructed paraphrase.
 *
 * STAGED LOADING: /api/parse-and-simulate is a single synchronous
 * request (~15-45s) with no streaming/SSE phase signal, so the "Parsing…
 * -> Simulating… -> Pricing…" progression below is a client-side,
 * TIME-based guess at what the backend is doing (calibrated against
 * observed timingMs breakdowns from Task 5a/5b's own verification runs:
 * resolveDisruptions is near-instant, the clean+reproduce DES pairs
 * dominate the first several seconds, passenger costing dominates the
 * back half),  NOT a real per-stage progress signal, unlike the
 * recovery job's actual 0..1 value. This is deliberately labeled
 * honestly in code (here) rather than presented as more precise than it
 * is; it exists purely so a ~30s wait shows motion instead of one silent
 * spinner.
 *
 * Three distinct honest outcomes from a submission, all rendered as
 * plain assistant text (see lib/backendClient.ts's ParseAndSimulateResult
 * / BackendApiError):
 *   - supported: true  -> interpretation + the live result activates
 *   - supported: false -> an honest miss (interpretation lists supported kinds), no simulation
 *   - BackendApiError(400) -> "understood but failed" (interpretation + the specific resolver error)
 *   - BackendApiError(503) -> NL unavailable (no GEMINI_API_KEY)
 *   - BackendUnreachableError -> can't reach the backend at all (connection refused/network)
 *
 * Fix 1 (Task B follow-up): this component USED to also render a row of
 * chips loading PRECOMPUTED scenarios (GET /api/scenarios,
 * onActivatePrecomputed),  dropped entirely, along with the greeting's
 * "or pick a showcase scenario below" framing, because both implied a
 * fixed/canned set of scenarios the live NL front-door has never
 * actually been limited to since 5b/5c. STARTER_PROMPTS above replaces
 * them: real example TEXT that runs through submitText() below exactly
 * like anything typed by hand -- see that function for why it's shared
 * between the form's onSubmit and a starter chip's onClick rather than
 * two separate code paths. The app's initial boot still loads a
 * PRECOMPUTED scenario (page.tsx's own INITIAL_SCENARIO_ID, unrelated to
 * this component),  only the CHAT's own chip row and copy changed here.
 *
 * Shared-state seam: `onActivateLive` is how this component is an INPUT
 * to ControlRoomApp's shared `active` state, exactly like
 * TimeControlPanel is an input to the shared cursor.
 */
export function ChatDock({
  scenario,
  flights,
  recovery,
  nlAvailable,
  onActivateLive,
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

  // Fix 1: the ONE path both a typed submission AND a starter-chip click
  // go through -- a starter is real text run exactly like anything typed
  // by hand, not a shortcut to a different (precomputed) code path. See
  // this component's own docstring for why the old chip row (precomputed
  // scenarios) was removed rather than kept alongside this.
  //
  // Task 8e: EVERY message now goes through POST /api/ask FIRST -- a
  // single Gemini call that classifies disruption vs question vs
  // ambiguous vs out-of-scope (tier_c) vs unknown (see api/qa_router.py's
  // own docstring). This REPLACES the old client-side looksLikeQuestion()
  // regex gate: routing is now the LLM's job, not a keyword heuristic.
  // route=="disruption" falls through to the EXISTING /api/parse-and-
  // simulate call below completely unchanged -- 8e only decides WHICH
  // path a message takes, never how the disruption path itself behaves.
  // route=="question" executes a closed, typed query (lib/qaQuery.ts)
  // against data already sitting in this component's own props --
  // /api/ask never computes or returns a number itself.
  async function submitText(text: string) {
    if (!text || busy) return;
    // A submission made while collapsed reopens the panel to show its own
    // progress/answer -- see this component's own docstring for why this
    // (not a generic "any assistant message" watcher) is how re-expansion
    // works.
    if (!expanded) expandDock();
    pushMessage("user", text);
    setInput("");

    if (nlAvailable === false) {
      pushMessage("assistant", "Live simulation via chat isn't available right now (no GEMINI_API_KEY configured on the backend).");
      return;
    }

    setBusy(true);
    const pendingId = pushPending("Thinking…");

    try {
      const ask = await askChat(text, buildSnapshot(scenario, recovery));

      if (ask.classification === "question") {
        const result = executeQuery(ask.queryKind ?? "", ask.params, { scenario, flights, recovery });
        resolvePending(pendingId, `${result.interpretation}\n${result.text}`, "answer");
        return;
      }

      if (ask.classification === "ambiguous" || ask.classification === "tier_c" || ask.classification === "unknown") {
        resolvePending(pendingId, ask.interpretation, "answer");
        return;
      }

      // ask.classification === "disruption" -- the EXISTING 5b flow, untouched.
      updatePending(pendingId, STAGES[0].text);
      startStages(pendingId);
      const result = await parseAndSimulate(text, scenario.meta.day);
      stopStages();
      if (result.supported) {
        resolvePending(pendingId, result.interpretation);
        const disruptions: BackendDisruptionRequest[] = result.parsedIntents.map((i) => ({ kind: i.kind, target: i.target, params: i.params }));
        onActivateLive(result.data, disruptions);
        armSummary(result.data.scenario.meta.scenarioId);
        // Onboarding is done: the map is the star from here on. Only the
        // FIRST successful disruption auto-collapses -- later ones leave
        // the panel wherever the user has it (hasRunOnce guards this).
        if (!hasRunOnce) {
          setHasRunOnce(true);
          setExpanded(false);
        }
      } else {
        resolvePending(pendingId, result.interpretation);
      }
    } catch (err) {
      stopStages();
      if (err instanceof BackendApiError && err.status === 400) {
        const interpretation = typeof err.detail.interpretation === "string" ? err.detail.interpretation : "";
        resolvePending(pendingId, interpretation ? `${interpretation}\n\nBut: ${err.message}` : `I couldn't run that: ${err.message}`);
      } else if (err instanceof BackendApiError && err.status === 503) {
        resolvePending(pendingId, "Live simulation via chat isn't available right now (no GEMINI_API_KEY configured on the backend).");
      } else if (err instanceof BackendUnreachableError) {
        resolvePending(pendingId, err.message);
      } else {
        resolvePending(pendingId, `Something went wrong: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitText(input.trim());
  }

  function handleStarterClick(prompt: { label: string; id: string }) {
    window.location.href = `/?scenario=${prompt.id}`;
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
