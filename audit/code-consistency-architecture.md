# Code Consistency & Architecture Audit (`/audit/code-consistency-architecture.md`)
**Auditor:** Principal UI/UX Architect & Frontend Systems Auditor  
**Scope:** Component Boundaries, Modularity vs Monolithic Patterns, State Management & Prop Drilling  
**Target:** SkyRipple OCC 3-View Cockpit Migration

---

## 1. Executive Summary
The frontend architecture suffers from **monolithic component creep** in key feature files and an over-reliance on **prop drilling** caused by a render-prop abstraction in `SimulationProvider.tsx`. Furthermore, orphan dead code remains in the repository, representing unresolved architectural churn.

---

## 2. Monolithic Component Boundaries

A codebase volume analysis highlights three files violating component boundary principles:

```
components/dashboard/AgentRecoveryLedger.tsx   -->  820 lines (Severe Monolith)
components/layout/ResponsiveDashboardShell.tsx  -->  469 lines (High Complexity)
components/dashboard/AgentArbitrationFeed.tsx    -->  450 lines (100% Dead Code)
components/ControlRoomApp.tsx                   -->  249 lines (Prop Plumbing)
```

### 2.1 Monolith 1: `AgentRecoveryLedger.tsx` (820 Lines)
This single file manages:
* Agent role configuration dictionaries and icon mappings (lines 38–70)
* Role normalization regex parsers (lines 72–79)
* Hardcoded preset constraint prompt libraries (lines 81–87)
* Financial metric reconciliation logic (lines 110–125)
* Fallback mock log generation for 3 distinct disruption topologies (lines 127–333)
* Sequential animation replay timers (`setInterval`) (lines 370–383)
* Interactive constraint form submission and array merging (lines 386–400)
* Card Feed DOM renderer (lines 593–670)
* Terminal Feed DOM renderer (lines 673–700)
* Operator Override UI (lines 706–775)
* Duty Manager Consensus Summary (lines 780–816)

**Architecture Risk:** High cyclomatic complexity. Any minor edit to the terminal feed styling requires re-testing the financial calculation logic and replay timers in the same file.

### 2.2 Monolith 2: `ResponsiveDashboardShell.tsx` (469 Lines)
This component attempts to be three different things at once:
1. Desktop 3-view workspace layout container
2. Pointer-event mouse and touch drag resizer for the desktop sidebar (with localStorage synchronization, double-click reset, and arrow-key accessibility handlers)
3. Mobile landscape 60/40 split-screen orchestrator and mobile portrait 3-snap-height bottom drawer (`peek`, `half`, `full`)

**Architecture Risk:** Layout concerns for mobile portrait touch gestures are tangled with desktop drag-divider logic, forcing 469 lines of code into every render cycle.

### 2.3 Technical Debt: `AgentArbitrationFeed.tsx` (450 Lines of Dead Code)
* **Status:** Completely unreferenced.
* **Grep verification:** `grep -rn "AgentArbitrationFeed" components/ app/ lib/` returns zero imports.
* **Finding:** This file was the precursor to `AgentRecoveryLedger.tsx`. It was abandoned during the 3-view refactor and left in the production tree, creating confusion for future maintainers.

---

## 3. State Management & Prop Drilling Flow

```
ControlRoomApp (Holds: active, recovery, mapView, workspace)
       │
       ▼ (Render-Prop Pattern)
SimulationProvider (Yields data & error)
       │
       ├─► TopCommandBar ──► WorkspaceSwitcher & GuidedTourModal
       │
       └─► ResponsiveDashboardShell (Slots containing raw JSX)
             ├─► MapPanel ──► USMap ──► AirportDetailPanel
             ├─► FlightDeck
             ├─► DeterministicValidationCard
             ├─► AgentRecoveryLedger
             └─► FinancialAnalyticsView
```

### Diagnostic Breakdown of State Distribution:
1. **Render Prop Chokepoint in `SimulationProvider`:** Instead of providing a standard `useSimulation()` React Context hook, `SimulationProvider` uses `children: (data: SimulationData | null, error: string | null) => React.ReactNode` (`SimulationProvider.tsx#L85`). As a result, `ControlRoomApp` must unpack `data` and manually thread `scenario`, `flights`, `airports`, `impactSummary`, and `disruptions` down through 8 different slot props.
2. **Dual-State Desynchronization in Shell:** In `ResponsiveDashboardShell.tsx` (lines 61-65):
   ```tsx
   const [internalWorkspace, setInternalWorkspace] = useState<OCCWorkspace>("radar");
   const currentWorkspace = activeWorkspace ?? internalWorkspace;
   const handleWorkspaceChange = onWorkspaceChange ?? setInternalWorkspace;
   ```
   The shell maintains its own internal fallback workspace state while simultaneously accepting `activeWorkspace` from `ControlRoomApp`. On mobile devices, switching tabs modifies `activeTab` (`ledger` | `analytics` | `audit`), mapping `ledger` back to `radar`. If an external action modifies `workspace`, mobile `activeTab` can desynchronize, showing the wrong tab panel.
3. **Remounting via Key in `TimeCursorBridge`:** In `SimulationProvider.tsx` (lines 162-177), `TimeCursorProvider` is given `key={`${window.startMin}-${window.endMin]}`. Whenever the user switches from day to week view, the entire time cursor provider unmounts and remounts, resetting internal playback states (`isPlaying = false`) and triggering sudden frame drops on the map.

---

## 4. Strategic Architectural Recommendations
1. **Refactor `AgentRecoveryLedger` into a Feature Directory:** Break down the 820-line file into:
   * `components/dashboard/ledger/LedgerHeader.tsx`
   * `components/dashboard/ledger/ArbitrationFeed.tsx` (Card & Terminal views)
   * `components/dashboard/ledger/OperatorOverrideConsole.tsx`
   * `components/dashboard/ledger/useArbitrationLogs.ts` (custom hook managing replay timers and mock data)
2. **Convert `SimulationProvider` to Context:** Replace the render-prop pattern with a true `SimulationContext.Provider`. Components like `MapPanel`, `FlightDeck`, and `FinancialAnalyticsView` can consume telemetry directly via `useSimulation()`, eliminating 150+ lines of prop plumbing in `ControlRoomApp`.
3. **Delete Dead Files:** Safely remove `AgentArbitrationFeed.tsx`.
4. **Isolate Desktop Drag & Mobile Drawer Hooks:** Extract mouse drag logic into `useSidebarResize.ts` and touch drawer state into `useMobileDrawer.ts` to reduce `ResponsiveDashboardShell.tsx` to under 180 lines.
